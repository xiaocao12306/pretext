# 实现：probe 预设词汇共享到页面与 checker

相关文件：
- `pages/probe-presets.ts`
- `pages/emoji-test.html`
- `pages/demos/justification-comparison.ts`
- `scripts/emoji-check.ts`
- `scripts/justification-check.ts`

上游：[[功能-demo展示链]]
并列参考：[[实现-emoji与justification页内probe预设]]、[[实现-demo页内probe-rail与场景快捷入口]]

## 这张卡关注什么
这里看的不是某个 preset 本身，而是 repo 怎样把 probe 场景名称从页面 UI 一路共享到 checker 脚本，避免页面和自动化各自维护一套场景常量。

## 1. `pages/probe-presets.ts` 把 preset 从散落字面量抬成共享资产
这次新增了统一的 preset 定义文件：
- `JUSTIFICATION_PROBE_PRESETS`
- `EMOJI_PROBE_PRESETS`

它不只是“提取常量”，而是显式给这些实验场景命名：
- justification: `default-364` / `narrow-260` / `probe-364` / `wide-520`
- emoji: `default` / `tight` / `coarse` / `dense`

一旦 preset 有了稳定 key，页面和脚本才能真正谈“同一个场景”。

## 2. 页面 rail 现在直接消费共享 preset
`justification-comparison.ts` 和 `emoji-test.html` 都改成直接遍历共享 preset：
- label 来自共享定义
- width / `showIndicators` / `sizes` / `threshold` 来自共享定义
- active 状态再由当前页面状态判断

这样一来，后续如果要调一组实验参数，不必分别改：
- 页面里的 rail
- checker 里的默认矩阵

而是改同一处定义。

## 3. checker 首次开始接受 preset 名称，而不只是裸参数
这次 `scripts/emoji-check.ts` 与 `scripts/justification-check.ts` 都新增了：
- `--presets=...`
- 对应环境变量 `EMOJI_CHECK_PRESETS` / `JUSTIFICATION_CHECK_PRESETS`

而且它们直接通过共享 preset key 找配置，然后再组装 URL。

这意味着自动化终于可以说：
- `--presets=tight,dense`
- `--presets=probe-364,wide-520`

而不是每次重新记一串原始参数。

## 4. 这一步把“可点页面预设”升级成“可脚本引用的场景 vocabulary”
页内 rail 只解决了“人怎么点”；
共享 preset key 解决的是：
- 页面怎么点
- checker 怎么跑
- 文档怎么命名

三者的场景 vocabulary 是否一致。

这是从“有几个方便链接”进一步升级成“仓库内部有稳定实验命名”的关键一步。

## 当前判断
- `probe-presets.ts` 是很小的一层抽象，但它把 Phase 3 demo 和 Phase 4 checker 真正焊在了一起
- 这类共享 preset 词汇后续也值得推广到 `dynamic-layout` / `editorial-engine`，因为它能把场景矩阵从 ad-hoc query 变成 repo 内部可复用的实验语言
