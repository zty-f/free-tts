const escape = text => String(text).replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[value]);
export const DEFAULT_ORIGIN = 'https://www.zruler.fun';

export function siteUrl(basePath, route = '', siteOrigin = process.env.SITE_ORIGIN || DEFAULT_ORIGIN) {
  const origin = new URL(siteOrigin);
  if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('SITE_ORIGIN 必须是站点源地址，不含路径、凭据、查询或片段。');
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(basePath) || !/^(?:[a-zA-Z0-9_-]+\/)*$/.test(route)) throw new Error('站点路径格式无效。');
  return `${origin.origin}${basePath}${route}`;
}

export function pageMetadata({ title, description, basePath, route = '', lang = 'zh-CN', languageAlternates = false, siteOrigin }) {
  const url = siteUrl(basePath, route, siteOrigin);
  const image = `${siteUrl(basePath, '', siteOrigin)}guide-assets/workbench.jpg`;
  const tags = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}">`,
    `<link rel="canonical" href="${escape(url)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="free-tts">',
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta property="og:url" content="${escape(url)}">`,
    `<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'zh_CN'}">`,
    `<meta property="og:image" content="${escape(image)}">`,
    '<meta property="og:image:alt" content="free-tts text-to-speech workbench interface">',
    '<meta property="og:image:width" content="1280">',
    '<meta property="og:image:height" content="720">',
    '<meta name="twitter:card" content="summary_large_image">',
  ];
  if (languageAlternates) {
    for (const [language, path] of [['zh-Hans', 'guide/index/'], ['en', 'guide/english/'], ['x-default', 'guide/index/']]) {
      tags.push(`<link rel="alternate" hreflang="${language}" href="${escape(siteUrl(basePath, path, siteOrigin))}">`);
    }
  }
  return tags.join('\n');
}

export function sitemap(basePath, routes, siteOrigin) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(routes)].map(route => `  <url><loc>${escape(siteUrl(basePath, route, siteOrigin))}</loc></url>`).join('\n')}\n</urlset>\n`;
}
