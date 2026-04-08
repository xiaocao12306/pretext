# 实现-justification-comparison列钻取面板

参见：[[功能-demo展示链]]、[[实现-justification结果卡片与checker矩阵摘要]]、[[实现-justification-check手工矩阵与indicator维度]]

## 涉及文件
- `pages/demos/justification-comparison.html`
- `pages/demos/justification-comparison.ts`

## 之前的问题
`justification-comparison` 之前已经有：
- comparison cards
- 三栏画布
- summary panel

但这些层之间还是断开的。

用户虽然能看见：
- 哪一列 `best avg`
- 哪一列 `best river`

却仍然缺一个“点进去看这列到底怎么赢/怎么输”的交互层。

结果就是 comparison cards 更像只读 scoreboard，还不是可钻取的 demo 控制面。

## 这次补的是列级 drilldown
页面现在新增了：
- `detailPanel`

而且 comparison cards 不再只是静态卡片：
- 点击 `CSS`
- 点击 `Hyphen`
- 点击 `Optimal`

都会把对应列设成焦点列。

进入焦点态后，页面会同时做三件事：
- comparison card 标成 selected
- 三栏正文里高亮对应 column，并把其它列 dim 掉
- 在 `detailPanel` 展开该列自己的指标和与其它列的 delta

## detail panel 里现在能直接看什么
焦点列卡会显示：
- lines
- avg deviation
- max deviation
- rivers
- total height

旁边再给两张比较卡，按当前列是谁来切换：
- `CSS` 焦点：`Hyphen vs CSS`、`Optimal vs CSS`
- `Hyphen` 焦点：`Vs CSS`、`Optimal vs Hyphen`
- `Optimal` 焦点：`Vs CSS`、`Vs Hyphen`

这样“这列好不好”第一次不再只靠肉眼扫三栏底部 metric box，而是被集中收束到页内 drilldown。

## 这层交互和现有 report 仍然同口径
detail panel 没有额外重算。

它直接消费已有 `JustificationReport` 里的：
- `columns.*`
- `comparisons.*`
- `bestColumns.*`

所以 comparison cards、detail panel、summary panel、checker 读到的仍然是同一份页面 report。

## 设计判断
- 这次补的不是 another summary，而是把 `comparisonGrid` 从只读结论层推进成真正的 drilldown 入口。
- `justification-comparison` 现在更像 `emoji-test` 最近那种可钻取 probe 页：先给结论，再允许用户点进具体列。
- 对 Phase 3 demo 来说，这种列焦点面比继续堆静态指标更有用，因为它直接把“算法差异”做成了页面交互。
