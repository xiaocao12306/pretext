# 实现：emoji 与 justification 预设参数卡片

相关文件：
- `pages/emoji-test.html`
- `pages/demos/justification-comparison.html`
- `pages/demos/justification-comparison.ts`

上游：[[功能-demo展示链]]
并列参考：[[实现-emoji与justification页内probe预设]]、[[实现-dynamic-layout资产卡片与几何可视摘要]]

## 这张卡关注什么
这里看的不是 rail 本身有没有按钮，而是 rail 旁边的 preset 参数有没有真正被页面显式解释出来。

此前这两张页已经有：
- 页内 probe rail
- summary panel
- checker 可复用的 preset key

但 rail 仍然更像一排快捷按钮，用户得点进去之后再从 summary 或原始输出里反推：
- 这组 preset 到底对应什么 sizes / threshold
- 这组 preset 到底对应什么 width / indicator 状态

## 1. `emoji-test` 现在把每个 preset 渲染成参数卡片
页面在 rail 下方新增了 `presetCardGrid`。

每张卡片直接显示：
- preset label
- sizes 区间与数量
- threshold

而且卡片本身就是链接，和 rail 一样直接指向相同的 `preset=` URL。

这意味着 measurement probe 不再只有“点按钮试试看”，而是会先把实验条件直接摆在页面上。

## 2. `justification-comparison` 现在也把 preset 变成可读参数卡
`justification-comparison` 的新卡片会直接显示：
- preset label
- width
- indicator on/off

这样段落算法页不再只靠按钮文案区分 `Default 364` / `Probe 364`，而是把真正会改变页面结果的参数写出来。

## 3. 这两张页的卡片仍然复用同一套 preset vocabulary
这些卡片没有引入新的页面状态。

它们只是继续消费：
- `EMOJI_PROBE_PRESETS`
- `JUSTIFICATION_PROBE_PRESETS`

再沿用和 rail 相同的 active 判定与 href 生成逻辑。

所以现在页面形成了更完整的一层：
- rail 负责快速切换
- preset cards 负责解释场景
- summary / comparison cards 负责汇报结果

## 当前判断
- 这一步把 `emoji-test` 和 `justification-comparison` 从“有 preset 按钮的实验页”推进到“场景参数先可见、结果再可读的实验页”
- 它也让这两张页更贴近 `dynamic-layout` 最近新增的 asset cards：不是只给入口，还给上下文
- 对 Phase 3 demo 来说，这是真正的页面可运行增强，而不只是 query 协议或脚本文档补丁
