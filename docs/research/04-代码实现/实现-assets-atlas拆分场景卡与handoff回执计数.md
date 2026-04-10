# 实现-assets-atlas拆分场景卡与handoff回执计数

参见：[[实现-assets-atlas报告与checker链]]、[[实现-assets-atlas场景卡与root别名链]]、[[实现-emoji与justification接入assets-atlas场景卡与checker回执]]

## 涉及文件
- `pages/assets/index.html`
- `scripts/assets-check.ts`

## 这轮补的是哪条语义缝
`assets-atlas` 之前已经进入 report/checker 链，但它的 `routeCount` 还混着两种不同东西：
- 页内场景卡数量
- 向其它 demo 页导流的 handoff 数量

这在页面还能勉强看懂，在脚本里就不够干净了。checker 只能知道“有 4 条 route”，却不知道这是：
- `Demo path / Root alias / Report run` 这种 atlas 自身导出链
- 还是 `dynamic-layout / editorial / emoji / justification` 这种外部 handoff

## 页面侧：把两种 route 数拆开
`pages/assets/index.html` 现在把 atlas 的导出面拆成两层明确字段：
- `scenarioRouteCount`
- `handoffRouteCount`

其中：
- `scenarioRouteCount` 对应 route card grid 自己那 3 张卡
- `handoffRouteCount` 对应 atlas 往其它 demo 投出去的 4 条 demo handoff

这样 `AssetAtlasReport` 就不再用一个模糊的 `routeCount` 把两种概念压在一起。

## 可见 UI 也同步说清楚
这轮不是只改 hash report。

页面的 summary panel 现在直接显示：
- `scenario cards 3`
- `handoff routes 4`

`contextGrid` 也新增了 `Route protocol` 卡，明确列出：
- scenario cards
- handoff routes
- checker paths

也就是说，页面可见摘要和 checker 回执终于在同一层口径上说话。

## Phase 4：`assets-check` 开始校验双计数
`scripts/assets-check.ts` 不再只校验一个 `routeCount === 4`。

现在会分别断言：
- `scenarioRouteCount === 3`
- `handoffRouteCount === 4`

matrix summary 里也会拆开打印：
- `scenario`
- `handoff`

这让 checker 第一次能区分：
- atlas 自己有没有把 `demo/root/report` 场景卡导出来
- atlas 往其它 demo 页的 handoff 有没有丢

## 设计判断
- `routeCount` 这种混合字段在页面刚起步时够用，但一旦 atlas 既有本页导出卡，又有跨页 handoff，就应该拆开。
- 这一步看起来只是计数字段重命名，实际上是在把 `pages/assets/*` 从“有报告的页面”推进到“协议语义清楚的页面”。
- 对后续 Phase 4 来说，这会让 assets checker 更容易继续吸收更多场景，而不需要在单个模糊字段上反复猜含义。
