# 项目介绍、双语文档与检索信息

free-tts 的介绍面向实际提供的功能：免费 TTS、文字转语音、文本转语音、语音合成、中文配音、英文 TTS、Neural voices、MP3 下载、Azure Speech F0 与 BYOK。

语音转文字、speech-to-text、STT 和音频转写只在 FAQ 中用于解释区别，不作为已实现功能或 GitHub Topics。项目不提供录音转写、声音克隆或无限免费共享接口。

## 各处的信息如何维护

| 位置 | 内容 | 更新方法 |
| --- | --- | --- |
| README.md | 完整中文介绍、快速开始、免费条件和 FAQ | 编辑文件并推送 |
| README.en.md | 英文介绍、Azure 配置、使用与部署说明 | 与中文版同步修改 |
| GitHub About | 简短的中英文项目简介、网站入口 | 仓库页面 About 设置 |
| GitHub Topics | 相关英文主题，如 text-to-speech、tts、azure-speech | 仓库页面 About 设置；最多 20 个 |
| package.json | 项目描述、keywords、repository、homepage | 编辑文件；不会自动同步 About |
| site/index.html | 用户可见的首页介绍、功能说明与 FAQ | 编辑文件并部署 |
| lib/seo.mjs 与构建脚本 | 标题、摘要、canonical、分享卡片、语言关联及站点地图 | 修改后重新构建 |

英文网页入口：[English project guide](https://www.zruler.fun/free-tts/guide/english/)。详细配套教程和工作台界面当前为中文，英文 README 明确说明这一点。

## 网页地址与部署边界

规范地址使用实际对外的 `https://www.zruler.fun/free-tts/`，避免把跳转前的 github.io 地址作为另一套规范页面。每个页面都有自己的 canonical；中文总说明页与英文说明页有相互对应的 zh-Hans、en 和默认语言链接。

项目的 [sitemap.xml](https://www.zruler.fun/free-tts/sitemap.xml) 包含首页、在线工作台和全部教程页，不包含密钥、音频缓存或源码下载文件。它位于项目路径下，不修改博客根目录的 robots.txt、域名或 DNS。

Fork 或更换域名时，在 Pages 工作流的构建步骤设置实际地址：

```yaml
- run: npm run build:site
  env:
    SITE_ORIGIN: https://your-name.github.io
    SITE_BASE_PATH: /free-tts/
```

使用独立域名根目录时，SITE_ORIGIN 写域名源地址，SITE_BASE_PATH 设为 `/`。同步检查 README 和页面正文中的官网绝对链接。源地址不包含路径、用户名、密码、查询或片段。

## 已配置不等于已经被搜索引擎收录

GitHub 可以按仓库名、简介、Topics 和 README 查找项目。网站标题、自然语言正文、可点击链接和中英文页面关联有助于搜索引擎理解内容；不堆砌关键词，也不靠 meta keywords 声称能提高 Google 排名。

站点地图已生成不代表已向 Google 或百度提交，也不保证收录或排名。站点所有者如已有 Search Console 权限，可在自己的账号提交上述 sitemap URL；本次不创建搜索平台账号或更改域名验证设置。

官方参考：[GitHub Topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics) · [GitHub 仓库搜索](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories) · [Google 标题说明](https://developers.google.com/search/docs/appearance/title-link) · [多语言页面](https://developers.google.com/search/docs/specialty/international/localized-versions) · [Google 支持的元信息](https://developers.google.com/search/docs/crawling-indexing/special-tags)。
