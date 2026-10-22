# 参与 free-tts

仓库：[zty-f/free-tts](https://github.com/zty-f/free-tts)。欢迎通过 [Issue](https://github.com/zty-f/free-tts/issues) 报告普通问题，通过 [Pull Request](https://github.com/zty-f/free-tts/pulls) 提交改进。请先阅读 [安全说明](SECURITY.md)，不要公开密钥和漏洞利用细节。

## 开发

使用 Node.js 22+（推荐 24 LTS）和 curl，没有 npm 运行时依赖。进入项目目录后执行：

```sh
npm run doctor
npm test
npm run check
npm start
```

server.mjs 负责本机 API、Azure 调用和缓存；public/ 为原生网页；lib/docs.mjs 将已知 Markdown 教程渲染为本机帮助页。正文计费和时长估算在 public/metrics.js，前后端共用。

## 修改原则

- 保持本机绑定、凭据不回显、SSML 转义和跨站保护。
- 不默认为用户升级 Azure 资源或自动重试付费合成。
- 普通功能测试使用临时目录和模拟上游；不要让 CI 请求真实 Azure。
- 涉及平台支持的修改，记录具体测试系统、Node 版本和未验证部分。
- 文档中的免费政策附官方来源和核对日期。地方门户和主权云适配需要单独验证。

## 分享本地源码包

```sh
npm run check
npm run package
```

白名单打包保留可执行文件标记，输出到 .local/releases/。检查包内没有配置、缓存、MP3、环境变量或私人截图后再分享。打包命令不会初始化远程仓库或发布任何内容。

提交改动前，请核对许可证、链接与验证记录。MIT 许可适用于本项目代码，不替代 Azure 服务协议。

## 在线教程站

`site/` 保存静态首页和在线工作台；`npm run build:site` 将首页、Markdown 教程与源码 ZIP 输出到 `_site/`。Pages 工作流自动发布 main，`_site/` 不提交 Git。更改路由时执行 `npm test` 检查 `/free-tts/` 子路径下的导航和资源。GitHub Actions 在 Windows、macOS、Linux 的 Node.js 22/24 上运行环境检查和测试；CI 不调用真实 Azure。

在线代码位于 `site/workbench/`，通过浏览器 fetch 直连官方 REST 接口，无运行时依赖。构建时共用 public/metrics.js 与本地版样式。在线版密钥只存于当前页面内存，不添加记住密钥、遥测、共享密钥或项目后端代理；修改网络代码需检查 URL、重定向、错误及存储边界。

## 中英文文档与检索信息

`README.md` 是中文入口，`README.en.md` 是英文入口，并在静态网站生成 English guide。功能、安装要求、免费条件、密钥保存范围及限制发生变化时，应同步更新两份文档。详细中文教程目前没有逐篇翻译，英文 README 明确说明界面和配套文档的语言范围。

检索信息应围绕已经实现的文字转语音、TTS、speech synthesis、中文英文配音和 MP3 下载，不给未实现的语音转文字 / STT 添加功能标签。GitHub 的简介和 Topics 属于仓库设置，修改本地 package.json 不会自动更新它们。

`lib/seo.mjs` 生成网页标题、摘要、canonical、社交分享信息及中英文说明页的双向 hreflang；构建同时生成项目路径下的 sitemap.xml。SITE_ORIGIN 默认为 `https://www.zruler.fun`，自行部署时改为自己的站点源地址，SITE_BASE_PATH 对应仓库路径。不会生成或修改博客根路径的 robots.txt。

完整来源与维护说明见 [项目检索说明](docs/discoverability.md)。搜索引擎收录和排名由平台决定，不以“已添加关键词”宣称已获得排名。
