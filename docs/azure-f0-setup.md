# 02 · 创建免费的 Speech F0 语音资源

前提：已经完成 [Azure 注册](azure-registration.md)，并且有有效订阅。目标是创建单独的 Speech 语音资源，定价层选择 **Free F0**。

## 创建入口

优先点击 [直接创建 Azure Speech 资源](https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices)，使用刚注册的同一个账号登录。

直达链接是门户导航链接，微软可能调整入口。如果只回到首页或页面不存在，用下面的备用路径：

1. 打开 [Azure 控制台](https://portal.azure.com/)。
2. 从左上角菜单选择「创建资源 / Create a resource」。
3. 在资源市场里搜索「Speech」或「语音」。注意这是资源市场搜索，不仅是“已有资源”的搜索。
4. 选择发布者为 **Microsoft**、名称为 Speech / 语音服务的产品，点击「创建」。
5. 如果搜索结果引导到 Foundry，查找独立 Speech 资源创建入口。界面名称可能出现 Azure AI Speech 或 Azure Speech in Foundry Tools；最终要确认资源类型是 Speech、定价选项中有 F0。

不要因为看不到 F0 就直接创建 S0、多服务资源或 Foundry 项目；先按下文排查。

## 填写创建表单

| 字段 | 示例或选法 | 注意 |
| --- | --- | --- |
| 订阅 / Subscription | 自己的有效订阅 | 试用订阅也可以，只要状态可用 |
| 资源组 / Resource group | 新建 `free-tts-rg` | 用于归类管理，不是另外购买服务器 |
| 区域 / Region | 在可用列表中选择 | 后面填写的区域代码必须与本资源一致 |
| 名称 / Name | `my-free-tts-001` | 需要符合页面要求且名称未被占用 |
| 定价层 / Pricing tier | **Free F0** | 本教程的免费条件，确认页也要检查 |
| 使用条款或 AI 通知 | 阅读后自行决定是否同意 | 以页面要求为准 |

1. 点击「查看 + 创建 / Review + create」。
2. 重新检查定价层显示 **Free F0**。
3. 点击「创建 / Create」，等待部署完成。
4. 点击「转到资源 / Go to resource」。

本项目不需要虚拟机、数据库、存储账户或专用 GPU。只使用标准 Neural 文字转语音时，先创建 Speech 即可。

## 找到密钥与区域

1. 在 Speech 资源左侧菜单找到「资源管理 → 密钥和终结点 / Keys and Endpoint」。
2. 复制 **KEY 1** 或 **KEY 2** 中的任意一个；它们都是完整密钥，不是 Subscription ID。
3. 找到「Location / Region」，复制区域代码，例如 `eastasia`、`southeastasia` 或 `eastus`。这些只是例子，以本资源实际显示为准。
4. 在 [在线工作台](https://zty-f.github.io/free-tts/workbench/) 填写密钥及区域，点击「连接 Azure」；或在本地版点击「保存并连接」。两者都不需要填写完整 Endpoint 网址。

**成功标志：Azure 资源显示 F0，free-tts 获取到当前区域的音色。获取音色成功只验证连通性，不能由此认定资源就是 F0。**

## 找不到 F0 怎么办

- 检查是否选中了独立 Speech 产品、正确的订阅和目录。
- 查看当前订阅是否已经有 F0 Speech 资源；免费资源数量有限，优先使用已有 F0，不为“增加额度”重复创建。
- 核对资源区域是否可用；必要时根据门户支持情况选择另一个区域。
- 仍无 F0 时，先停止创建，参考官方价格、配额文档或联系微软支持。不要把 S0 当作“先免费 50 万再收费”。

官方依据：[Speech 定价](https://azure.microsoft.com/en-us/pricing/details/speech/) · [配额与限制](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits) · [文字转语音快速开始](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-text-to-speech)。

下一步：[在线使用（免安装）](online-workbench.md)；也可选择 [安装本地版](local-setup.md)。
