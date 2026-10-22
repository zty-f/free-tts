import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { topics, guidePage } from '../lib/docs.mjs';
import { sourceFiles, makeZip } from './package.mjs';
import { pageMetadata, sitemap } from '../lib/seo.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export async function buildSite({ root = ROOT, output = path.join(ROOT, '_site'), basePath = '/free-tts/', siteOrigin } = {}) {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(basePath)) throw new Error('basePath 必须是以 / 开始和结束的路径。');
  // Only the dedicated generated directory may be replaced.
  if (path.basename(output) !== '_site') throw new Error('输出目录必须命名为 _site。');
  await rm(output, { recursive: true, force: true });
  await mkdir(path.join(output, 'guide-assets'), { recursive: true });
  await mkdir(path.join(output, 'downloads'), { recursive: true });
  const template = await readFile(path.join(root, 'site/index.html'), 'utf8');
  const homeMetadata = pageMetadata({ title: 'free-tts · 免费在线 TTS 文字转语音与 MP3 下载', description: '开源免费 TTS 文字转语音工具：自带 Azure Speech 密钥与区域，在线语音合成、中文英文配音、试听并下载 MP3。支持免安装使用和本地运行，附中英文 README 与 Azure F0 注册配置教程。', basePath, siteOrigin });
  await writeFile(path.join(output, 'index.html'), template.replace('{{SEO}}', homeMetadata).replaceAll('{{BASE}}', basePath));
  await copyFile(path.join(root, 'site/style.css'), path.join(output, 'site.css'));
  await copyFile(path.join(root, 'public/docs.css'), path.join(output, 'docs.css'));
  await copyFile(path.join(root, 'docs/images/workbench.jpg'), path.join(output, 'guide-assets/workbench.jpg'));
  const workbench = path.join(output, 'workbench');
  await mkdir(workbench, { recursive: true });
  const online = await readFile(path.join(root, 'site/workbench/index.html'), 'utf8');
  const workbenchMetadata = pageMetadata({ title: '在线 TTS 工作台 · 免费文字转语音、试听与 MP3 下载 | free-tts', description: '在浏览器使用自己的 Azure Speech 密钥和区域，进行中文、英文多语言文字转语音与 Neural 语音合成。密钥仅保存于当前页面内存，支持调节语速音调、试听和 MP3 下载。免费条件以 Azure F0 为准。', basePath, route: 'workbench/', siteOrigin });
  await writeFile(path.join(workbench, 'index.html'), online.replace('{{SEO}}', workbenchMetadata).replaceAll('{{BASE}}', basePath));
  for (const file of ['app.js', 'style.css']) await copyFile(path.join(root, 'site/workbench', file), path.join(workbench, file));
  const azure = await readFile(path.join(root, 'site/workbench/azure.js'), 'utf8');
  await writeFile(path.join(workbench, 'azure.js'), azure.replace('../../public/metrics.js', './metrics.js'));
  await copyFile(path.join(root, 'public/style.css'), path.join(workbench, 'base.css'));
  await copyFile(path.join(root, 'public/metrics.js'), path.join(workbench, 'metrics.js'));
  await writeFile(path.join(output, '.nojekyll'), '');
  for (const [slug] of topics) {
    const directory = path.join(output, 'guide', slug);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), await guidePage(root, slug, { static: true, basePath, siteOrigin }));
  }
  await writeFile(path.join(output, 'sitemap.xml'), sitemap(basePath, ['', 'workbench/', ...topics.map(([slug]) => `guide/${slug}/`)], siteOrigin));
  const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  await writeFile(path.join(output, 'downloads', `free-tts-${version}.zip`), makeZip(await sourceFiles(root)));
  return { output, pages: topics.length + 2, basePath };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildSite({ basePath: process.env.SITE_BASE_PATH || '/free-tts/' });
  console.log(`静态站已生成：${result.pages} 页，路径 ${result.basePath}，输出 ${result.output}`);
}
