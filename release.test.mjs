import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFiles, makeZip } from './scripts/package.mjs';
import { renderMarkdown, guidePage } from './lib/docs.mjs';
import { estimateTextCharacters, estimateMinutes } from './public/metrics.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
test('计数区分汉字与输入码点，慢语速增大时长估算', () => {
  assert.equal(estimateTextCharacters('你好A !'), 7);
  assert.equal(estimateTextCharacters('𠀀'), 2);
  assert.equal(estimateMinutes('你'.repeat(250), -50), 2);
});
test('教程渲染安全转义 HTML，拒绝脚本链接并转换内部导航', async () => {
  const html = renderMarkdown('# 示例\n\n<script>alert(1)</script>\n\n[创建](https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices)\n\n[跳转](azure-f0-setup.md)\n\n[危险](javascript:alert)');
  assert.equal(html.includes('<script>'), false); assert.equal(html.includes('href="javascript:'), false);
  assert.match(html, /href="\/guide\/azure-f0-setup"/); assert.match(html, /noopener noreferrer/);
  assert.equal(await guidePage(root, '../../.local/config'), null);
});
test('源码打包白名单排除密钥、缓存和个人运行记录', async () => {
  const files = await sourceFiles(root);
  assert.ok(files.some(f => f.name === 'LICENSE'));
  assert.ok(files.some(f => f.name === 'README.en.md'));
  assert.ok(files.some(f => f.name === 'docs/azure-f0-setup.md'));
  assert.ok(files.some(f => f.name === '启动free-tts.bat'));
  assert.equal(files.some(f => /\.local|config\.json|\.env|\.(mp3|wav|log)$/.test(f.name)), false);
  const zip = makeZip(files); assert.equal(zip.readUInt32LE(), 0x04034b50); assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
});
