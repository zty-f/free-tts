import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite } from './scripts/build-site.mjs';

test('Pages 子路径下所有静态页面导航与资源存在，产物不含运行配置或密钥输入框', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'free-tts-site-'));
  try {
    const output = path.join(temp, '_site');
    await buildSite({ output });
    const htmlFiles = [];
    async function visit(directory) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) await visit(full);
        else {
          assert.doesNotMatch(path.relative(output, full), /(?:^|[\\/])(?:\.local|\.env|config\.json)(?:$|[\\/])/);
          if (full.endsWith('.html')) htmlFiles.push(full);
        }
      }
    }
    await visit(output);
    assert.equal(htmlFiles.length, 10);
    for (const file of htmlFiles) {
      const html = await readFile(file, 'utf8');
      assert.doesNotMatch(html, /\{\{BASE\}\}|<input|<script|href="\/guide\//);
      for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        if (/^(?:https?:|data:|#)/.test(href)) continue;
        assert.ok(href.startsWith('/free-tts/'), `${file}: ${href}`);
        const target = path.join(output, href.slice('/free-tts/'.length).split('#')[0]);
        assert.ok((await stat(target)).isFile() || (await stat(path.join(target, 'index.html'))).isFile());
      }
    }
    const home = await readFile(path.join(output, 'index.html'), 'utf8');
    assert.match(home, /downloads\/free-tts-0\.1\.0\.zip/);
    assert.match(await readFile(path.join(output, 'guide/azure-f0-setup/index.html'), 'utf8'), /返回项目首页/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
