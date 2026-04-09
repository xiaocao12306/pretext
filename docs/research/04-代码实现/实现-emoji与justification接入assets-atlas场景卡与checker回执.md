# 实现-emoji与justification接入assets-atlas场景卡与checker回执

参见：[[实现-emoji与justification上下文卡片与资产导流]]、[[实现-assets-atlas场景卡与root别名链]]、[[实现-emoji-test报告与checker链]]、[[实现-justification-demo报告与checker链]]

## 涉及文件
- `pages/emoji-test.html`
- `pages/demos/justification-comparison.ts`
- `scripts/emoji-check.ts`
- `scripts/justification-check.ts`

## 这轮补的是哪条断链
前一轮两张 probe/demo 页虽然已经出现了 `Asset bridge`：
- chip 还是直指原始 `svg`
- route cards 还是只覆盖页面自身的 `root/demo/report`
- checker 也不知道这些页已经把 atlas 纳入了实际场景导出链

所以页面层能看见 `pages/assets/*`，但还没有把“当前页面状态如何落到 atlas”讲清楚，更没有把这件事写进回执协议。

## `emoji-test`：把当前 sweep 状态真正投到 atlas
`pages/emoji-test.html` 这轮做了两层补丁：

1. `Asset bridge` 不再只把 chip 指向原始 `svg`
现在 chip 会带着：
- `asset=openai|claude`
- 从当前 `focusSize` 或采样中位 size 推导出来的 `size=48|72|96|144`

直接落到 `/assets/` atlas。

2. route cards 从 3 张扩成 5 张
除了原来的：
- `Root path`
- `Demo alias`
- `Report run`

现在还会额外导出：
- `Asset atlas`
- `Asset report`

也就是说，这张页已经能把“当前 emoji sweep 的 probe 状态”继续导出到 atlas 页面和 atlas checker 路径，而不是停在一层原始资源链接。

## `justification-comparison`：把列宽场景也投到 atlas
`pages/demos/justification-comparison.ts` 做的是同一类事情，但锚点不是 emoji size，而是当前列宽：

- 先取 `colWidth / 4`
- 再吸附到 atlas 允许的 `48/72/96/144`

于是 `justification` 页现在也能把“当前段落布局宽度场景”映射成一个确定的 atlas 预览尺寸。

这使它的 `Asset bridge` 和 route cards 不再只是静态说明，而是和当前 controls 真正绑定。

## Phase 4：checker 现在会校验 atlas handoff
`scripts/emoji-check.ts` 和 `scripts/justification-check.ts` 现在都会额外验证：
- `routeCount === 5`
- `assetPreviewSize` 是否和页面同一套推导规则一致

这一步很关键，因为它把页面新增的 asset-atlas handoff 从“可见 UI”推进成“协议内可验证状态”。

换句话说，这轮不是只加了两个链接，而是把：
- 页面状态
- atlas 导流
- checker 回执

重新绑成同一条链。

## 设计判断
- `pages/assets/*` 不应该继续只作为被动资源目录存在，而应该成为 probe/demo 页当前状态可以落地到的目标面。
- asset 预览尺寸不是手填常量，而是从页面当前实验条件推导出来，这让导流有场景语义。
- checker 校验 `routeCount` 和 `assetPreviewSize` 后，Phase 4 才真正知道页面有没有把 atlas handoff 接通。
