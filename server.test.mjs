import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp, buildSsml } from './server.mjs';

test('SSML escapes user markup and validates text, voice and controls', () => {
  const xml = buildSsml({ text: '你好 <voice>& "test"', voice: 'zh-CN-XiaoxiaoNeural', rate: -15, pitch: 2 });
  assert.match(xml, /&lt;voice&gt;&amp; &quot;test&quot;/);
  assert.match(xml, /rate="-15%" pitch="\+2%"/);
  assert.throws(() => buildSsml({ text: ' ', voice: 'zh-CN-XiaoxiaoNeural' }));
  assert.throws(() => buildSsml({ text: '字'.repeat(3001), voice: 'zh-CN-XiaoxiaoNeural' }));
  assert.throws(() => buildSsml({ text: '你好', voice: 'en-US-Ava:DragonHDLatestNeural' }));
  assert.throws(() => buildSsml({ text: '你好', voice: 'zh-CN-XiaoxiaoNeural', rate: 200 }));
  assert.throws(() => buildSsml({ text: '\u0001', voice: 'zh-CN-XiaoxiaoNeural' }));
  assert.throws(() => buildSsml({ text: '你'.repeat(1200), voice: 'zh-CN-XiaoxiaoNeural', rate: -50 }), /8 分钟/);
});

