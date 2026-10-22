import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite } from './scripts/build-site.mjs';
import { topics } from './lib/docs.mjs';

test('Pages 子路径导航、在线工作台资源和源码下载完整，构建不包含本机配置', async () => {
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
    assert.equal(htmlFiles.length, topics.length + 2);
    for (const file of htmlFiles) {
      const html = await readFile(file, 'utf8');
      assert.doesNotMatch(html, /\{\{BASE\}\}|href="\/guide\//);
      const isWorkbench = path.relative(output, file).split(path.sep).join('/') === 'workbench/index.html';
      if (!isWorkbench) assert.doesNotMatch(html, /<input|<script/);
      for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        if (/^(?:https?:|data:|#)/.test(href)) continue;
        const page = `https://example.test/free-tts/${path.relative(output, file).split(path.sep).join('/')}`;
        const url = new URL(href, page);
        assert.ok(url.pathname.startsWith('/free-tts/'), `${file}: ${href}`);
        const target = path.join(output, url.pathname.slice('/free-tts/'.length));
        assert.ok((await stat(target)).isFile() || (await stat(path.join(target, 'index.html'))).isFile());
      }
    }
    const home = await readFile(path.join(output, 'index.html'), 'utf8');
    assert.match(home, /downloads\/free-tts-0\.2\.0\.zip/);
    assert.match(home, /href="\/free-tts\/workbench\/"/);
    assert.match(await readFile(path.join(output, 'guide/azure-f0-setup/index.html'), 'utf8'), /返回项目首页/);
    const workbench = await readFile(path.join(output, 'workbench/index.html'), 'utf8');
    assert.match(workbench, /type="password"/);
    assert.match(workbench, /Content-Security-Policy/);
    assert.match(workbench, /form-action 'none'/);
    assert.match(workbench, /connect-src https:\/\/\*\.tts\.speech\.microsoft\.com/);
    for (const name of ['app.js', 'azure.js', 'metrics.js']) {
      const source = await readFile(path.join(output, 'workbench', name), 'utf8');
      assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|console\.|\/api\//);
      for (const [, specifier] of source.matchAll(/from ['"]([^'"]+)['"]/g)) await stat(path.resolve(output, 'workbench', specifier));
    }
    assert.match(await readFile(path.join(output, 'workbench/style.css'), 'utf8'), /@import url\("\.\/base.css"\)/);
    await stat(path.join(output, 'workbench/base.css'));
  } finally { await rm(temp, { recursive: true, force: true }); }
});
