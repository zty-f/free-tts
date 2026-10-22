import { estimateTextCharacters, estimateMinutes } from '/metrics.js';
const $ = id => document.getElementById(id);
let configured = false;
let busy = false;
let voices = [];
let audioUrl = '';
let voicesSequence = 0;
let draft = {};
try { draft = JSON.parse(localStorage.getItem('voice-notes-draft') || '{}') || {}; } catch {}
if (typeof draft.text === 'string') $('text').value = draft.text;
if (Number.isFinite(draft.rate) && draft.rate >= -50 && draft.rate <= 100) $('rate').value = draft.rate;
if (Number.isFinite(draft.pitch) && draft.pitch >= -20 && draft.pitch <= 20) $('pitch').value = draft.pitch;

const displayNames = new Intl.DisplayNames(['zh-CN'], { type: 'language' });
function localeLabel(locale) { try { return displayNames.of(locale) || locale; } catch { return locale; } }
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
  if (error) $('status').focus();
}
function configFeedback(message, error = false) {
  $('config-feedback').textContent = message;
  $('config-feedback').classList.toggle('error', error);
}
function saveDraft() {
  try { localStorage.setItem('voice-notes-draft', JSON.stringify({ text: $('text').value, rate: Number($('rate').value), pitch: Number($('pitch').value), language: $('language').value, voice: $('voice').value })); } catch {}
}
function update() {
  const count = [...$('text').value].length;
  const minutes = estimateMinutes($('text').value, Number($('rate').value));
  $('count').textContent = `${count.toLocaleString()} / 3,000 字符`;
  $('count').classList.toggle('over', count > 3000);
  $('generate').disabled = !configured || busy || !$('text').value.trim() || count > 3000 || minutes > 8 || !$('voice').value;
  $('usage-estimate').textContent = `正文预计 ${estimateTextCharacters($('text').value).toLocaleString()} 计费字符；不含 SSML 标记，非月度剩余额度。${minutes > 8 ? '按当前语速粗估超过 8 分钟，请缩短后分段生成。' : ''}`;
  $('usage-estimate').classList.toggle('error', minutes > 8);
  $('clear-config').disabled = busy;
  $('clear-cache').disabled = busy;
  $('rate-value').textContent = `${(1 + Number($('rate').value) / 100).toFixed(2).replace(/0$/, '')}×`;
  const pitch = Number($('pitch').value);
  $('pitch-value').textContent = pitch ? `${pitch > 0 ? '+' : ''}${pitch}%` : '默认';
  $('rate').setAttribute('aria-valuetext', $('rate-value').textContent);
  $('pitch').setAttribute('aria-valuetext', $('pitch-value').textContent);
  $('ready-title').textContent = busy ? '正在把文字变成声音…' : configured ? '准备好，让文字发声' : '连接 Azure，即可开始创作';
}
async function api(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `请求失败（HTTP ${response.status}）`);
  }
  return response;
}
function option(value, label) { const item = document.createElement('option'); item.value = value; item.textContent = label; return item; }
function renderVoiceOptions(preferred) {
  const selected = preferred || $('voice').value;
  $('voice').replaceChildren(...voices.filter(v => v.locale === $('language').value).map(v => option(v.id, `${v.name} · ${v.gender}声`)));
  if ([...$('voice').options].some(v => v.value === selected)) $('voice').value = selected;
  update();
}
function renderVoices(list, source) {
  const language = $('language').value || draft.language || 'zh-CN';
  const voice = $('voice').value || draft.voice;
  voices = list;
  const locales = [...new Set(voices.map(v => v.locale))].sort((a, b) => {
    const rank = l => l === 'zh-CN' ? 0 : l.startsWith('zh') ? 1 : l === 'en-US' ? 2 : l.startsWith('en') ? 3 : 4;
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  $('language').replaceChildren(...locales.map(l => option(l, `${localeLabel(l)} (${l})`)));
  if (locales.includes(language)) $('language').value = language;
  renderVoiceOptions(voice);
  $('voice-hint').textContent = source === 'azure' ? '已获取当前区域的普通 Neural 音色' : '常用音色预设；保存配置后获取区域音色';
}
async function loadVoices() {
  const sequence = ++voicesSequence;
  $('refresh-voices').disabled = true;
  $('voice-hint').textContent = configured ? '正在连接 Azure，获取音色…' : '正在载入音色…';
  try {
    const data = await (await api('/api/voices')).json();
    if (sequence !== voicesSequence) return;
    renderVoices(data.voices, data.source);
    if (data.source === 'azure') {
      $('connection-state').textContent = '连接正常';
      $('connection-state').classList.add('connected');
      configFeedback('连接成功。选择音色并输入文字，就可以生成语音了。');
      if (!busy) status('已连接 Azure。生成音频后，可在下方试听和下载。');
    }
  } catch (error) {
    if (sequence !== voicesSequence) return;
    $('connection-state').textContent = '连接待检查';
    $('connection-state').classList.remove('connected');
    $('voice-hint').textContent = voices.length ? '未能刷新，保留现有音色' : '未能获取音色，请检查连接设置';
    configFeedback(error.message, true);
    $('connection').hidden = false;
    $('settings-toggle').setAttribute('aria-expanded', 'true');
  } finally { if (sequence === voicesSequence) { $('refresh-voices').disabled = false; update(); } }
}

$('settings-toggle').addEventListener('click', () => {
  $('connection').hidden = !$('connection').hidden;
  $('settings-toggle').setAttribute('aria-expanded', String(!$('connection').hidden));
});
$('config-form').addEventListener('submit', async event => {
  event.preventDefault();
  const key = $('key').value.trim();
  if (!configured && !key) { configFeedback('请先粘贴 Azure 的 KEY 1 或 KEY 2。', true); $('key').focus(); return; }
  $('save-config').disabled = true;
  $('save-config').textContent = '正在连接…';
  configFeedback('正在保存本机配置…');
  try {
    const data = await (await api('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, region: $('region').value }) })).json();
    configured = data.configured;
    $('onboarding').hidden = configured;
    $('clear-config').hidden = !configured;
    $('region').value = data.region;
    $('key').value = '';
    $('key').placeholder = '已保存；留空沿用，输入新密钥可替换';
    $('connection-state').textContent = '已保存配置';
    $('key-hint').textContent = '密钥已保存在本机，不会回传到页面。';
    await loadVoices();
  } catch (error) { configFeedback(error.message, true); }
  finally { $('save-config').disabled = false; $('save-config').textContent = '保存并连接'; update(); }
});
$('refresh-voices').addEventListener('click', loadVoices);
$('clear-config').addEventListener('click', async () => {
  if (!confirm('清除本机保存的 Azure 密钥和区域？已缓存音频会保留，Azure 资源不会被删除。')) return;
  try {
    await api('/api/config/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) });
    configured = false; voicesSequence++;
    $('region').value = ''; $('key').value = ''; $('key').placeholder = '粘贴完整密钥';
    $('connection-state').textContent = '尚未配置'; $('connection-state').classList.remove('connected');
    $('key-hint').textContent = '保存在本机，刷新和重启后仍可使用。';
    $('onboarding').hidden = false; $('clear-config').hidden = true;
    configFeedback('本机密钥已清除。Azure 资源及已下载文件不受影响。');
    update(); await loadVoices(); status('先在连接设置中保存密钥和区域，再输入文字。');
  } catch (error) { configFeedback(error.message, true); }
});
$('language').addEventListener('change', () => { renderVoiceOptions(); saveDraft(); });
$('voice').addEventListener('change', () => { update(); saveDraft(); });
for (const id of ['text', 'rate', 'pitch']) $(id).addEventListener('input', () => { update(); saveDraft(); });
$('reset').addEventListener('click', () => { $('rate').value = 0; $('pitch').value = 0; update(); saveDraft(); });
$('example').addEventListener('click', () => {
  $('text').value = '有时候，灵感只是一个转瞬即逝的念头。\n\n把它写下来，让它拥有声音。无论是一段故事，还是一句问候，都值得被认真听见。';
  update(); saveDraft(); $('text').focus();
});
$('clear').addEventListener('click', () => { $('text').value = ''; update(); saveDraft(); $('text').focus(); });
$('generate').addEventListener('click', async () => {
  if ($('generate').disabled) return;
  const body = { text: $('text').value, voice: $('voice').value, rate: Number($('rate').value), pitch: Number($('pitch').value) };
  const voiceName = $('voice').selectedOptions[0].textContent;
  busy = true;
  $('generate').classList.add('loading');
  $('generate').querySelector('span').textContent = '正在生成…';
  $('save-config').disabled = true;
  update(); status('正在生成，请稍等。较长文字可能需要几十秒。');
  try {
    const response = await api('/api/synthesize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const blob = await response.blob();
    $('audio').pause();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(blob);
    $('audio').src = audioUrl;
    $('download').href = audioUrl;
    const now = new Date();
    $('download').download = `free-tts-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime()}.mp3`;
    $('result-info').textContent = `${voiceName} · ${[...body.text].length} 字符 · ${(blob.size / 1024).toFixed(1)} KB`;
    $('audio-feedback').textContent = '';
    $('result').hidden = false;
    status(response.headers.get('X-Free-TTS-Cache') === 'hit' ? '已复用本机音频，本次未请求 Azure 合成。' : '语音已生成并缓存。可试听、下载，刷新后也能从“最近生成”找回。');
    await loadHistory();
    $('result').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
  } catch (error) { status(error.message, true); }
  finally { busy = false; $('save-config').disabled = false; $('generate').classList.remove('loading'); $('generate').querySelector('span').textContent = '生成语音'; update(); }
});
$('audio').addEventListener('error', () => { if (audioUrl) $('audio-feedback').textContent = '浏览器无法播放这段音频。可以下载文件后尝试用本机播放器打开。'; });
window.addEventListener('beforeunload', () => { if (audioUrl) URL.revokeObjectURL(audioUrl); });

async function loadHistory() {
  const data = await (await api('/api/history')).json();
  $('history').hidden = !data.items.length;
  $('history-list').replaceChildren(...data.items.map(item => {
    const row = document.createElement('div'); row.className = 'history-row';
    const detail = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = item.voice;
    const note = document.createElement('small'); note.textContent = `${new Date(item.createdAt).toLocaleString()} · ${item.characters} 字符 · ${(item.bytes / 1024).toFixed(1)} KB`;
    detail.append(title, note);
    const button = document.createElement('button'); button.className = 'button secondary'; button.textContent = '试听 / 下载';
    button.addEventListener('click', () => {
      $('audio').pause();
      const url = `/api/audio/${item.id}.mp3`;
      $('audio').src = url; $('download').href = url; $('download').download = `free-tts-${item.id.slice(0, 8)}.mp3`;
      $('result-info').textContent = `${item.voice} · ${item.characters} 字符 · 本机缓存`;
      $('audio-feedback').textContent = ''; $('result').hidden = false;
      $('result').scrollIntoView({ block: 'nearest' });
      status('正在使用本机已生成的音频，不请求 Azure 合成。');
    });
    row.append(detail, button); return row;
  }));
}
$('clear-cache').addEventListener('click', async () => {
  if (!confirm('清理工具保留的全部本机音频？浏览器中已另存的 MP3 不会删除，重新生成会再次消耗额度。')) return;
  try {
    await api('/api/cache/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) });
    $('audio').pause(); $('audio').removeAttribute('src'); $('audio').load();
    if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = ''; }
    $('result').hidden = true; await loadHistory(); status('本机缓存已清理。已下载到其他位置的文件仍然保留。');
  } catch (error) { status(error.message, true); }
});

async function init() {
  update();
  // Presets make the form usable before credentials are configured.
  renderVoices([
    { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', gender: '女', locale: 'zh-CN' },
    { id: 'zh-CN-YunxiNeural', name: '云希', gender: '男', locale: 'zh-CN' },
    { id: 'en-US-JennyNeural', name: 'Jenny', gender: '女', locale: 'en-US' },
  ], 'preset');
  try {
    const data = await (await api('/api/config')).json();
    configured = data.configured;
    $('onboarding').hidden = configured;
    $('clear-config').hidden = !configured;
    $('region').value = data.region;
    if (configured) {
      $('key').placeholder = '已保存；留空沿用，输入新密钥可替换';
      $('key-hint').textContent = '密钥已保存在本机，不会回传到页面。';
      $('connection-state').textContent = '已保存配置';
      $('connection').hidden = true;
      $('settings-toggle').setAttribute('aria-expanded', 'false');
    }
    update(); await Promise.all([loadVoices(), loadHistory()]);
  } catch { status('无法连接本机服务，请确认启动窗口仍在运行，然后刷新页面。', true); }
}
init();
