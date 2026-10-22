# 30 天后怎么办

这一步决定教程能否用于长期使用。请区分三个东西：Azure 订阅、200 美元试用赠金、Speech 资源的 F0 定价层。

## 试用赠金到期不等于 F0 政策结束

符合条件的新账号有前 30 天 200 美元试用赠金。它到期或用完后，如果没有升级，试用订阅和服务会被禁用。即使此前只使用 F0，也不能假设停用的订阅会自动继续工作。

F0 每月免费额度是另一项产品规则，微软当前把 Speech 的 50 万计费字符列在持续免费类别中。要继续使用，仍须维持有效订阅和符合条件的 F0 资源。

官方：[免费账号说明](https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account) · [试用到期与费用说明](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/avoid-charges-free-account)。

## 想继续用 F0 时

1. 在 [Azure 控制台](https://portal.azure.com/) 搜索「订阅 / Subscriptions」，打开正在使用的订阅。
2. 查看试用截止时间和订阅状态。
3. 若决定继续，自己阅读按量付费协议、付款信息和升级提示，按微软页面完成订阅升级。
4. 升级完成后回到 **Speech 资源**，确认「定价层 / Pricing tier」仍是 **Free F0**。不要把资源切换为 S0。
5. 检查订阅下有没有额外的虚拟机、数据库、存储等收费资源；订阅升级会改变它们继续运行时的计费条件。
6. 用一小段文字测试，再查看相关用量与费用状态。预算提醒可以辅助检查，但不应当作硬性停费开关。

订阅升级只是让账号可以继续使用 Azure；它不会要求你把 Speech 一并升级为 S0。保持 F0 不等于其他 Azure 服务也都免费。

官方操作：[升级 Azure 免费订阅](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/upgrade-azure-subscription)。

## 不想升级订阅时

可以停止使用，让试用服务按规则停用。先把需要的 MP3 下载保存；项目里的已缓存音频仍能在本机播放，新的云端合成则要求有效订阅。

如果完全不用 Azure，可在核对无其他用途后按官方流程取消订阅。删除本机项目不会自动取消 Azure 订阅；清除本机密钥也不等于删除 Azure 资源。

## 每个月需要重新注册吗

不需要。维护自己的有效订阅及 F0 资源即可，配额按官方周期更新。不要通过轮换账号、密钥或批量创建资源规避限额；更换 KEY 1/KEY 2 也不会重置月度额度。
