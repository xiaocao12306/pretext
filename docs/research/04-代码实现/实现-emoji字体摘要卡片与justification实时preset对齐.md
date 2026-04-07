# 实现-emoji字体摘要卡片与justification实时preset对齐

参见：[[功能-demo展示链]]、[[实现-emoji结果卡片与checker矩阵摘要]]、[[实现-emoji与justification预设参数卡片]]、[[实现-preset-key路由与报告对齐]]

## 涉及文件
- `pages/emoji-test.html`
- `pages/demos/justification-comparison.ts`

## 这次解决的不是同一种问题
- `emoji-test` 的问题是“页面只有按 size 的结果卡，看不出具体是哪些 font 在拖后腿”。
- `justification-comparison` 的问题是“页面已经是交互 demo，但 `presetKey` 仍然绑定初始化 query，控件变化后摘要和报告会继续冒充旧 preset”。

这两处都属于 Phase 3 demo 里的 probe 证据链缺口：页面已经有数据，但还没有把它以“当前状态可见”的方式投影出来。

## emoji-test：从按 size 摘要扩展到按 font 摘要
- 新增 `fontSummaryGrid`，直接在页内输出每个 font 的摘要卡。
- 每张卡至少展示：
  - 哪些 size 出现 mismatch
  - 累积 mismatch 数
  - 最大绝对 diff
  - correction diff 集合
  - 最坏 emoji 与 size
- 这样读者可以一眼区分：
  - 完全干净的 font
  - 只在少数 size 冒泡的 localized font
  - 在大半个 size 矩阵都持续出问题的 hot font

## emoji-test：preset 也改成按当前参数回算
- 以前 `presetKey` 只在 URL 显式携带 `preset=` 时才成立。
- 现在页面会根据当前 `sizes + threshold` 反推匹配 preset。
- 结果是：
  - rail/card active 态和 report 里的 `presetKey` 语义统一
  - 直接用参数链接命中某个 preset 时，不再被误记成 `manual`

## justification-comparison：交互后不再伪装成旧 preset
- `buildReport()` 改成根据当前 `colWidth + showIndicators` 回算 preset。
- `renderProbeRail()` 与 `renderPresetCards()` 也共用同一套匹配逻辑。
- 这意味着当用户拖动宽度、切换 indicator 开关后：
  - 如果正好落回某个预设，页面会重新点亮对应 preset
  - 如果离开所有 preset，摘要与 report 会明确回到 `manual`

## 设计判断
- demo 页的 `presetKey` 本质上应该表示“当前状态命中了哪个 probe 词汇”，而不是“入口最初来自哪个链接”。
- 对静态页和交互页都一样：页面摘要、navigation report、checker 协议必须共享这层语义，否则同一个 demo 会同时说两套话。
- `emoji-test` 的 font 卡片说明另一个方向：除了 `preset -> parameters`，还需要把 `result -> culprit slice` 可视化，否则矩阵只能停留在 size 维度。

## 对研究网络的意义
- [[实现-preset-key路由与报告对齐]] 现在不再只是 URL 层面的对齐，而是推进到了“交互后的当前状态对齐”。
- [[功能-demo展示链]] 继续从入口矩阵演化成结果矩阵：不仅能切 preset，还能看出 preset 在页面里具体打到了哪一层结构。
