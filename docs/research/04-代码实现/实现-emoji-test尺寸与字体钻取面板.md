# 实现-emoji-test尺寸与字体钻取面板

参见：[[功能-demo展示链]]、[[实现-emoji结果卡片与checker矩阵摘要]]、[[实现-emoji与justification上下文卡片与资产导流]]

## 涉及文件
- `pages/emoji-test.html`

## 之前的问题
`emoji-test` 之前已经有：
- size summary cards
- font summary cards
- 一整块原始 sweep 输出

但它仍然缺少一个真正的页面内钻取层。

用户如果看到：
- 某个 size 是 `variable`
- 某个 font 是 `hot`

下一步仍然得回到长日志里自己肉眼找：
- 到底是哪组 size × font 在出问题
- 是哪些 emoji 在飘
- 这组 correction diff 究竟是什么

也就是说，页面虽然已经能“总结”，还不能“点进去”。

## 这次补的是页内 drilldown 交互
`pages/emoji-test.html` 现在新增了：
- `detailPanel`

并给现有两类卡片都加了交互：
- 点击 size summary card：聚焦该字号
- 点击 font summary card：聚焦该字体
- 同时选中 size + font：进入交叉 drilldown

所以页面第一次能在不离开当前页的前提下，直接展开：
- 某字号在不同字体下的 mismatch 分布
- 某字体在不同字号下的 mismatch 分布
- 某个具体 `size × font` 交叉点上的 emoji diff 明细

## drilldown 直接复用现有 sweep 数据
这层交互没有新跑第二遍测量。

它直接消费页面原本就已经攒下来的：
- `diffsBySizeFont`
- `sizeSummaries`
- `fontSummaries`

所以新的 detail panel 和已有的：
- summary cards
- font cards
- raw output

仍然是同一口径。

## 三层视图现在终于分工清楚了
这次之后，`emoji-test` 页面大致变成三层：
- raw output：保留完整 sweep 日志
- summary/font cards：负责告诉用户哪里值得看
- detail panel：负责把选中的 size/font 立刻拆开

这比之前只有 summary + 长日志更像一个真正的 Phase 3 probe demo，而不只是研究页快照。

## 设计判断
- `emoji-test` 这次补的不是新的统计字段，而是“从摘要落到交叉细节”的交互层。
- 这让页面不再只能回答“哪儿异常”，还能马上回答“异常具体落在哪组 size/font/emoji 上”。
- 对后续继续做 emoji checker 或字体矩阵排查，这个 drilldown 面会比纯文本日志更接近真正的人用诊断页。
