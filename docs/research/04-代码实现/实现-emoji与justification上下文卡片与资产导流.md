# 实现-emoji与justification上下文卡片与资产导流

参见：[[功能-demo展示链]]、[[实现-emoji与justification预设参数卡片]]、[[实现-dynamic-layout资产卡片与几何可视摘要]]、[[实现-demo-landing预设卡片与资产预览]]

## 涉及文件
- `pages/emoji-test.html`
- `pages/demos/justification-comparison.html`
- `pages/demos/justification-comparison.ts`
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`

## 这次补的是哪一层
`emoji-test` 和 `justification-comparison` 之前已经有：
- `probe rail`
- preset cards
- route cards

但页面上下文仍然断成两截：
- 一截是“当前 preset 参数”
- 另一截是“asset-driven editorial demos 在别处存在”

用户如果从这两张探针页往下走，仍然看不见：
- 当前 preset 属于什么实验面
- 这些 probe 页和 `pages/assets/*` 驱动的 demo 链怎样接起来

这次补的是一个中间层：
- `contextCardGrid`

它不是新的结果面，而是把参数语义和 asset handoff 直接摆在页内。

## `emoji-test`：把 sweep 语义和 asset handoff 摆出来
`pages/emoji-test.html` 现在在 preset cards 下方新增三张 context cards：
- `Sweep context`
- `Matrix scope`
- `Asset bridge`

前两张卡直接回答：
- 当前是哪个 `presetKey` 或 `manual`
- 扫了多少 `sizes`
- `threshold` 是多少
- 当前 font / emoji / variable size 的覆盖面是什么

第三张卡则把：
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`

以 preview chip 的形式挂回页面，并顺手给出：
- `dynamic-layout`
- `editorial-engine`

两个相关 demo 入口。

这样 `emoji-test` 不再只是“测量差值矩阵页”，还开始承担 demo 矩阵里的导流节点。

## `justification-comparison`：把列模型说明和 asset bridge 放到 controls 上游
`pages/demos/justification-comparison.html` 与 `pages/demos/justification-comparison.ts` 也新增了同样的 `contextCardGrid`。

但这张页的三张卡片强调的是另一组信息：
- `Preset context`：当前列宽、visualizers 开关、匹配到的 preset
- `Column stack`：CSS / Hyphen / Optimal 三列各自代表什么算法层
- `Asset bridge`：同样把 `pages/assets/*` 和 editorial demos 暴露出来

这一步的意义在于：
- 结果摘要继续留给 `summaryPanel` 和 comparison cards
- 参数与场景语义则提前到 controls 之前

用户不必先拖 slider，再从输出反推这张页到底在比较哪三种布局模型。

## 为什么把 `pages/assets/*` 拉进这两张页
这次不是让 `emoji-test` 或 `justification-comparison` 真去消费 SVG 几何。

更准确地说，是把它们纳入同一条 demo 证据链：
- probe page 解释当前实验条件
- context cards 说明这条路径怎样继续通向 asset-driven demos
- asset chip 直接指回 `pages/assets/*` 的原始输入

因此 `pages/assets/*` 不再只在 `dynamic-layout` / landing 里可见，而开始成为跨 demo 页都能追溯到的输入源。

## 设计判断
- 这次新增的不是 another summary panel，而是页面层的“中间语义层”：把 preset 参数、算法上下文、asset handoff 从输出结果里拆出来。
- `emoji-test` 和 `justification-comparison` 现在和 `dynamic-layout` 的 asset-card 体系更像同一代 demo：不仅能跑，还能说明自己在 demo 矩阵里的位置。
- 对 Phase 3 来说，这比继续堆导航链接更实，因为它直接改善了页面默认打开时的信息密度，也顺手把 `pages/assets/*` 接进了更广的 demo 路由里。
