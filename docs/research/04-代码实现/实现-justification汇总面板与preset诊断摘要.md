# 实现：justification 汇总面板与 preset 诊断摘要

相关文件：
- `pages/demos/justification-comparison.html`
- `pages/demos/justification-comparison.ts`
- `pages/demos/justification-comparison.ui.ts`

上游：[[功能-demo展示链]]
并列参考：[[实现-justification-demo报告与checker链]]、[[实现-preset-key路由与报告对齐]]

## 这张卡关注什么
这里看的不是 checker 怎么收报告，而是 `justification-comparison` 页面本身怎样把 preset 身份和段落质量摘要显式打到可见 UI 上。

此前这张页虽然已经有：
- 三栏 metrics
- query/report/checker

但页面级诊断仍然比较分散：
- preset 身份不显式
- 比较结论分布在三栏局部 metric box
- CSS overlay river 计数只在 report 里集中出现

## 1. 页面新增了顶部 summary panel
这次在 probe rail 下方补了一个 monospace 摘要面板。

它不是新的交互控件，而是把当前场景最重要的判断集中起来展示：
- `preset` 还是 `manual`
- 当前列宽
- indicator 开关状态
- best avg/max/river 对应哪一栏
- CSS river overlay 计数
- 三栏 line count
- `hyphen-vs-css` / `optimal-vs-css` 的核心 delta

这样用户不用来回扫三栏底部的 metric box，先看一块区域就能知道当前场景的大意。

## 2. 这块摘要走的就是页面真实报告口径
summary panel 不是另一套单独计算。

页面会在 CSS overlay 同步完成后，直接用同一份 `JustificationReport` 口径来刷新摘要：
- `buildReport(...)`
- `syncSummaryPanel(...)`

因此页面可见摘要和 hash report / checker 读到的数据是同源的。

这点很重要，因为它避免了：
- 页面给人看的结论一套
- checker 拉走的报告另一套

## 3. 为什么它要等 CSS overlay 同步后再更新
`justification-comparison` 的页面级摘要里包含了 `cssOverlayRiverCount`。

而这个数字来自：
- CSS 段落真实 DOM
- overlay 同步阶段的 Range 测量

所以 summary panel 必须等到 `syncCssRiverOverlay()` 完成之后再刷新。

这说明它展示的不是“初步估计”，而是带真实 CSS overlay 结果的最终摘要。

## 当前判断
- `justification-comparison` 现在不只是三栏对比 demo，也开始具备和 `emoji-test` / `dynamic-layout` / `editorial-engine` 类似的页面级诊断面板
- 这块 summary panel 让 preset 身份、段落质量结论和 report 口径第一次在页面上对齐，用户不必靠阅读三份局部 metric 再自己拼结论
- 对 Phase 3 来说，这属于 demo 可见输出增强；对 Phase 4 来说，它又继续巩固了“页面看到什么，checker 就在同一口径上拉什么”
