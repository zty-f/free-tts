# free-tts · 免费在线 TTS 文字转语音

**简体中文** · [English](README.en.md)

**开源文字转语音、语音合成与配音工具，使用你自己的 Azure Speech F0 免费额度。** 在网页中输入文字，选择中文、英文等多语言 Neural 音色，调节语速和音调，直接试听并下载 MP3。支持免安装在线使用，也支持 Windows、macOS、Linux 本地运行。

Free, open-source text-to-speech (TTS) web app powered by your own Azure Speech resource. Chinese and English neural voices, speech synthesis, voiceover, audio preview and MP3 download. Bring your own key (BYOK).

[在线工作台](https://www.zruler.fun/free-tts/workbench/) · [项目首页](https://www.zruler.fun/free-tts/) · [完整中文教程](https://www.zruler.fun/free-tts/guide/index/) · [English guide](https://www.zruler.fun/free-tts/guide/english/) · [下载本地版源码](https://www.zruler.fun/free-tts/downloads/free-tts-0.2.0.zip) · [反馈问题](https://github.com/zty-f/free-tts/issues)

> 软件采用 MIT 许可证。在线版需要你自己的 Azure Speech 密钥和区域，不提供公共密钥。免费使用的前提是有效 Azure 订阅、Speech Free F0 资源以及符合免费配额；不是不限量免费服务。版本 v0.2.0，Azure 规则核对：2026-10-22。

## 61 秒视频：认识 free-tts

从“文案写好了，声音呢？”开始，看看在线语音合成、音色与参数调节、MP3 下载，以及免费额度和密钥隐私。**点击封面，在官网直接播放**；视频包含中文旁白与字幕。

[![播放 free-tts 项目介绍：让下一段文字，先被听见](docs/images/free-tts-cover.jpg)](https://www.zruler.fun/free-tts/#video)

[▶ 在官网观看](https://www.zruler.fun/free-tts/#video) · [直接打开 MP4](https://www.zruler.fun/free-tts/media/free-tts-intro.mp4) · 61 秒 / 1080p

## 这个免费 TTS 工具适合做什么？

- **文字转语音 / 文本转语音**：把文章、故事、通知或学习材料转换为可播放的 MP3。
- **视频配音与旁白**：为短视频、演示、课程和个人作品生成中文或英文配音。
- **多语言朗读**：在当前 Azure 区域支持的普通 GA Neural 音色中选择声音，辅助语言学习。
- **个人语音合成工作台**：使用自己的账号和免费额度，不依赖第三方共享接口。
- **开源学习与自行部署**：了解 Azure TTS REST API、浏览器直连、GitHub Pages 部署和跨平台本地启动。

本项目实现的是 **TTS / text-to-speech（文字 → 语音）**。如果你搜索的是“语音转文字”“音频转文字”或 speech-to-text / STT，那属于语音识别与转写，本项目目前不提供该功能。

## 快速开始：打开网页就能用

已有 Azure Speech 资源的用户，无需下载项目或安装 Node.js：

1. 打开 [在线 TTS 工作台](https://www.zruler.fun/free-tts/workbench/)。
2. 在 [Azure 控制台](https://portal.azure.com/) 打开 Speech 资源，进入「密钥和终结点」，找到 KEY 1 或 KEY 2 及区域代码。
3. 在工作台填写密钥和区域，例如 `eastasia`；区域必须以你的实际资源为准，点击「连接 Azure」。
4. 选择语言与音色，输入一句短文本，点击「生成语音」。
5. 在播放器试听，点击「下载 MP3」。

**在线版的密钥只保存在当前页面内存中。** 提交连接后输入框清空；刷新、离开或关闭页面后需要重新填写。正文和生成结果不主动持久保存，音频请及时下载。详见 [在线工作台教程](docs/online-workbench.md)。

## 没有 Azure 账号？按这个顺序来

| 步骤 | 操作与教程 | 完成标志 |
| --- | --- | --- |
| 1 | [注册 Azure 免费账号](docs/azure-registration.md) · [官方注册入口](https://azure.microsoft.com/free/) | 自己的订阅已激活 |
| 2 | [创建 Speech Free F0](docs/azure-f0-setup.md) · [直接创建 Speech](https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices) | 资源定价层显示 Free F0 |
| 3 | [在线使用（免安装）](docs/online-workbench.md) | 显示「已连接 · 仅本页」 |
| 4 | [生成、试听与下载](docs/usage.md) | 得到可播放的 MP3 |
| 5 | [了解免费额度](docs/free-quota.md) · [试用到期处理](docs/subscription.md) | 清楚配额和订阅条件 |

Speech 创建链接若只打开门户首页，请按教程的「创建资源 → 市场搜索 Speech / 语音」备用路径查找。连接成功不能证明定价层是 F0，仍需在门户中确认。

## 免费额度与费用边界

- free-tts 软件免费、开源；在线版和本地版均不要求你购买服务器，仍需要联网访问 Azure。
- Azure Speech **Free F0** 目前每月包含 **50 万计费字符**，按周期更新，不结转。
- 每个汉字按 **2 个计费字符**计算，纯中文大致接近 25 万汉字；标点、空白及部分 SSML 内容也可能计入，不等于 50 万汉字。
- 在线版和本地版使用同一 Azure 资源时，共用该资源的用量，不会各获得一份配额。
- 在线版每次点击生成都会调用 Azure，不自动重试、不去重缓存；试听或下载已有音频不会再次合成。
- 新账号可能需要银行卡验证。200 美元赠金属于符合资格用户前 30 天的试用权益，不是每月赠送。
- 试用到期后，继续使用通常需要升级订阅；Speech 资源保持 F0。订阅升级和资源升级为 S0 是不同操作。
- **不要把 S0 理解成“每月先免费 50 万字符”**。S0 按其对应价格收费，本项目不会自动升级资源。

免费用量是否够用取决于你的文稿长度和生成频率。完整说明见 [免费额度怎么算](docs/free-quota.md)。当期政策以 [Azure Speech 官方定价](https://azure.microsoft.com/en-us/pricing/details/speech/) 和 [计费字符定义](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech#billable-characters) 为准。

## 功能与使用方式

| 功能 | 在线工作台 | 本地版 |
| --- | --- | --- |
| 中文、英文等多语言普通 GA Neural 音色 | 支持，按当前区域加载 | 支持，按当前区域加载 |
| 语速 0.5×–2×、音调 -20%–+20% | 支持 | 支持 |
| MP3 试听与下载 | 支持 | 支持 |
| 正文计费字符和保守时长估算 | 支持，不是剩余额度查询 | 支持，不是剩余额度查询 |
| 密钥保存 | 仅当前页面内存 | 本机 `.local/config.json` |
| 音频保存 | 当前页面结果，手动下载 | 本机最近 20 段缓存，可重放和下载 |
| 相同内容与参数复用 | 每次生成均请求 Azure | 相同账号、区域、正文和参数可命中缓存 |
| 安装要求 | 现代浏览器，无需 Node.js | Node.js 22+ 与 curl |
| 网络连接 | 浏览器直接访问 Azure | 本机 Node 服务通过 curl 访问 Azure |

每次最多输入 **3,000 个 Unicode 字符**。粗估音频超过 **8 分钟**时提示分段，避免接近 Azure 实时合成单次 10 分钟上限。没有声音克隆、录音转写、字幕时间轴或自动长文合并。

![free-tts 本地版工作台示例，在线版沿用相同视觉风格](docs/images/workbench.jpg)

## 本地版安装与启动（可选）

需要 [Node.js 22+，推荐 24 LTS](https://nodejs.org/zh-cn/download) 和 [curl](https://curl.se/download.html)。没有第三方 npm 运行时依赖，**不需要 npm install**。

下载 [源码 ZIP](https://www.zruler.fun/free-tts/downloads/free-tts-0.2.0.zip) 并全部解压，或使用 Git：

```sh
git clone https://github.com/zty-f/free-tts.git
cd free-tts
npm run doctor
npm start
```

- macOS：也可双击 `启动free-tts.command`。
- Windows 10/11：也可双击 `启动free-tts.bat`；先全部解压再启动。
- Linux：进入项目目录执行 `sh start.sh`。
- PowerShell 阻止 `npm.ps1` 时，使用 `node scripts/start.mjs --open`，无需更改系统执行策略。

浏览器默认访问 [http://127.0.0.1:4318](http://127.0.0.1:4318)。终端保持运行，Ctrl+C 停止。路径移动、端口更换、代理和详细平台说明见 [跨平台安装教程](docs/local-setup.md)。

## 数据与密钥安全

**在线版：浏览器 → 你自己的 Azure Speech → 浏览器播放器与 MP3 下载。**

页面通过 HTTPS 请求头把密钥发送给 Azure，语音请求不经过项目后端。应用不主动把密钥写入 localStorage、sessionStorage、Cookie、URL 或正常日志；没有记住密钥、遥测或账号同步。刷新、离开或关闭后清除连接，后退恢复页面也会清除。「断开并清除密钥」不撤销 Azure 密钥；取消前云端已处理的文字仍可能计入用量。

网页脚本需要读取用户填写的密钥。只在可信项目网站或自己部署的版本使用；浏览器扩展、同源恶意脚本或受控设备仍可能接触页面数据。内存保存不是加密保险箱。

**本地版：本机网页 → 本机 Node 服务 → Azure Speech → 本机缓存与下载。**

密钥明文保存在忽略目录 `.local/config.json`，音频和不含完整正文的元数据位于 `.local/audio/`。Unix 目录权限为 700、文件为 600；Windows 以当前账号目录权限为准。本地服务只监听 127.0.0.1；草稿保存在本地站点的浏览器存储中。

不要分享 `.local/`、`.env`、私人音频或含密钥的截图。泄露后请到 Azure 轮换密钥。完整说明见 [SECURITY.md](SECURITY.md)。

## 自己部署到 GitHub Pages

1. Fork [本项目](https://github.com/zty-f/free-tts)。
2. 在仓库 Settings → Pages 将 Source 设为 **GitHub Actions**，并启用工作流。
3. 推送到 `main` 后，工作流自动测试、构建并发布静态网站。
4. 用户在自己的浏览器填写各自的 Azure 密钥；**不需要把任何 Azure 密钥配置到 GitHub Secrets 或源码中**。

默认仓库名为 `free-tts`，构建路径为 `/free-tts/`。改名或使用独立域名时，按 [自行部署说明](docs/online-workbench.md#自己部署到-github-pages) 配置路径。项目网站和本地版共用 Markdown 教程。自行部署时还可用 `SITE_ORIGIN` 设置站点源地址，供规范链接与站点地图使用；详情见 [检索与部署元数据说明](docs/discoverability.md)。

```sh
npm run build:site
```

输出到忽略目录 `_site/`。GitHub Pages 负责静态网页，Azure 负责语音合成；网站不运行公共 Node 语音 API。

## 常见问题

### 免费 TTS 和“语音转文字”是同一件事吗？

不是。**TTS / Text to Speech 是文字转语音**，也称文本转语音、语音合成或配音；**STT / Speech to Text 是语音转文字**，也称语音识别或音频转写。free-tts 目前只实现前者，不提供录音上传转写。

### 可以直接使用，不注册 Azure 吗？

不可以。本项目采用 BYOK（Bring Your Own Key，自带密钥）。需要自己的有效 Azure 订阅、Speech 资源、密钥与区域，不提供共享密钥或无限免费接口。

### 中文配音和英文 TTS 都支持吗？

支持，具体以所选区域返回的普通 GA Neural 音色列表为准。页面可以选择语言和音色，不同区域的可用性可能不同。

### 刷新后为什么密钥和音频不见了？

在线版按当前页面内存保存，刷新后清除是预期行为，生成后请及时下载。本地版可以保留配置与最近 20 段音频历史。

### 计数显示的就是 Azure 剩余额度吗？

不是。页面按正文估算计费字符，不读取 Azure 实际月度余额。F0 状态、用量与订阅请在 Azure 门户核对。

### 可以完全离线合成吗？

不可以。两种方式都由 Azure 云端生成声音，需要网络；本地版指界面和服务在本机运行。

更多问题见 [故障排查](docs/troubleshooting.md) · [官方入口链接](docs/links.md)。

## 开发、验证与贡献

```sh
npm test
npm run check
npm run package
```

测试使用模拟 Azure，不需要密钥，不会在 CI 产生真实合成请求。GitHub Actions 覆盖 Windows、macOS、Linux 和 Node.js 22/24；浏览器与实际 Azure 的验证范围见 [验证记录](docs/verification.md)。

打包只收集白名单源码，生成 `.local/releases/free-tts-0.2.0.zip`；排除本机配置、缓存、音频和环境变量。不要压缩整个工作目录代替该命令。

[贡献指南](CONTRIBUTING.md) · [安全说明](SECURITY.md) · [更新记录](CHANGELOG.md) · [提交 Issue](https://github.com/zty-f/free-tts/issues) · [MIT 许可证](https://github.com/zty-f/free-tts/blob/main/LICENSE)

本项目与 Microsoft 无隶属关系。MIT 许可适用于项目代码；Azure 服务、音色和生成内容的使用条款分别适用。
