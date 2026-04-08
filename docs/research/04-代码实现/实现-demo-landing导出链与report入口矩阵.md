# 实现-demo-landing导出链与report入口矩阵

参见：[[功能-demo展示链]]、[[实现-demo-landing共享preset入口矩阵]]、[[实现-demo矩阵入口与root别名路由]]、[[实现-checker对preset回执的协议校验]]

## 涉及文件
- `pages/demos/index.ts`
- `pages/demos/index.html`
- `pages/accordion.html`
- `pages/bubbles.html`
- `pages/rich-note.html`
- `pages/dynamic-layout.html`
- `pages/editorial-engine.html`
- `pages/emoji-test.html`
- `pages/justification-comparison.html`

## 之前 landing 还缺什么
之前的 demo landing 已经能做两件事：
- 列出 probe-ready demo
- 为部分页面列出 preset deep links

但它仍然更像“入口目录”，还不是“可导出场景矩阵”。

缺口主要有两个：
- 很多卡片只有 preset，没有显式的 `demo path / root alias / report run` 三段导出链
- `accordion`、`bubbles`、`rich-note` 这些后来补齐 root alias 与 checker 的页面，在 landing 上还没享受到同等级入口

结果就是 landing 虽然已经知道 preset 词汇，却还没有把 Phase 3 页面和 Phase 4 checker 的出口一起露出来。

## 这次 landing 直接补成三段导出链
`pages/demos/index.ts` 现在新增了 `buildRouteActions()`，把每组 probe-ready demo 的通用入口固定成三张卡：
- `Demo path`
- `Root alias`
- `Report run`

这三张卡现在覆盖了：
- `accordion`
- `bubbles`
- `rich-note`
- `dynamic-layout`
- `editorial-engine`
- `justification-comparison`
- `emoji-test`

然后每张 demo 仍然继续追加自己的 preset actions。

所以 landing 的 action matrix 不再只是：
- “先点 live demo，再点 preset”

而是变成：
- “先选走哪条导出链，再选哪组 preset”

## 为什么这对 `accordion` / `bubbles` / `rich-note` 特别重要
这三张页之前已经各自补上了：
- root alias
- route cards
- `report=1`
- checker

但这些能力主要还是活在页面内部或脚本里。

这次 landing 把它们真正抬成首页可见入口后，用户从首页就能直接进入：
- `./accordion?report=1`
- `./bubbles?report=1`
- `./rich-note?report=1`

也能直接走：
- `../accordion`
- `../bubbles`
- `../rich-note`

这意味着首页第一次完整承认它们不只是“交互 demo”，还是已经进入统一 report/checker 协议的 probe 页面。

## `report run` 让 Phase 3 和 Phase 4 在 landing 上汇合
这次每张卡的 `Report run` 都明确指向 demo 深页的 `?report=1`：
- `accordion-check`
- `bubbles-check`
- `rich-note-check`
- `dynamic-layout-check`
- `editorial-engine-check`
- `justification-check`
- `emoji-check`

对应的动作不再埋在各页面自己的 route cards 里，而是被提前放到了 landing。

因此 landing 现在第一次具备“脚本消费前的可见导出层”：
- 页面可以从这里手工打开
- checker 也消费同一条 report 协议

## 设计判断
- 共享 preset 只是第一层，真正把 demo 页接进工程验证链的，是 `demo/root/report` 三段导出链一起出现在首页。
- 这一步对 `accordion`、`bubbles`、`rich-note` 尤其关键，因为它们原本更像页面内自解释 demo；现在首页也正式把它们当成 probe/export 节点看待。
- landing 不再只是“去哪里看 demo”，而开始承担“从哪里进入可复现场景与可报告入口”的职责。
