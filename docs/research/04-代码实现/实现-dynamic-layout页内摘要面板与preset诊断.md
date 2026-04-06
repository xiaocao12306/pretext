# 实现：dynamic-layout 页内摘要面板与 preset 诊断

相关文件：
- `pages/demos/dynamic-layout.html`
- `pages/demos/dynamic-layout.ts`

上游：[[功能-demo展示链]]
并列参考：[[实现-dynamic-layout报告与资产几何探针链]]、[[实现-dynamic-layout-check矩阵摘要]]、[[实现-justification汇总面板与preset诊断摘要]]

## 这张卡关注什么
这里看的不是 `dynamic-layout-check` 如何汇总矩阵，而是这些 probe / preset 信息怎样真正回流到 demo 页面本身。

此前 `dynamic-layout` 已经有：
- 页内 probe rail
- 右上角 telemetry panel
- `DynamicLayoutReport`

但 telemetry 默认受 `showDiagnostics` 控制，普通打开 demo 时仍然缺少一块始终可见的页面级摘要。

这意味着用户虽然能点 preset，却还要自己从正文几何里猜：
- 当前到底是不是某个命名 preset
- 正文有没有真正用到右栏
- asset wrap 的 slot 压力大概落在什么区间

## 1. 页面现在新增了常显 summary panel
这次在 `probeRail` 上方补了一块固定的 `summary-panel`。

它不是调试模式专用，也不是隐藏在 `showDiagnostics=1` 后面的 telemetry，而是 demo 默认就会出现的页面级摘要。

这样 `dynamic-layout` 现在和 `justification-comparison` 一样，进入了：
- probe rail 负责切换场景
- summary panel 负责告诉你当前场景发生了什么

的显示结构。

## 2. summary panel 直接吃同一份 `DynamicLayoutReport`
面板内容并不是另外重算的。

页面在 `commitFrame()` 里构建 `DynamicLayoutReport` 后，会立刻调用：
- `syncSummaryPanel(lastCommittedReport)`

因此 summary panel 和：
- hash report
- checker 读取的 report
- diagnostics telemetry

都来自同一份版面状态。

这点很关键，因为它避免了 demo 页面和脚本结果各说各话。

## 3. 摘要内容对齐 checker 当前最关心的几类信号
面板里集中展示的是：
- `preset` 或 `manual`
- 当前 `pageWidth x pageHeight`
- `spread / narrow`
- 正文总行数
- `right-column used / idle`
- `credit slots` 与被选 slot 宽度
- 左右栏 blocked/skipped band
- 左右栏平均 slot 宽度
- OpenAI / Claude logo angle

这组字段明显不是纯视觉信息，而是和 `dynamic-layout-check` 矩阵摘要同一口径的“续排压力信号”。

所以这次不是单纯补一个 UI 盒子，而是把 Phase 4 checker 里的判断面真正下沉到了 Phase 3 demo。

## 当前判断
- `dynamic-layout` 现在不再只是“有 preset rail 的 demo”，而是“页面本身就能读懂 preset 结果的 demo”
- 这让 asset-driven rich demo 第一次具备了普通打开页面即可读的诊断层，而不必先开 `showDiagnostics` 或跑 checker
- 对当前 repo 的 demo/probe 合流方向来说，这一步很值钱，因为它把脚本世界里的矩阵信号真正回灌进了用户可见页面
