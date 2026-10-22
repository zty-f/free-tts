# 03 · 安装与跨平台启动

目标：在自己的电脑打开 free-tts 网页。它是本机网页服务，不需要购买服务器，也不需要把项目上传到网站平台。

## 下载安装包或源码

打开 [项目首页](https://zty-f.github.io/free-tts/)，点击「下载 v0.1.0 源码」，或直接 [下载源码 ZIP](https://zty-f.github.io/free-tts/downloads/free-tts-0.1.0.zip)。也可以在 [GitHub 仓库](https://github.com/zty-f/free-tts) 点击「Code → Download ZIP」。

如果已安装 Git，可使用：

```sh
git clone https://github.com/zty-f/free-tts.git
cd free-tts
```

两种方式任选其一。源码 ZIP 不包含账号密钥，首次启动需要配置自己的 Azure 资源。

1. 将源码 ZIP 解压到自己方便找到的位置，例如桌面的 `free-tts` 文件夹。
2. Windows 必须先「全部解压」，不要在压缩包预览里双击启动。
3. 打开文件夹，应看到 `package.json`、`server.mjs`、`public`、`docs` 和启动文件。
4. 路径可以包含空格；移动整个目录后仍可使用。

## 安装 Node.js

打开 [Node.js 官方下载页](https://nodejs.org/zh-cn/download)，选择 **24 LTS** 的安装程序。最低要求为 Node.js 22；不要按旧教程安装已停止维护的 Node 20。

- Windows：选择与你系统架构对应的安装程序，普通电脑通常为 x64；按安装器正常安装并保留 PATH 选项。
- macOS：选择对应 Apple 芯片或 Intel 的安装程序；若使用版本管理器，请先激活受支持的 Node 版本。
- Linux：按官网对应发行方式安装受支持版本，并安装 curl。

安装后重新打开终端，执行：

```sh
node --version
npm --version
```

Node 应显示 v22 或更新的受支持版本。这个项目没有第三方 npm 运行时依赖，不需要执行 npm install。

## 检查 curl

macOS 和现代 Windows 通常自带 curl。

macOS / Linux：

```sh
curl --version
```

Windows PowerShell：

```powershell
curl.exe --version
```

使用 `.exe` 可以避免旧版 PowerShell 中同名别名的干扰。找不到 curl 时可参考 [curl 官方下载页](https://curl.se/download.html)。Linux 例如 Debian/Ubuntu 可以用系统包管理器安装：

```sh
sudo apt-get update
sudo apt-get install curl
```

## macOS 启动

双击 `启动free-tts.command`。若没有执行权限，可以进入项目目录在终端运行：

```sh
sh start.sh
```

你也可以先执行 `chmod +x 启动free-tts.command start.sh` 再双击。遇到 macOS 安全提示时，请按系统官方流程核验来源，不需要关闭系统安全保护。

若使用 nvm，Finder 启动的终端可能没有载入你的版本管理器；从已经能运行 `node --version` 的终端使用 npm start 即可。

## Windows 启动

双击 `启动free-tts.bat`，它会检查 Node 并启动服务。也可以在项目文件夹中打开“终端”，执行：

```powershell
node scripts/start.mjs --doctor
node scripts/start.mjs --open
```

如果 PowerShell 提示 `npm.ps1` 不允许执行，使用上面的 node 命令，或 `npm.cmd start`，无需降低系统执行策略。

## 通用终端方式

先进入你实际解压的项目目录。下面只是相对目录示例，不要复制维护者的个人绝对路径：

```sh
cd free-tts
npm run doctor
npm start
```

浏览器应打开 [本地工作台](http://127.0.0.1:4318)。没自动打开时，手动访问这个地址。终端必须保持运行，按 Ctrl+C 停止；下次再次启动即可。默认只接受本机访问，同一 Wi-Fi 下的其他设备不能直接访问。

## 端口被占用

如果已有同一版本 free-tts 在运行，会复用已有服务并打开页面。其他软件占用 4318 时，换个端口：

macOS / Linux：

```sh
PORT=4319 npm start
```

Windows PowerShell：

```powershell
$env:PORT='4319'
node scripts/start.mjs --open
```

Windows 命令提示符 CMD：

```bat
set PORT=4319
node scripts/start.mjs --open
```

随后访问 4319 端口。浏览器草稿按网站地址区分，换端口后可能看不到原来的草稿，但项目目录中的密钥和音频缓存还在。

## 网络或代理

只有连接 Azure 时需要外网；本机网页本身不需要远程字体或 CDN。curl 会继承启动终端中的 HTTPS_PROXY、https_proxy、ALL_PROXY 等标准代理变量。

例如你已经有自己的代理软件并提供本机 HTTP 代理端口，在终端设置代理后从同一个终端启动。以下 7890 仅为示例，应换成自己的端口：

```sh
HTTPS_PROXY=http://127.0.0.1:7890 npm start
```

PowerShell 示例：

```powershell
$env:HTTPS_PROXY='http://127.0.0.1:7890'
node scripts/start.mjs --open
```

已运行的服务不会自动继承后来设置的环境变量，需要先停止再重启。项目不附带代理服务，也没有要求用户安装 `proxy_on` 这类私人命令。

下一步：[连接与生成第一段语音](usage.md)。
