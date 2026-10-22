import { estimateMinutes } from '../../public/metrics.js';

class SpeechError extends Error {}

export const validVoice = voice => typeof voice === 'string' && /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z0-9]+Neural$/.test(voice) && !/Dragon|HD/i.test(voice);
const escapeXml = text => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
export function buildSsml({ text, voice, rate = 0, pitch = 0 }) {
  if (typeof text !== 'string' || !text.trim()) throw new SpeechError('请先输入要合成的文字。');
  if ([...text].length > 3000) throw new SpeechError('每次最多 3,000 个字符，请分段生成。');
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(text)) throw new SpeechError('文字中含有无效控制字符，请清理后重试。');
  if (!validVoice(voice)) throw new SpeechError('请选择普通 Neural 音色。');
  if (!Number.isFinite(rate) || rate < -50 || rate > 100 || !Number.isFinite(pitch) || pitch < -20 || pitch > 20) throw new SpeechError('语速或音调超出允许范围。');
  if (estimateMinutes(text, rate) > 8) throw new SpeechError('按当前语速粗估超过 8 分钟，请缩短后分段生成。');
  const percent = value => `${value >= 0 ? '+' : ''}${value}%`;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.split('-').slice(0, 2).join('-')}"><voice name="${voice}"><prosody rate="${percent(rate)}" pitch="${percent(pitch)}">${escapeXml(text)}</prosody></voice></speak>`;
}
export function validateCredentials(region, key) {
  region = String(region || '').trim().toLowerCase();
  key = String(key || '').trim();
  if (!/^[a-z][a-z0-9]{1,39}$/.test(region)) throw new SpeechError('请填写区域代码，例如 eastasia，不是中文名称或网址。');
  if (!/^[A-Za-z0-9_+/=-]{16,256}$/.test(key)) throw new SpeechError('请粘贴完整的 Azure KEY 1 或 KEY 2，不含空格或换行。');
  return { region, key };
}
export function filterVoices(data) {
  if (!Array.isArray(data)) throw new SpeechError('Azure 音色列表格式异常，请稍后重连。');
  return data.filter(v => validVoice(v?.ShortName) && v.Status === 'GA' && v.VoiceType === 'Neural' && /^[a-z]{2,3}-[A-Z]{2}$/.test(v.Locale)).map(v => ({
    id: v.ShortName, name: v.LocalName || v.DisplayName || v.ShortName, locale: v.Locale,
    gender: v.Gender === 'Female' ? '女' : v.Gender === 'Male' ? '男' : '中性',
  }));
}
const httpErrors = {
  400: 'Azure 未接受合成参数，请尝试更短的文字或其他音色。',
  401: 'Azure 验证失败，请检查密钥与区域是否属于同一 Speech 资源。',
  403: 'Azure 拒绝访问，请检查资源状态、网络访问设置与额度。',
  404: '未找到 Azure 接口，请核对区域代码；目前支持国际版 Azure。',
  429: 'Azure 请求受限，可能是调用过快、音色容量或 F0 配额限制。请稍后再试，并查看 Azure 控制台。',
};

// Private fields live only in this document's JS memory. No storage, URLs,
// telemetry, intermediary server, third-party scripts or automatic retries.
export class AzureSession {
  #credentials = null;
  #controller = null;
  #epoch = 0;
  #fetch;
  #timeout;
  constructor({ fetchImpl = (...args) => globalThis.fetch(...args), timeout = 90_000 } = {}) { this.#fetch = fetchImpl; this.#timeout = timeout; }
  get connected() { return this.#credentials !== null; }
  disconnect() {
    this.#epoch++;
    this.#credentials = null;
    this.#controller?.abort();
    this.#controller = null;
  }
  async #request(config, route, ssml) {
    if (this.#controller) throw new SpeechError('已有请求在进行，请等待完成或先取消。');
    const controller = new AbortController();
    this.#controller = controller;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.#timeout);
    try {
      const headers = { 'Ocp-Apim-Subscription-Key': config.key };
      if (ssml !== undefined) Object.assign(headers, { 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3' });
      const response = await this.#fetch(`https://${config.region}.tts.speech.microsoft.com/cognitiveservices/${route}`, {
        method: ssml === undefined ? 'GET' : 'POST', headers, body: ssml,
        credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store', signal: controller.signal,
      });
      if (!response.ok) throw new SpeechError(httpErrors[response.status] || `Azure 服务返回错误（HTTP ${response.status}），请稍后重试。`);
      if (ssml === undefined) {
        const voices = filterVoices(await response.json());
        if (!voices.length) throw new SpeechError('当前区域没有可用的普通 GA Neural 音色，请核对资源与区域。');
        return voices;
      }
      const audio = await response.blob();
      if (!audio.size || audio.size > 25 * 1024 * 1024) throw new SpeechError('Azure 返回的音频为空或过大，请缩短文字后重试。');
      if (/json|text|xml/i.test(audio.type)) throw new SpeechError('Azure 返回的不是音频，请核对资源或稍后重试。');
      return new Blob([audio], { type: 'audio/mpeg' });
    } catch (error) {
      if (controller.signal.aborted) throw new SpeechError(timedOut ? '连接 Azure 超时，请检查浏览器网络和区域后重试。' : '请求已取消。取消前已处理的文字仍可能计入 Azure 用量。');
      // Only locally generated error messages are surfaced. Never reflect
      // upstream bodies or arbitrary fetch errors that may contain credentials.
      if (error instanceof TypeError) throw new SpeechError('无法连接 Azure。请检查浏览器网络、区域及跨域或网络访问限制；网页不能读取本机终端代理变量。');
      if (error instanceof SyntaxError) throw new SpeechError('Azure 返回的数据格式异常，请稍后重连。');
      if (error instanceof SpeechError) throw error;
      throw new SpeechError('Azure 请求失败，请检查网络和连接设置。');
    } finally {
      clearTimeout(timer);
      if (this.#controller === controller) this.#controller = null;
    }
  }
  async connect(region, key) {
    if (this.#controller) throw new SpeechError('已有请求在进行，请先取消。');
    this.disconnect();
    const config = validateCredentials(region, key);
    const epoch = this.#epoch;
    const voices = await this.#request(config, 'voices/list');
    if (epoch !== this.#epoch) throw new SpeechError('连接已取消，请重新填写密钥。');
    this.#credentials = config;
    return voices;
  }
  async synthesize(parameters) {
    if (!this.#credentials) throw new SpeechError('请先连接你的 Azure 资源。');
    const epoch = this.#epoch;
    const audio = await this.#request(this.#credentials, 'v1', buildSsml(parameters));
    if (epoch !== this.#epoch) throw new SpeechError('请求已取消，请重新连接。');
    return audio;
  }
  async refreshVoices() {
    if (!this.#credentials) throw new SpeechError('请先连接你的 Azure 资源。');
    const epoch = this.#epoch;
    const voices = await this.#request(this.#credentials, 'voices/list');
    if (epoch !== this.#epoch) throw new SpeechError('请求已取消，请重新连接。');
    return voices;
  }
}
