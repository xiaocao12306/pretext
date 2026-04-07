# 实现：emoji 与 justification 页内 probe 预设

相关文件：
- `pages/emoji-test.html`
- `pages/demos/justification-comparison.html`
- `pages/demos/justification-comparison.ts`

上游：[[功能-demo展示链]]
并列参考：[[实现-demo页内probe-rail与场景快捷入口]]、[[实现-emoji-test参数化扫面与摘要面板]]、[[实现-justification-demo报告与checker链]]

## 这张卡关注什么
这里看的不是 `emoji-test` 和 `justification-comparison` 的算法本身，而是它们怎样把已有 query 参数面提升成页面内可点击的 probe 预设。

## 1. `justification-comparison` 不再只靠 slider 暗中对应 query
这张页原本已经有：
- `width`
- `showIndicators`

但用户必须自己拖 slider、切 checkbox，或者直接手改地址栏。

现在页面顶部新增了页内 probe rail，直接暴露几组典型场景：
- `Default 364`
- `Narrow 260`
- `Probe 364`
- `Wide 520`

而且 rail 会根据当前 `DemoControls` 高亮激活态。

这很重要，因为它把“repo 脚本里常用的宽度点”第一次显式带进了页面本身。

## 2. `emoji-test` 也从参数化实验页进一步变成了可切场景的实验台
`emoji-test.html` 之前已经支持：
- `sizes=...`
- `threshold=...`

但这些参数仍然更像脚本或作者自己记得的接口。

这次页面里新增了几组 preset：
- `Default`
- `Tight 0.5`
- `Coarse 1.0`
- `Dense 0.25`

每一组都直接映射到：
- 一套固定 `sizes`
- 一条固定 `threshold`

因此 measurement probe 的实验条件第一次在页面 UI 里被结构化暴露了出来。

## 3. 这两张页的 preset 都复用原有 query 面，而不是加第二套本地状态
实现上，两张页都没有引入“只存在于 UI 层”的独立 preset 模型。

它们做的是：
- 根据当前参数/控件状态计算 active preset
- 再生成指向同一张页、附带 query 的快捷链接

这意味着：
- 页面内点击
- 复制链接分享
- checker 直接拼 query

三者共用的是同一套场景 vocabulary。

## 4. 这一步把研究页从“可参数化”推进到“可操作”
参数化页面和可操作实验页之间还隔着一层：
- 前者需要知道有哪些参数
- 后者直接告诉你值得看的场景是什么

这次 `emoji-test` 和 `justification-comparison` 补上的，就是这层“场景选择器”。

## 5. 页面随后又把 preset 选择器扩成了参数卡片
两张页后续都在 rail 下方补上了 preset context cards，详见 [[实现-emoji与justification预设参数卡片]]。

这一步让 preset 不再只是一组名字，而是开始直接携带：
- `emoji-test` 的 `sizes/threshold`
- `justification` 的 `width/showIndicators`

## 当前判断
- `emoji-test`、`justification-comparison`、`dynamic-layout`、`editorial-engine` 现在都在向同一个方向收敛：query 可复现、页面内可切换、摘要可读、脚本可回收
- 这类 probe 预设工作表面上像小 UI，但实际上是在把 Phase 3 demo 和 Phase 4 checker 共享的实验参数显式化
