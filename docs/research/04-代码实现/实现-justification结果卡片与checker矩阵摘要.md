# 实现：justification 结果卡片与 checker 矩阵摘要

相关文件：
- `pages/demos/justification-comparison.html`
- `pages/demos/justification-comparison.ts`
- `scripts/justification-check.ts`

上游：[[功能-demo展示链]]
并列参考：[[实现-justification汇总面板与preset诊断摘要]]、[[实现-justification-demo报告与checker链]]

## 这张卡关注什么
这里看的不是 `justification-comparison` 的断行算法本身，而是页面和 checker 怎样从“单块摘要 + 长日志”进一步升级成更容易扫读的 probe 面。

此前这张页已经有：
- 顶部 summary panel
- 三栏 metric box
- checker 可回收 report

但页面仍然要靠用户自己在三栏底部来回比对，脚本也只是一条条 preset log。

## 1. 页面现在把三栏结论收成独立比较卡片
`justification-comparison` 新增了一块 `comparisonGrid`。

页面在刷新 `JustificationReport` 后，会把：
- CSS
- Hyphen
- Optimal

三条路径分别渲染成独立卡片。

每张卡直接显示：
- line count
- avg/max deviation
- river count
- 相对 CSS 的 delta
- 以及该列是否拿到 `best avg/max/river`

这样用户不需要先扫画布再回到三组 metric box，页面自己已经把“这一轮谁更好”收束成一层可读比较面。

## 2. 卡片和 summary panel 仍然走同一份 report
这些结果卡片并不是额外计算。

页面在：
- `buildReport(...)`

之后，直接同时刷新：
- `summaryPanel`
- `comparisonGrid`

因此页面可见比较面、hash report、checker 读取的数据还是同一口径。

## 3. checker 现在也会给 preset 运行一层矩阵摘要
`scripts/justification-check.ts` 在跑多个 preset 后，新增了 `matrix summary`。

这一层会先汇总：
- width 区间
- CSS river 区间
- `Δhyphen avg` 区间
- `Δoptimal avg` 区间

然后再逐个 preset 输出：
- `best avg`
- `best river`
- `Δhyphen`
- `Δoptimal`

因此脚本现在不只是在打印单条 report，而开始适合快速看一轮 preset 矩阵的大致走势。

## 当前判断
- `justification-comparison` 现在不再只是“三栏画面 + 底部数字”，而是拥有页面级比较卡片
- `justification-check` 也从“能跑 preset”进一步走到“能概览 preset”
- 这让这条段落算法 demo 更接近 `emoji-test`、`dynamic-layout`、`editorial-engine` 最近收敛出的同类 probe 形态
