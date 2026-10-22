import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pageMetadata } from './seo.mjs';

export const topics = [
  ['index', '从这里开始', 'README.md'],
  ['azure-registration', '01 · 注册 Azure', 'docs/azure-registration.md'],
  ['azure-f0-setup', '02 · 创建 Speech F0', 'docs/azure-f0-setup.md'],
  ['online-workbench', '03 · 在线使用（免安装）', 'docs/online-workbench.md'],
  ['local-setup', '本地版 · 安装与启动', 'docs/local-setup.md'],
  ['usage', '04 · 连接与日常使用', 'docs/usage.md'],
  ['free-quota', '免费额度怎么算', 'docs/free-quota.md'],
  ['subscription', '30 天后怎么办', 'docs/subscription.md'],
  ['troubleshooting', '常见问题与排查', 'docs/troubleshooting.md'],
  ['links', '官方入口链接', 'docs/links.md'],
  ['english', 'English · Project guide', 'README.en.md'],
];
export const escapeHtml = text => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const guideImages = {
  'images/workbench.jpg': 'workbench.jpg', 'docs/images/workbench.jpg': 'workbench.jpg',
  'docs/images/free-tts-cover.jpg': 'free-tts-cover.jpg',
};
function linkTarget(href, options = {}) {
  const base = options.basePath || "/";
  if (/^https?:\/\//.test(href) || /^#/.test(href)) return href;
  const [file, fragment] = href.split('#');
  if (Object.hasOwn(guideImages, file)) return `${base}guide-assets/${guideImages[file]}`;
  const topic = topics.find(t => t[2] === file || t[2] === `docs/${file}` || (file === '../README.md' && t[0] === 'index'));
  return topic ? `${base}guide/${topic[0]}${options.static ? "/" : ""}${fragment ? `#${fragment}` : ''}` : null;
}
function inline(text, options = {}) {
  const image = (alt, source) => Object.hasOwn(guideImages, source)
    ? `<img src="${escapeHtml(linkTarget(source, options))}" alt="${escapeHtml(alt)}" loading="lazy">`
    : escapeHtml(alt);
  return text.split(/(\[!\[[^\]]*\]\([^\s)]+\)\]\([^\s)]+\)|!?\[[^\]]*\]\([^\s)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g).map(piece => {
    const linkedImage = piece.match(/^\[!\[([^\]]*)\]\(([^\s)]+)\)\]\(([^\s)]+)\)$/);
    if (linkedImage) {
      const href = linkTarget(linkedImage[3], options);
      const content = image(linkedImage[1], linkedImage[2]);
      return href ? `<a href="${escapeHtml(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${content}</a>` : content;
    }
    const link = piece.match(/^(!?)\[([^\]]*)\]\(([^\s)]+)\)$/);
    if (link) {
      const href = linkTarget(link[3], options);
      if (!href) return escapeHtml(link[2]);
      if (link[1]) return image(link[2], link[3]);
      return `<a href="${escapeHtml(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(link[2])}</a>`;
    }
    if (piece.startsWith('`') && piece.endsWith('`')) return `<code>${escapeHtml(piece.slice(1, -1))}</code>`;
    if (piece.startsWith('**') && piece.endsWith('**')) return `<strong>${escapeHtml(piece.slice(2, -2))}</strong>`;
    return escapeHtml(piece);
  }).join('');
}
export function renderMarkdown(markdown, options = {}) {
  const inlineText = text => inline(text, options);
  const lines = markdown.replace(/\r/g, '').split('\n');
  const output = []; let code = null; let list = null;
  const closeList = () => { if (list) { output.push(`</${list}>`); list = null; } };
  const cells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      closeList();
      if (code === null) code = []; else { output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); code = null; }
      continue;
    }
    if (code !== null) { code.push(line); continue; }
    if (!line.trim()) { closeList(); continue; }
    if (line.startsWith('|') && /^\s*\|?\s*:?-{3}/.test(lines[i + 1] || '')) {
      closeList(); const head = cells(line); i++;
      let table = `<div class="table-wrap"><table><thead><tr>${head.map(v => `<th>${inlineText(v)}</th>`).join('')}</tr></thead><tbody>`;
      while (lines[i + 1]?.startsWith('|')) table += `<tr>${cells(lines[++i]).map(v => `<td>${inlineText(v)}</td>`).join('')}</tr>`;
      output.push(table + '</tbody></table></div>'); continue;
    }
    const heading = line.match(/^(#{1,6}) (.+)$/);
    if (heading) { closeList(); const level = heading[1].length; const id = heading[2].toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-'); output.push(`<h${level} id="${escapeHtml(id)}">${inlineText(heading[2])}</h${level}>`); continue; }
    const bullet = line.match(/^(?:- |\d+\. )(.+)$/);
    if (bullet) { const type = line.startsWith('- ') ? 'ul' : 'ol'; if (list !== type) { closeList(); list = type; output.push(`<${type}>`); } output.push(`<li>${inlineText(bullet[1])}</li>`); continue; }
    closeList(); output.push(line.startsWith('> ') ? `<blockquote>${inlineText(line.slice(2))}</blockquote>` : `<p>${inlineText(line)}</p>`);
  }
  closeList(); if (code !== null) output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return output.join('\n');
}
export async function guidePage(root, slug, options = {}) {
  const base = options.basePath || "/";
  const topic = topics.find(t => t[0] === slug);
  if (!topic) return null;
  const markdown = await readFile(path.join(root, topic[2]), 'utf8');
  const english = slug === 'english';
  const lang = english ? 'en' : 'zh-CN';
  const title = english ? 'free-tts · Free Online Text-to-Speech, Azure F0 & MP3 Guide' : `${topic[1]} · free-tts 文字转语音教程`;
  const description = english
    ? 'Free, open-source TTS web app: Chinese and English neural voices, Azure Speech F0 setup, BYOK privacy, MP3 downloads and self-hosting. Text-to-speech, not speech-to-text.'
    : `${topic[1]}：free-tts 免费 TTS 文字转语音与语音合成教程，使用自己的 Azure Speech F0 资源，了解注册、配置、配音和 MP3 下载。`;
  const metadata = options.static ? pageMetadata({ title, description, basePath: base, route: `guide/${slug}/`, lang, languageAlternates: slug === 'index' || english, siteOrigin: options.siteOrigin }) : `<title>${escapeHtml(title)}</title>`;
  const projectFiles = { 'CONTRIBUTING.md': 'https://github.com/zty-f/free-tts/blob/main/CONTRIBUTING.md', 'SECURITY.md': 'https://github.com/zty-f/free-tts/blob/main/SECURITY.md', 'CHANGELOG.md': 'https://github.com/zty-f/free-tts/blob/main/CHANGELOG.md', 'docs/verification.md': 'https://github.com/zty-f/free-tts/blob/main/docs/verification.md', 'docs/discoverability.md': 'https://github.com/zty-f/free-tts/blob/main/docs/discoverability.md' };
  let content = markdown;
  for (const [file, href] of Object.entries(projectFiles)) content = content.replaceAll(`](${file})`, `](${href})`);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${metadata}<link rel="stylesheet" href="${base}docs.css"><link rel="icon" href="data:,"></head><body><a class="skip" href="#content">${english ? 'Skip to content' : '跳到正文'}</a><header><a class="logo" href="${base}">free-tts</a><span>${english ? 'Free online text-to-speech · Azure Speech F0' : '从注册到第一段语音'}</span><a href="${base}">${english ? (options.static ? 'Project home' : 'Local workbench') : (options.static ? '返回项目首页' : '返回工作台')} →</a></header><div class="guide-layout"><nav aria-label="${english ? 'Guides (detailed tutorials in Chinese)' : '教程目录'}">${topics.map(t => `<a href="${base}guide/${t[0]}${options.static ? "/" : ""}"${t[0] === slug ? ' aria-current="page"' : ''}>${escapeHtml(t[1])}</a>`).join('')}</nav><main id="content">${renderMarkdown(content, options)}<footer>${english ? 'free-tts · MIT · Azure policy checked: 2026-10-22. Refer to Microsoft for current terms and pricing.' : 'free-tts 开源语音工具 · 规则核对：2026-10-22 · Azure 界面和政策以官网为准。'}</footer></main></div></body></html>`;
}
