import { spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { sourceFiles } from './package.mjs';
import { guidePage, topics } from '../lib/docs.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const files = await sourceFiles(root);
for (const file of files) {
  if (/\.(mjs|js)$/.test(file.name)) {
    const check = spawnSync(process.execPath, ['--check', path.join(root, file.name)], { encoding: 'utf8' });
    if (check.status) throw new Error(`语法检查失败：${file.name}\n${check.stderr}`);
  }
  if (file.name.endsWith('.md')) {
    const content = file.data.toString();
    if (/\/Users\/zty|zbookshoot|azure-tts-local/.test(content)) throw new Error(`文档含个人或旧项目路径：${file.name}`);
    for (const match of content.matchAll(/\]\(([^\s)]+)\)/g)) {
      const href = match[1]; if (/^https?:\/\//.test(href) || href.startsWith('#')) continue;
      await access(path.resolve(root, path.dirname(file.name), href.split('#')[0])).catch(() => { throw new Error(`文档链接不存在：${file.name} → ${href}`); });
    }
  }
}
for (const topic of topics) { const html = await guidePage(root, topic[0]); if (!html.includes('<main')) throw new Error(`教程渲染失败：${topic[0]}`); }
console.log(`检查通过：${files.length} 个源码文件、JavaScript 语法、Markdown 本地链接、${topics.length} 个教程页面。`);
