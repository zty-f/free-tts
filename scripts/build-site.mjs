import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { topics, guidePage } from '../lib/docs.mjs';
import { sourceFiles, makeZip } from './package.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export async function buildSite({ root = ROOT, output = path.join(ROOT, '_site'), basePath = '/free-tts/' } = {}) {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(basePath)) throw new Error('basePath 必须是以 / 开始和结束的路径。');
  // Only the dedicated generated directory may be replaced.
  if (path.basename(output) !== '_site') throw new Error('输出目录必须命名为 _site。');
  await rm(output, { recursive: true, force: true });
  await mkdir(path.join(output, 'guide-assets'), { recursive: true });
  await mkdir(path.join(output, 'downloads'), { recursive: true });
  const template = await readFile(path.join(root, 'site/index.html'), 'utf8');
  await writeFile(path.join(output, 'index.html'), template.replaceAll('{{BASE}}', basePath));
  await copyFile(path.join(root, 'site/style.css'), path.join(output, 'site.css'));
  await copyFile(path.join(root, 'public/docs.css'), path.join(output, 'docs.css'));
  await copyFile(path.join(root, 'docs/images/workbench.jpg'), path.join(output, 'guide-assets/workbench.jpg'));
  await writeFile(path.join(output, '.nojekyll'), '');
  for (const [slug] of topics) {
    const directory = path.join(output, 'guide', slug);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), await guidePage(root, slug, { static: true, basePath }));
  }
  const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  await writeFile(path.join(output, 'downloads', `free-tts-${version}.zip`), makeZip(await sourceFiles(root)));
  return { output, pages: topics.length + 1, basePath };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildSite({ basePath: process.env.SITE_BASE_PATH || '/free-tts/' });
  console.log(`静态站已生成：${result.pages} 页，路径 ${result.basePath}，输出 ${result.output}`);
}
