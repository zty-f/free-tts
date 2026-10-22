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

`site/` 保存静态首页；`npm run build:site` 将首页、Markdown 教程与源码 ZIP 输出到 `_site/`。Pages 工作流自动发布 main，`_site/` 不提交 Git。更改路由时执行 `npm test` 检查 `/free-tts/` 子路径下的导航和资源。GitHub Actions 在 Windows、macOS、Linux 的 Node.js 22/24 上运行环境检查和测试；CI 不调用真实 Azure。