test('local app connects, persists private credentials, returns audio and blocks cross-site access', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'free-tts-test-'));
  const configPath = path.join(dir, '.local', 'config.json');
  const fakeKey = 'fake-key-for-test-123456789';
  const calls = [];
  let upstreamStatus = 200;
  let synthGate = null;
  const mp3 = Buffer.from([0x49, 0x44, 0x33, 1, 2, 3]);
  const requestAzure = async (config, route, ssml) => {
    calls.push({ config, route, ssml });
    if (upstreamStatus !== 200) return { status: upstreamStatus, body: Buffer.from(`secret upstream detail ${fakeKey}`) };
    if (route === 'voices/list') return { status: 200, body: Buffer.from(JSON.stringify([
      { ShortName: 'zh-CN-XiaoxiaoNeural', LocalName: '晓晓', Locale: 'zh-CN', Gender: 'Female', VoiceType: 'Neural', Status: 'GA' },
      { ShortName: 'en-US-Ava:DragonHDLatestNeural', VoiceType: 'Neural', Status: 'GA' },
      { ShortName: 'en-US-PreviewNeural', VoiceType: 'Neural', Status: 'Preview' },
    ])) };
    if (synthGate) await synthGate();
    return { status: 200, body: mp3 };
  };
  const server = createApp({ configPath, requestAzure });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (route, data, headers = {}) => fetch(url + route, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: url, ...headers }, body: JSON.stringify(data) });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); });

  await t.test('fresh config and presets work without Azure credentials', async () => {
    assert.equal((await (await fetch(url + '/api/config')).json()).configured, false);
    assert.equal((await (await fetch(url + '/api/voices')).json()).source, 'preset');
    const page = await fetch(url); assert.equal(page.status, 200); assert.match(await page.text(), /free-tts/);
    assert.equal((await post('/api/synthesize', { text: 'hello', voice: 'en-US-JennyNeural' })).status, 400);
    assert.equal(calls.length, 0);
  });
  await t.test('saves private config without returning the key', async () => {
    const response = await post('/api/config', { region: 'eastasia', key: fakeKey });
    assert.equal(response.status, 200); assert.equal((await response.text()).includes(fakeKey), false);
    if (process.platform !== 'win32') {
      assert.equal((await stat(configPath)).mode & 0o777, 0o600);
      assert.equal((await stat(path.dirname(configPath))).mode & 0o777, 0o700);
    }
    assert.equal(JSON.parse(await readFile(configPath)).key, fakeKey);
    assert.equal((await (await fetch(url + '/api/config')).text()).includes(fakeKey), false);
    assert.equal((await post('/api/config', { region: 'eastasia', key: '' })).status, 200);
  });
  await t.test('live voices are filtered and cached', async () => {
    const data = await (await fetch(url + '/api/voices')).json();
    assert.equal(data.source, 'azure'); assert.equal(data.voices.length, 1);
    assert.equal(data.voices[0].name, '晓晓');
    await fetch(url + '/api/voices');
    assert.equal(calls.filter(c => c.route === 'voices/list').length, 1);
  });
  await t.test('returns actual upstream bytes and does not expose config files', async () => {
    const response = await post('/api/synthesize', { text: '测试 < &', voice: 'zh-CN-XiaoxiaoNeural', rate: 5, pitch: -1 });
    assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'audio/mpeg');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), mp3);
    assert.match(calls.at(-1).ssml, /&lt; &amp;/);
    assert.equal(calls.at(-1).config.key, fakeKey);
    assert.equal((await fetch(url + '/.local/config.json')).status, 404);
    assert.equal((await fetch(url + '/server.mjs')).status, 404);
  });
  await t.test('rejects cross-site JSON and invalid regions', async () => {
    assert.equal((await post('/api/config', { region: 'eastasia', key: fakeKey }, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await post('/api/config', { region: 'evil.example/path', key: fakeKey })).status, 400);
    const plain = await fetch(url + '/api/config', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
    assert.equal(plain.status, 415);
    const blocked = await fetch(url + '/api/history', { headers: { Origin: 'https://evil.example' } });
    assert.equal(blocked.status, 403);
  });
  await t.test('audio is cached, can be restored after restart, and history contains no text or key', async () => {
    const before = calls.filter(c => c.route === 'v1').length;
    const response = await post('/api/synthesize', { text: '测试 < &', voice: 'zh-CN-XiaoxiaoNeural', rate: 5, pitch: -1 });
    assert.equal(response.headers.get('X-Free-TTS-Cache'), 'hit');
    assert.equal(calls.filter(c => c.route === 'v1').length, before);
    const result = await (await fetch(url + '/api/history')).json();
    assert.equal(result.items.length, 1);
    assert.equal(JSON.stringify(result).includes(fakeKey), false);
    assert.equal(JSON.stringify(result).includes('测试 < &'), false);
    const restored = await fetch(`${url}/api/audio/${result.items[0].id}.mp3`);
    assert.deepEqual(Buffer.from(await restored.arrayBuffer()), mp3);
    const another = createApp({ configPath, requestAzure });
    await new Promise(resolve => another.listen(0, '127.0.0.1', resolve));
    try { const data = await (await fetch(`http://127.0.0.1:${another.address().port}/api/history`)).json(); assert.equal(data.items.length, 1); }
    finally { await new Promise(resolve => another.close(resolve)); }
  });
  await t.test('sanitizes Azure errors and keeps service usable after failure', async () => {
    upstreamStatus = 401;
    const response = await post('/api/synthesize', { text: '模拟新的错误请求', voice: 'zh-CN-XiaoxiaoNeural' });
    assert.equal(response.status, 502); const data = await response.text();
    assert.match(data, /验证失败/); assert.equal(data.includes(fakeKey), false);
    upstreamStatus = 200;
    assert.equal((await post('/api/synthesize', { text: '你好', voice: 'zh-CN-XiaoxiaoNeural' })).status, 200);
  });
  await t.test('guides, health endpoint and tutorial links are available without credentials', async () => {
    assert.equal((await (await fetch(url + '/api/health')).json()).app, 'free-tts');
    const response = await fetch(url + '/guide/azure-f0-setup');
    assert.equal(response.status, 200); const html = await response.text();
    assert.match(html, /Microsoft.CognitiveServicesSpeechServices/); assert.match(html, /Free F0/);
    assert.equal((await fetch(url + '/guide/not-found')).status, 404);
  });
  await t.test('only one cloud synthesis runs and config cannot change midway', async () => {
    let started; let release;
    const ready = new Promise(resolve => { started = resolve; });
    const wait = new Promise(resolve => { release = resolve; });
    synthGate = async () => { started(); await wait; };
    const first = post('/api/synthesize', { text: '串行合成一', voice: 'zh-CN-XiaoxiaoNeural' });
    await ready;
    try {
      assert.equal((await post('/api/synthesize', { text: '串行合成二', voice: 'zh-CN-XiaoxiaoNeural' })).status, 429);
      assert.equal((await post('/api/config/clear', { confirm: true })).status, 409);
    } finally { release(); synthGate = null; }
    assert.equal((await first).status, 200);
  });
  await t.test('audio cache retains at most twenty complete records', async () => {
    for (let i = 0; i < 21; i++) {
      const response = await post('/api/synthesize', { text: `缓存上限测试${i}`, voice: 'zh-CN-XiaoxiaoNeural' });
      assert.equal(response.status, 200); await response.arrayBuffer();
    }
    assert.equal((await (await fetch(url + '/api/history')).json()).items.length, 20);
  });
  await t.test('explicit clear endpoints separate audio cache from credentials', async () => {
    assert.equal((await post('/api/cache/clear', {})).status, 400);
    assert.equal((await post('/api/cache/clear', { confirm: true })).status, 200);
    assert.equal((await (await fetch(url + '/api/history')).json()).items.length, 0);
    assert.equal((await (await fetch(url + '/api/config')).json()).configured, true);
    assert.equal((await post('/api/config/clear', { confirm: true })).status, 200);
    assert.equal((await (await fetch(url + '/api/config')).json()).configured, false);
  });
});
