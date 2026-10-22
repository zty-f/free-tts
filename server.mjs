import http from 'node:http';
import { readFile, writeFile, mkdir, rename, chmod, readdir, rm } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { guidePage } from './lib/docs.mjs';
import { estimateTextCharacters, estimateMinutes } from './public/metrics.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG = path.join(ROOT, '.local', 'config.json');
const MAX_TEXT = 3000;
const FALLBACK_VOICES = [
  ['zh-CN-XiaoxiaoNeural', '晓晓', '女', 'zh-CN'],
  ['zh-CN-YunxiNeural', '云希', '男', 'zh-CN'],
  ['zh-CN-XiaoyiNeural', '晓伊', '女', 'zh-CN'],
  ['zh-CN-YunjianNeural', '云健', '男', 'zh-CN'],
  ['en-US-JennyNeural', 'Jenny', '女', 'en-US'],
  ['en-US-GuyNeural', 'Guy', '男', 'en-US'],
  ['en-GB-SoniaNeural', 'Sonia', '女', 'en-GB'],
  ['en-GB-RyanNeural', 'Ryan', '男', 'en-GB'],
].map(([id, name, gender, locale]) => ({ id, name, gender, locale }));

class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function validRegion(region) { return typeof region === 'string' && /^[a-z][a-z0-9]{1,39}$/.test(region); }
function validVoice(voice) {
  return typeof voice === 'string' && /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z0-9]+Neural$/.test(voice) && !/Dragon|HD/i.test(voice);
}
export function escapeXml(text) {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}
export function buildSsml({ text, voice, rate = 0, pitch = 0 }) {
  if (typeof text !== 'string' || !text.trim()) throw new AppError(400, '请先输入要合成的文字。');
  if ([...text].length > MAX_TEXT) throw new AppError(400, `本工具每次最多合成 ${MAX_TEXT} 个字符，请分段生成。`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(text)) throw new AppError(400, '文字中含有无效控制字符，请清理后重试。');
  if (!validVoice(voice)) throw new AppError(400, '请选择普通 Neural 音色。');
  if (!Number.isFinite(rate) || rate < -50 || rate > 100 || !Number.isFinite(pitch) || pitch < -20 || pitch > 20) throw new AppError(400, '语速或音调超出允许范围。');
  if (estimateMinutes(text, rate) > 8) throw new AppError(400, '按当前语速粗估音频超过 8 分钟。为避开 Azure 单次 10 分钟上限，请缩短文字或提高语速后分段生成。');
  const locale = voice.split('-').slice(0, 2).join('-');
  const percent = n => `${n >= 0 ? '+' : ''}${n}%`;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${voice}"><prosody rate="${percent(rate)}" pitch="${percent(pitch)}">${escapeXml(text)}</prosody></voice></speak>`;
}

