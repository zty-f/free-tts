# free-tts

使用你自己的 Azure Speech 免费额度，在线合成、试听并下载 MP3；也可下载本地版运行。

输入文字、选择音色、调节语速音调，试听并下载 MP3。在线版由浏览器直连 Microsoft Azure，密钥仅保存在当前页面内存；本地版通过电脑上的 Node 服务连接 Azure。项目不依赖第三方共享接口，不提供公共密钥。

> v0.2.0 · MIT 开源 · 教程规则核对日期：2026-10-22。

[在线工作台](https://zty-f.github.io/free-tts/workbench/) · [项目首页与在线教程](https://zty-f.github.io/free-tts/) · [下载源码 ZIP](https://zty-f.github.io/free-tts/downloads/free-tts-0.2.0.zip) · [GitHub 仓库](https://github.com/zty-f/free-tts)

在线工作台无需安装：填写自己的密钥和区域，连接后即可生成。页面不主动将密钥写入浏览器存储；刷新、离开或关闭后需重填。音频请及时下载。[在线使用说明](docs/online-workbench.md)

## 先看免费条件

- 软件免费，在线版和本地版均无需购买服务器，仍需要联网访问 Azure。
- 使用自己的有效 Azure 订阅和 **Speech Free F0** 资源。
- F0 目前每月提供 **50 万计费字符**；汉字每个按 2 个计费字符计算，不能理解成 50 万汉字。
- 纯中文大致接近 25 万汉字，实际还包含标点、空白及部分 SSML 内容。大量重试、重复生成也会消耗额度。
- Azure 注册可能需要银行卡验证。200 美元赠金只用于前 30 天的试用，不是每月赠送。
- 试用订阅到期后，要继续使用一般需要升级订阅；Speech 资源保持 F0。订阅升级和资源升级是两件事。

阅读 [免费额度怎么算](docs/free-quota.md) 和 [30 天后怎么办](docs/subscription.md)。政策以 [Azure 官方价格](https://azure.microsoft.com/en-us/pricing/details/speech/) 为准。

## 从零开始

| 顺序 | 要做什么 | 完成标志 |
| --- | --- | --- |
| 1 | [注册 Azure](docs/azure-registration.md) | 订阅已激活 |
| 2 | [创建 Speech F0](docs/azure-f0-setup.md) | 资源定价层显示 Free F0 |
| 3 | [打开在线工作台](docs/online-workbench.md) | 无需安装，连接自己的资源 |
| 4 | [连接并生成第一段语音](docs/usage.md) | 下载到可播放的 MP3 |
| 5 | [管理额度和订阅](docs/subscription.md) | 知道试用到期如何处理 |

快捷入口：[Azure 免费注册](https://azure.microsoft.com/free/) · [直接创建 Speech](https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices) · [Azure 控制台](https://portal.azure.com/) · [官方链接总表](docs/links.md)。创建直达页若失效，请按 F0 教程的备用路径操作。

## 已有 Azure？打开即用

打开 [在线工作台](https://zty-f.github.io/free-tts/workbench/)，填入密钥和区域，点击「连接 Azure」，选择音色、输入文字并生成。试听或下载已有音频不会再次请求 Azure；在线版每次点击生成都会请求 Azure，不自动重试或缓存去重。

在线版的密钥、正文、音频仅在本页内存暂存，刷新后会清除；不会继承本地版配置。详见 [在线工作台教程](docs/online-workbench.md)。

## 本地版快速启动（可选）

需要 Node.js 22+，教程推荐 [Node.js 24 LTS](https://nodejs.org/zh-cn/download)，以及 curl。无需 npm install，没有第三方运行时 npm 依赖。

- macOS：解压后双击 `启动free-tts.command`。
- Windows 10/11：解压后双击 `启动free-tts.bat`。
- Linux：进入项目目录，执行 `sh start.sh`。

也可以在项目目录的终端执行：

```sh
npm run doctor
npm start
```

浏览器默认打开 [http://127.0.0.1:4318](http://127.0.0.1:4318)。点击「连接设置」，填入 Azure 密钥和区域代码，保存后输入短文本生成。终端窗口要保持运行，按 Ctrl+C 停止。启动后，点击页面的「从零开始教程」可以直接阅读本文和全部教程。

![free-tts 本地工作台](docs/images/workbench.jpg)

## 已实现

在线版：密钥和区域连接、多语言普通 Neural 音色、语速音调、计费字符估算、MP3 试听与下载、取消并断开；密钥仅保存在当前页面内存。

本地版：

- 中文、英文等多语言及当前区域的普通 GA Neural 音色。
- 语速、音调调节；正文计费字符估算，明确不冒充剩余额度。
- 每次最多 3,000 个输入字符；按语速粗估超 8 分钟时提示分段，避免接近云端 10 分钟上限。
- 本机缓存最近 20 段音频，刷新或重启后仍可播放和下载；相同账号、区域、文字和参数命中缓存时不请求 Azure。
- 修改或清除本机密钥、清理音频缓存。
- Windows/macOS 启动脚本、环境检查、可在浏览器阅读的中文教程。

没有声音克隆、字幕时间轴、自动长文合并、公共共享密钥服务或真实剩余额度查询。本地版草稿保存在本地站点存储；在线版不主动持久保存草稿。

## 数据与安全

在线版：浏览器 → 你自己的 Azure Speech → 浏览器内存与 MP3 下载。密钥只在本页内存使用，采用 HTTPS 请求头发送到 Azure，不进入网址、项目后端、浏览器存储或正常日志。正文在生成时发送给 Azure。公开站点的页面脚本会接触用户输入的密钥，因此应在可信站点或自行部署的版本使用。

本地版：本机网页 → 本机 Node 服务 → 你自己的 Azure Speech → 本机 MP3 缓存与下载。以下文件保存说明仅适用于本地版：

密钥保存在忽略目录 `.local/config.json`；音频和不含完整正文的元数据保存在 `.local/audio/`。这是本机明文配置，并非加密保险箱。Unix 上目录限制为 700、文件为 600；Windows 使用当前账号的文件系统权限，不能把 chmod 当成 ACL 保护。请使用私人电脑和受限账号目录。

密钥不会提交到前端响应、浏览器 localStorage 或正常日志中。语音服务只监听 127.0.0.1；公开网站部署静态在线工作台、教程与下载。不要把整个工作目录或 `.local/` 分享给别人。已缓存的音频包含你的内容，清理或分享前自行检查。

## 开发与准备分享

```sh
npm test
npm run check
npm run package
```

打包命令只收集白名单源码，生成 `.local/releases/free-tts-0.2.0.zip`，不会上传或发布。不会收录 `.local/`、本机密钥、运行音频或环境变量文件。不要用文件管理器压缩整个工作目录代替这个命令。

更多见 [贡献指南](CONTRIBUTING.md)、[安全说明](SECURITY.md)、[更新记录](CHANGELOG.md) 和 [验证记录](docs/verification.md)；开源许可证见 LICENSE。项目代码许可与 Azure 服务、音色和生成内容的使用条款分别适用；项目与 Microsoft 无隶属关系。

## 在线教程站

GitHub Pages 使用 `.github/workflows/pages.yml` 自动从 main 构建并发布静态首页、在线工作台、10 篇教程和白名单源码 ZIP。网站不运行 Node 语音 API，语音数据不经过项目后端；密钥在浏览器内存中使用。

```sh
npm run build:site
```

输出到忽略目录 `_site/`，默认路径 `/free-tts/`。本地语音工具与在线教程共用 Markdown，更新教程后重新构建即可同步。构建不读取 `.local/`。
