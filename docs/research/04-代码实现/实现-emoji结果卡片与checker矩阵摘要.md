# 实现：emoji 结果卡片与 checker 矩阵摘要

相关文件：
- `pages/emoji-test.html`
- `scripts/emoji-check.ts`

上游：[[功能-emoji校正探针与自动化校验]]
并列参考：[[实现-emoji-test参数化扫面与摘要面板]]、[[实现-emoji-test报告与checker链]]

## 这张卡关注什么
这里看的不是 emoji correction 的数值本身，而是 `emoji-test` 页面和 `emoji-check` 脚本怎样从“文本摘要”进一步升级成更容易读的 probe 面。

此前已经有：
- summary panel
- probe rail
- `sizeSummaries`
- checker preset 回执

但页面仍然主要靠一大块 monospaced 文本表达 sweep 结果，脚本也还是逐条 preset log。

## 1. 页面现在把每个字号渲染成独立结果卡片
`pages/emoji-test.html` 新增了一块 `sizeSummaryGrid`。

页面在生成 `report` 后，不只刷新顶部 summary，还会把 `sizeSummaries` 渲染成一组卡片，每张卡直接显示：
- 当前字号
- `constant / varies`
- mismatch 数量
- correction diff
- variance
- worst emoji（若存在）

这一步的价值在于，用户不再需要先读完整个 sweep 文本块，才能知道哪几个字号值得看。

## 2. 结果卡片沿用页面已有 report 口径
卡片不是旁路计算。

它们直接消费同一份：
- `report.sizeSummaries`

所以页面现在形成了三层同源输出：
- summary panel：先给本次 sweep 的总览
- size cards：再给字号级结论
- output 文本：最后保留原始明细

这让 `emoji-test` 比之前更像一个真正的实验台，而不是只会吐控制台文本的调试页。

## 3. checker 现在也会给 preset 矩阵一个 digest
`scripts/emoji-check.ts` 在跑完多个 preset 后，会新增一段 `matrix summary`。

它集中汇总：
- 总 run 数 / ready 数 / error 数
- `constantAcrossAllSizes` 的占比
- `totalMismatchObservations` 区间
- `variableSizes` 数量区间
- 各 preset 的 `maxVariance`

因此脚本阅读方式现在从：
- 逐条 preset log

推进到了：
- 先看整体是否还是“近似常量”
- 再看具体哪个 preset 开始变差

## 当前判断
- `emoji-test` 现在不再只是“有 preset 的日志页”，而是“有总览、有字号卡片、有原始明细”的页面
- `emoji-check` 也从“能批量跑 preset”进一步走到“能概览一轮 preset 矩阵”
- 这让 emoji 探针在 Phase 3 demo 和 Phase 4 checker 两边都更接近同一套可读的 probe 面