// curl inherits the shell's HTTPS_PROXY / ALL_PROXY settings. Secrets go through
// stdin, never process arguments, logs or frontend responses.
function curlQuote(value) {
  return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
}
export function azureRequest(config, route, ssml) {
  const url = `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/${route}`;
  const lines = [
    `url = ${curlQuote(url)}`,
    `header = ${curlQuote(`Ocp-Apim-Subscription-Key: ${config.key}`)}`,
    `header = ${curlQuote('User-Agent: free-tts')}`,
  ];
  if (ssml !== undefined) lines.push(
    `header = ${curlQuote('Content-Type: application/ssml+xml')}`,
    `header = ${curlQuote('X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3')}`,
    `data-binary = ${curlQuote(ssml)}`,
  );
  return new Promise((resolve, reject) => {
    const child = spawn('curl', ['--disable', '--config', '-', '--silent', '--show-error', '--connect-timeout', '10', '--max-time', '90', '--write-out', '\n%{http_code}'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const chunks = []; let size = 0; let overflow = false;
    child.stdout.on('data', chunk => { size += chunk.length; if (size > 25 * 1024 * 1024) { overflow = true; child.kill(); } else chunks.push(chunk); });
    child.stderr.on('data', () => {});
    child.stdin.on('error', () => {});
    child.on('error', () => reject(new AppError(502, '无法启动 curl，请检查系统是否已安装 curl。')));
    child.on('close', code => {
      if (overflow) return reject(new AppError(502, '音频响应过大，请缩短文字。'));
      if (code === 28) return reject(new AppError(504, '连接 Azure 超时。请检查网络；若你使用代理，在已开启代理的终端重启本工具后重试。'));
      if (code !== 0) return reject(new AppError(502, '无法连接 Azure，请检查网络、代理和区域设置。'));
      const buffer = Buffer.concat(chunks); const split = buffer.lastIndexOf(10);
      resolve({ status: Number(buffer.subarray(split + 1).toString()), body: buffer.subarray(0, split) });
    });
    child.stdin.end(lines.join('\n') + '\n');
  });
}
function checkAzure(response) {
  if (response.status >= 200 && response.status < 300) return;
  const errors = {
    400: 'Azure 未接受合成参数，请尝试更短的文字或其他音色。',
    401: 'Azure 验证失败，请检查密钥和区域是否属于同一个语音资源。',
    403: 'Azure 拒绝访问，请检查资源状态、网络访问设置和免费额度。',
    404: '未找到 Azure 接口，请核对区域代码。',
    429: 'Azure 请求受限，可能是调用过快、音色容量不足或 F0 额度已用完。请稍后重试并查看 Azure 控制台。',
  };
  throw new AppError(502, errors[response.status] || `Azure 服务返回错误（HTTP ${response.status}），请稍后重试。`);
}
async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new AppError(415, '请使用 JSON 请求。');
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 100_000) throw new AppError(413, '请求内容过大。'); chunks.push(chunk); }
  try { const data = JSON.parse(Buffer.concat(chunks).toString()); if (!data || typeof data !== 'object' || Array.isArray(data)) throw 0; return data; }
  catch { throw new AppError(400, '请求格式不正确。'); }
}

