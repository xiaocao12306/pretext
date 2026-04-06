# 实现：editorial-engine 页内摘要面板与 preset 诊断

相关文件：
- `pages/demos/editorial-engine.html`
- `pages/demos/editorial-engine.ts`

上游：[[功能-demo展示链]]
并列参考：[[实现-editorial-engine报告与orb场景checker链]]、[[实现-editorial-engine-check矩阵摘要]]、[[实现-dynamic-layout页内摘要面板与preset诊断]]

## 这张卡关注什么
这里看的不是 `editorial-engine-check` 怎么汇总矩阵，而是 orb / routing / body cursor 这些 probe 信号怎样真正落回 demo 页面本身。

此前 `editorial-engine` 已经有：
- probe rail
- telemetry panel
- `EditorialEngineReport`

但 telemetry 仍然受 `showDiagnostics` 控制，默认打开页面时，用户看到的仍然主要是视觉效果，而不是场景身份和续排压力摘要。

## 1. 页面现在新增了常显 summary panel
这次在 probe rail 上方补了一块固定的 `summary-panel`。

它和 `dynamic-layout` 最近新增的 summary panel 方向一致：
- probe rail 负责切场景
- summary panel 负责直接告诉用户当前场景的核心状态

所以 `editorial-engine` 现在也开始从“炫 demo”收束到“可读 probe 页面”。

## 2. 这块摘要直接复用 `EditorialEngineReport`
summary panel 不是另一套临时统计。

页面在真实 render/commit 路径里构建 `EditorialEngineReport` 之后，直接调用：
- `syncSummaryPanel(lastCommittedReport)`

因此页面的常显摘要、telemetry、hash report、checker 回收的数据都来自同一套状态。

## 3. 摘要内容对齐 checker 真正在看的信号
面板集中展示的是：
- `preset` 或 `manual`
- 当前 `pageWidth x pageHeight`
- `columnCount` 与 `spread/narrow`
- `body.lineCount` 与列内分布
- body 是否完整消费
- `pullquotes` / `drop-cap`
- `routing.blockedBandCount` / `skippedBandCount` / `avgChosenSlotWidth`
- orb preset、active/paused、live/frozen
- orb bounds

这组字段不是装饰，而是和 `editorial-engine-check` 矩阵摘要同一口径的续排压力信号。

## 当前判断
- `editorial-engine` 现在不再只有 diagnostics 模式下才可读，而是默认打开页面也能看懂当前 preset 的几何状态
- 这让 rich editorial demo 和 checker 之间的边界继续收窄：脚本在看的东西，页面也开始直接显示
- 对 Phase 3 / Phase 4 的衔接来说，这是有价值的，因为 orb demo 第一次具备了默认可见的页面级 probe 面
