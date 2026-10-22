import { AzureSession } from './azure.js';
import { estimateTextCharacters, estimateMinutes } from './metrics.js';

const $ = id => document.getElementById(id);
const session = new AzureSession();
let busy = false;
let voices = [];
let audioUrl = '';
let operation = 0;
const displayNames = new Intl.DisplayNames(['zh-CN'], { type: 'language' });
const localeName = locale => { try { return displayNames.of(locale); } catch { return locale; } };
function feedback(id, message, error = false) {
  $(id).textContent = message;
  $(id).classList.toggle('error', error);
}
function update() {
  const text = $('text').value;
  const count = [...text].length;
  const rate = Number($('rate').value);
  const minutes = estimateMinutes(text, rate);
  $('count').textContent = `${count.toLocaleString()} / 3,000 字符`;
  $('count').classList.toggle('over', count > 3000);
  $('usage-estimate').textContent = `正文预计 ${estimateTextCharacters(text).toLocaleString()} 计费字符；不含 SSML 标记，非月度剩余额度。${minutes > 8 ? '粗估超过 8 分钟，请缩短后分段生成。' : ''}`;
  $('usage-estimate').classList.toggle('error', minutes > 8);
  $('rate-value').textContent = `${(1 + rate / 100).toFixed(2).replace(/0$/, '')}×`;
  const pitch = Number($('pitch').value);
  $('pitch-value').textContent = pitch ? `${pitch > 0 ? '+' : ''}${pitch}%` : '默认';
  for (const field of ['rate', 'pitch']) $(field).setAttribute('aria-valuetext', $(`${field}-value`).textContent);
  $('generate').disabled = busy || !session.connected || !text.trim() || count > 3000 || minutes > 8 || !$('voice').value;
  for (const id of ['region', 'key', 'save-config', 'refresh-voices', 'language', 'voice', 'rate', 'pitch', 'reset']) $(id).disabled = busy || (['refresh-voices', 'language', 'voice'].includes(id) && !session.connected);
  $('generate').classList.toggle('loading', busy);
  $('generate').querySelector('span').textContent = busy ? '请稍候…' : '生成语音';
  $('cancel').hidden = !busy;
  $('clear-config').hidden = !session.connected && !busy;
  $('connection-state').textContent = busy ? '请求进行中' : session.connected ? '已连接 · 仅本页' : '尚未连接';
  $('connection-state').classList.toggle('connected', session.connected);
  $('ready-title').textContent = busy ? '正在连接你的 Azure…' : session.connected ? '准备好，让文字发声' : '连接 Azure，即可开始创作';
}
function option(value, label) { const node = document.createElement('option'); node.value = value; node.textContent = label; return node; }
function voiceOptions() {
  const previous = $('voice').value;
  $('voice').replaceChildren(...voices.filter(v => v.locale === $('language').value).map(v => option(v.id, `${v.name} · ${v.gender}声`)));
  if ([...$('voice').options].some(v => v.value === previous)) $('voice').value = previous;
  update();
}
function showVoices(list) {
  const selected = $('language').value || 'zh-CN';
  voices = list;
  const rank = locale => locale === 'zh-CN' ? 0 : locale.startsWith('zh') ? 1 : locale === 'en-US' ? 2 : 3;
  const locales = [...new Set(list.map(v => v.locale))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  $('language').replaceChildren(...locales.map(l => option(l, `${localeName(l)} (${l})`)));
  if (locales.includes(selected)) $('language').value = selected;
  voiceOptions();
  $('voice-hint').textContent = '已获取当前区域的普通 GA Neural 音色';
}
function discardAudio() {
  $('audio').pause();
  $('audio').removeAttribute('src');
  $('audio').load();
  $('download').removeAttribute('href');
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = '';
  $('result').hidden = true;
}
function disconnect() {
  operation++;
  session.disconnect();
  busy = false;
  $('key').value = '';
  $('region').value = '';
  voices = [];
  $('voice').replaceChildren();
  $('language').replaceChildren();
  $('voice-hint').textContent = '连接后载入当前区域音色';
  $('connection').hidden = false;
  $('settings-toggle').setAttribute('aria-expanded', 'true');
  update();
}
$('config-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const region = $('region').value;
  const key = $('key').value;
  $('key').value = '';
  discardAudio();
  const current = ++operation;
  busy = true;
  update();
  feedback('config-feedback', '正在验证密钥并获取区域音色…');
  try {
    const list = await session.connect(region, key);
    if (current !== operation) return;
    showVoices(list);
    $('onboarding').hidden = true;
    feedback('config-feedback', '已连接。密钥仅保存在本页内存；刷新后需重新填写。');
    feedback('status', '已连接 Azure。输入文字并生成，音频会显示在下方。');
  } catch (error) {
    if (current !== operation) return;
    feedback('config-feedback', error.message, true);
    feedback('status', '连接未成功，请核对密钥、区域和网络。', true);
    voices = [];
    $('voice').replaceChildren();
    $('language').replaceChildren();
  } finally { if (current === operation) { busy = false; update(); } }
});
$('refresh-voices').addEventListener('click', async () => {
  if (busy || !session.connected) return;
  const current = ++operation;
  busy = true;
  update();
  feedback('config-feedback', '正在刷新当前区域的音色…');
  try {
    const list = await session.refreshVoices();
    if (current === operation) { showVoices(list); feedback('config-feedback', '音色已更新，密钥仍仅在本页内存中。'); }
  } catch (error) { if (current === operation) feedback('config-feedback', error.message, true); }
  finally { if (current === operation) { busy = false; update(); } }
});
for (const id of ['region', 'key']) $(id).addEventListener('input', () => {
  if (!session.connected) return;
  session.disconnect();
  voices = [];
  $('voice').replaceChildren();
  $('language').replaceChildren();
  feedback('config-feedback', '连接信息已修改，请填入完整密钥并重新连接。');
  update();
});
$('clear-config').addEventListener('click', () => {
  disconnect();
  feedback('config-feedback', '已断开并清除本页密钥。已生成音频仍可下载。');
  feedback('status', '连接已清除。继续生成需重新填写密钥和区域。');
});
$('cancel').addEventListener('click', () => {
  disconnect();
  feedback('status', '请求已取消并清除连接。取消前已处理的文字仍可能计入 Azure 用量。');
  feedback('config-feedback', '已断开；再次使用请重新连接。');
});
$('settings-toggle').addEventListener('click', () => {
  $('connection').hidden = !$('connection').hidden;
  $('settings-toggle').setAttribute('aria-expanded', String(!$('connection').hidden));
});
$('language').addEventListener('change', voiceOptions);
for (const id of ['text', 'voice', 'rate', 'pitch']) $(id).addEventListener('input', update);
$('example').addEventListener('click', () => { $('text').value = '你好，这是 free-tts 在线语音合成测试。'; update(); $('text').focus(); });
$('clear').addEventListener('click', () => { $('text').value = ''; update(); $('text').focus(); });
$('reset').addEventListener('click', () => { $('rate').value = 0; $('pitch').value = 0; update(); });
$('generate').addEventListener('click', async () => {
  if ($('generate').disabled) return;
  const parameters = { text: $('text').value, voice: $('voice').value, rate: Number($('rate').value), pitch: Number($('pitch').value) };
  const current = ++operation;
  busy = true;
  update();
  feedback('status', '正在通过浏览器直连 Azure 合成，请稍候…');
  try {
    const audio = await session.synthesize(parameters);
    if (current !== operation) return;
    discardAudio();
    audioUrl = URL.createObjectURL(audio);
    $('audio').src = audioUrl;
    $('download').href = audioUrl;
    $('download').download = `free-tts-${new Date().toISOString().replace(/[:.]/g, '-')}.mp3`;
    $('result-info').textContent = `${parameters.voice} · ${(audio.size / 1024).toFixed(1)} KB`;
    $('result').hidden = false;
    feedback('audio-feedback', '点击播放试听，满意后下载。刷新页面将清除此音频。');
    feedback('status', '合成完成。每次点击生成都会请求 Azure；试听和下载已有音频不会再次合成。');
    $('result').setAttribute('tabindex', '-1');
    $('result').focus();
  } catch (error) { if (current === operation) feedback('status', error.message, true); }
  finally { if (current === operation) { busy = false; update(); } }
});
$('audio').addEventListener('error', () => { if (audioUrl) feedback('audio-feedback', '浏览器无法播放此音频，请下载 MP3 后使用播放器试听。', true); });
$('text').addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !$('generate').disabled) { event.preventDefault(); $('generate').click(); } });
// Also clear bfcache restores; no secret or audio survives leaving this page.
window.addEventListener('pagehide', () => { disconnect(); discardAudio(); $('text').value = ''; });
window.addEventListener('pageshow', event => { if (event.persisted) { disconnect(); discardAudio(); feedback('config-feedback', '页面已恢复，请重新填写密钥和区域。'); } });
$('key').value = '';
update();