export function createApp({ configPath = DEFAULT_CONFIG, requestAzure = azureRequest } = {}) {
  let busy = false;
  let voiceCache = null;
  const audioDir = path.join(path.dirname(configPath), 'audio');
  async function privateDirectory(dir) {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    if (process.platform !== 'win32') await chmod(dir, 0o700);
  }
  async function saveFile(file, data) {
    await privateDirectory(path.dirname(file));
    const temp = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temp, data, { mode: 0o600 });
      if (process.platform !== 'win32') await chmod(temp, 0o600);
      await rename(temp, file);
    } finally { await rm(temp, { force: true }); }
  }
  async function history() {
    let names;
    try { names = await readdir(audioDir); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const entries = await Promise.all(names.filter(n => /^[a-f0-9]{64}\.json$/.test(n)).map(async n => {
      try { const item = JSON.parse(await readFile(path.join(audioDir, n), 'utf8')); if (item.id !== n.slice(0, -5)) return null; return item; } catch { return null; }
    }));
    return entries.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const sendAudio = (res, bytes, id, cached) => {
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Disposition': 'attachment; filename="free-tts.mp3"', 'X-Free-TTS-Cache': cached ? 'hit' : 'miss', 'X-Free-TTS-Audio-Id': id });
    res.end(bytes);
  };
  async function loadConfig() {
    try {
      const data = JSON.parse(await readFile(configPath, 'utf8'));
      return { key: data.key || '', region: data.region || '' };
    } catch (error) { if (error.code !== 'ENOENT') throw new AppError(500, '本机配置无法读取，请检查 .local/config.json。'); return { key: '', region: '' }; }
  }
  const configured = c => !!c.key && validRegion(c.region);
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      const port = server.address()?.port;
      const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!allowedHosts.includes(req.headers.host)) throw new AppError(403, '仅允许从本机地址访问。');
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new AppError(403, '不允许跨站访问。');
      if (req.headers.origin && !allowedHosts.map(h => `http://${h}`).includes(req.headers.origin)) throw new AppError(403, '不允许跨站访问。');
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && pathname === '/api/health') return json(200, { app: 'free-tts', version: '0.1.0' });
      if (req.method === 'GET' && pathname === '/api/config') {
        const c = await loadConfig(); return json(200, { configured: configured(c), region: c.region, maxText: MAX_TEXT });
      }
      if (req.method === 'POST' && pathname === '/api/config') {
        if (busy) throw new AppError(409, '正在生成语音，请完成后再修改配置。');
        const body = await readJson(req); const old = await loadConfig();
        const region = typeof body.region === 'string' ? body.region.trim().toLowerCase() : '';
        const key = typeof body.key === 'string' && body.key.trim() ? body.key.trim() : old.key;
        if (!validRegion(region)) throw new AppError(400, '请填写区域代码，例如 eastasia；不要填写网址或中文名称。');
        if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,256}$/.test(key)) throw new AppError(400, '请粘贴 Azure 语音资源的完整 KEY 1 或 KEY 2。');
        await saveFile(configPath, JSON.stringify({ region, key }));
        voiceCache = null;
        return json(200, { configured: true, region });
      }
      if (req.method === 'POST' && pathname === '/api/config/clear') {
        if (busy) throw new AppError(409, '正在生成语音，请完成后再清除配置。');
        if ((await readJson(req)).confirm !== true) throw new AppError(400, '需要确认清除本机密钥。');
        await rm(configPath, { force: true }); voiceCache = null;
        return json(200, { configured: false, region: '' });
      }
      if (req.method === 'GET' && pathname === '/api/history') return json(200, { items: (await history()).slice(0, 20) });
      const audioMatch = pathname.match(/^\/api\/audio\/([a-f0-9]{64})\.mp3$/);
      if (req.method === 'GET' && audioMatch) {
        try { return sendAudio(res, await readFile(path.join(audioDir, `${audioMatch[1]}.mp3`)), audioMatch[1], true); }
        catch (error) { if (error.code === 'ENOENT') throw new AppError(404, '这段本机音频已清理，请重新生成。'); throw error; }
      }
      if (req.method === 'POST' && pathname === '/api/cache/clear') {
        if (busy) throw new AppError(409, '正在生成语音，请完成后再清理缓存。');
        if ((await readJson(req)).confirm !== true) throw new AppError(400, '需要确认清理本机音频。');
        await rm(audioDir, { recursive: true, force: true }); return json(200, { cleared: true });
      }
      if (req.method === 'GET' && pathname === '/api/voices') {
        const c = await loadConfig();
        if (!configured(c)) return json(200, { voices: FALLBACK_VOICES, source: 'preset' });
        if (voiceCache?.region === c.region) return json(200, { voices: voiceCache.voices, source: 'azure' });
        const response = await requestAzure(c, 'voices/list'); checkAzure(response);
        let data;
        try { data = JSON.parse(response.body.toString()); } catch { throw new AppError(502, 'Azure 音色列表格式异常，请重试。'); }
        if (!Array.isArray(data)) throw new AppError(502, 'Azure 音色列表格式异常，请重试。');
        const voices = data.filter(v => validVoice(v.ShortName) && v.Status === 'GA' && v.VoiceType === 'Neural').map(v => ({ id: v.ShortName, name: v.LocalName || v.DisplayName || v.ShortName, locale: v.Locale, gender: v.Gender === 'Female' ? '女' : v.Gender === 'Male' ? '男' : '中性' }));
        if (!voices.length) throw new AppError(502, '当前区域未返回可用的普通 Neural 音色，请核对资源。');
        voiceCache = { region: c.region, voices };
        return json(200, { voices, source: 'azure' });
      }
      if (req.method === 'POST' && pathname === '/api/synthesize') {
        const body = await readJson(req); const ssml = buildSsml(body);
        const c = await loadConfig(); if (!configured(c)) throw new AppError(400, '请先在连接设置中保存 Azure 密钥和区域。');
        const id = createHash('sha256').update(JSON.stringify([c.key, c.region, ssml])).digest('hex');
        try { return sendAudio(res, await readFile(path.join(audioDir, `${id}.mp3`)), id, true); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (busy) throw new AppError(429, '已有一段语音正在生成，请等待完成。');
        busy = true;
        try {
          const response = await requestAzure(c, 'v1', ssml); checkAzure(response);
          if (!response.body.length) throw new AppError(502, 'Azure 返回了空音频，请重试。');
          const metadata = { id, voice: body.voice, characters: [...body.text].length, estimatedTextCharacters: estimateTextCharacters(body.text), rate: body.rate || 0, pitch: body.pitch || 0, createdAt: new Date().toISOString(), bytes: response.body.length };
          await saveFile(path.join(audioDir, `${id}.mp3`), response.body);
          await saveFile(path.join(audioDir, `${id}.json`), JSON.stringify(metadata));
          for (const old of (await history()).slice(20)) {
            await rm(path.join(audioDir, `${old.id}.json`), { force: true });
            await rm(path.join(audioDir, `${old.id}.mp3`), { force: true });
          }
          sendAudio(res, response.body, id, false);
        } finally { busy = false; }
        return;
      }
      if (req.method === 'GET' && (pathname === '/guide' || pathname.startsWith('/guide/'))) {
        const page = await guidePage(ROOT, pathname.slice('/guide/'.length) || 'index');
        if (!page) throw new AppError(404, '未找到这篇教程。');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(page);
      }
      if (req.method === 'GET' && pathname === '/guide-assets/workbench.jpg') {
        const image = await readFile(path.join(ROOT, 'docs/images/workbench.jpg'));
        res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(image);
      }
      const assets = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/metrics.js': ['metrics.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/docs.css': ['docs.css', 'text/css; charset=utf-8'] };
      if (req.method === 'GET' && assets[pathname]) {
        const [file, mime] = assets[pathname]; const content = await readFile(path.join(ROOT, 'public', file));
        res.writeHead(200, { 'Content-Type': mime }); return res.end(content);
      }
      json(404, { error: '未找到该页面或接口。' });
    } catch (error) {
      if (!res.headersSent) json(error.status || 500, { error: error instanceof AppError ? error.message : '本机服务处理失败，请检查文件权限或重启服务。' });
      else res.end();
    }
  });
  server.requestTimeout = 100_000;
  return server;
}

export function startServer({ openBrowser = false } = {}) {
  const port = Number(process.env.PORT || 4318);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 必须是有效端口。');
  const app = createApp();
  const url = `http://127.0.0.1:${port}`;
  const show = () => execFile(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd.exe' : 'xdg-open', process.platform === 'win32' ? ['/d', '/s', '/c', `start "" "${url}"`] : [url], () => {});
  app.on('error', async error => {
    if (error.code === 'EADDRINUSE') {
      try {
        const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1500) });
        if ((await response.json()).app === 'free-tts') { console.log(`free-tts 已在运行：${url}`); if (openBrowser) show(); return; }
      } catch {}
      console.error(`端口 ${port} 已被其他程序占用，请设置 PORT 更换端口。详见 docs/local-setup.md。`);
    } else console.error('服务无法启动，请检查运行环境。');
    process.exitCode = 1;
  });
  app.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`free-tts 已启动：${url}\n按 Ctrl+C 停止。密钥仅保存在本机 .local/config.json。`);
    if (openBrowser) show();
  });
  return app;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startServer({ openBrowser: process.argv.includes('--open') });
