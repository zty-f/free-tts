import test from 'node:test';
import assert from 'node:assert/strict';
import { AzureSession, buildSsml, validateCredentials, filterVoices } from './site/workbench/azure.js';
import { buildSsml as localSsml } from './server.mjs';

const key = 'unit-test-key-never-real-123456';
const voice = { ShortName: 'zh-CN-XiaoxiaoNeural', Locale: 'zh-CN', LocalName: '晓晓', Gender: 'Female', Status: 'GA', VoiceType: 'Neural' };
const parameters = { text: '你好 <voice>& "test"', voice: voice.ShortName, rate: -15, pitch: 2 };
const voiceResponse = () => new Response(JSON.stringify([voice]), { headers: { 'Content-Type': 'application/json' } });

test('默认 fetch 保留浏览器全局接收者，避免真实浏览器 Illegal invocation', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = function () { assert.equal(this, globalThis); return Promise.resolve(voiceResponse()); };
  try { assert.equal((await new AzureSession().connect('eastasia', key)).length, 1); }
  finally { globalThis.fetch = original; }
});

test('在线参数校验阻止域名注入，SSML 与本地版一致，只接受普通 GA Neural 音色', () => {
  assert.equal(buildSsml(parameters), localSsml(parameters));
  for (const region of ['https://evil.test', 'eastasia.evil.test', '../eastasia', '中国东部']) assert.throws(() => validateCredentials(region, key));
  assert.deepEqual(validateCredentials(' EASTASIA ', ` ${key} `), { region: 'eastasia', key });
  assert.throws(() => validateCredentials('eastasia', 'key\nHeader: bad'));
  assert.throws(() => buildSsml({ ...parameters, text: '你'.repeat(3001) }));
  assert.throws(() => buildSsml({ ...parameters, text: '你'.repeat(1200), rate: -50 }));
  assert.throws(() => buildSsml({ ...parameters, voice: 'en-US-Ava:DragonHDLatestNeural' }));
  assert.throws(() => buildSsml({ ...parameters, pitch: NaN }));
  assert.throws(() => buildSsml({ ...parameters, text: '\u0000' }));
  assert.equal(filterVoices([voice, { ...voice, Status: 'Preview' }, { ...voice, VoiceType: 'Standard' }, { ...voice, ShortName: 'en-US-AvaHDNeural' }, null]).length, 1);
});

test('浏览器会话直连 Azure，凭据仅走请求头；生成 MP3、刷新音色和断开不回显密钥', async () => {
  const calls = [];
  const session = new AzureSession({ fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return url.endsWith('/voices/list') ? voiceResponse() : new Response(new Uint8Array([0x49, 0x44, 0x33, 1]), { headers: { 'Content-Type': 'audio/mpeg' } });
  } });
  assert.equal(session.connected, false);
  assert.equal((await session.connect('eastasia', key))[0].name, '晓晓');
  assert.equal(session.connected, true);
  assert.equal(JSON.stringify(session), '{}');
  const audio = await session.synthesize(parameters);
  assert.equal(audio.type, 'audio/mpeg'); assert.equal(audio.size, 4);
  assert.equal(calls[1].options.body, localSsml(parameters));
  assert.equal(calls[1].options.headers['X-Microsoft-OutputFormat'], 'audio-24khz-48kbitrate-mono-mp3');
  assert.equal((await session.refreshVoices()).length, 1);
  for (const { url, options } of calls) {
    assert.ok(url.startsWith('https://eastasia.tts.speech.microsoft.com/'));
    assert.equal(url.includes(key), false);
    assert.equal(options.headers['Ocp-Apim-Subscription-Key'], key);
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); assert.equal(options.referrerPolicy, 'no-referrer');
  }
  session.disconnect();
  assert.equal(session.connected, false);
  await assert.rejects(session.synthesize(parameters), /请先连接/);
});

test('错误与上游响应不泄露密钥，不会自动重试；重新连接失败即清除旧凭据', async () => {
  let status = 200; let calls = 0;
  const session = new AzureSession({ fetchImpl: async () => { calls++; return status === 200 ? voiceResponse() : new Response(`private ${key}`, { status }); } });
  await session.connect('eastasia', key);
  status = 401;
  await assert.rejects(session.connect('eastasia', key), error => !error.message.includes(key) && error.message.includes('验证失败'));
  assert.equal(session.connected, false); assert.equal(calls, 2);
  const network = new AzureSession({ fetchImpl: async () => { throw new Error(`Azure transport leaked ${key}`); } });
  await assert.rejects(network.connect('eastasia', key), error => !error.message.includes(key));
  for (const code of [403, 404, 429, 503]) {
    const failed = new AzureSession({ fetchImpl: async () => new Response(key, { status: code }) });
    await assert.rejects(failed.connect('eastasia', key), error => !error.message.includes(key));
    assert.equal(failed.connected, false);
  }
});

test('正在进行的任务不可重入；取消或超时不会恢复已清除的会话', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let pending = false;
  const session = new AzureSession({ fetchImpl: async () => { if (pending) await gate; return voiceResponse(); } });
  pending = true;
  const connection = session.connect('eastasia', key);
  await assert.rejects(session.connect('eastasia', key), /先取消/);
  session.disconnect(); release();
  await assert.rejects(connection, /取消/);
  assert.equal(session.connected, false);
  const timeout = new AzureSession({ timeout: 5, fetchImpl: async (_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')), { once: true })) });
  await assert.rejects(timeout.connect('eastasia', key), /超时/);
  assert.equal(timeout.connected, false);
});

test('生成失败不会把错误响应作为音频，断开会中止合成', async () => {
  let contentType = 'text/plain';
  const session = new AzureSession({ fetchImpl: async (url) => url.endsWith('/voices/list') ? voiceResponse() : new Response(key, { headers: { 'Content-Type': contentType } }) });
  await session.connect('eastasia', key);
  await assert.rejects(session.synthesize(parameters), /不是音频/);
  contentType = 'audio/mpeg';
  assert.ok((await session.synthesize(parameters)).size);
  let generationSignal;
  const cancelled = new AzureSession({ fetchImpl: async (url, options) => {
    if (url.endsWith('/voices/list')) return voiceResponse();
    generationSignal = options.signal;
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')), { once: true }));
  } });
  await cancelled.connect('eastasia', key);
  const generation = cancelled.synthesize(parameters);
  await assert.rejects(cancelled.synthesize(parameters), /已有请求/);
  cancelled.disconnect();
  assert.equal(generationSignal.aborted, true);
  await assert.rejects(generation, /请求已取消/);
});
