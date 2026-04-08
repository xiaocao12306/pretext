# 实现-rich-note-check矩阵摘要

参见：[[功能-demo展示链]]、[[实现-rich-note场景卡片与inline-flow导出]]、[[实现-checker对preset回执的协议校验]]、[[实现-导航状态与报告通道]]

## 涉及文件
- `scripts/rich-note-check.ts`

## 这次补的是哪条链
上一轮 `rich-note` 页面已经补上了：
- preset rail
- route cards
- `report=1` hash 回执

但它还缺一个真正的 Phase 4 消费端。没有 checker，`Report run` 仍然只是页面导出入口，而没有进入批量验证链。

这次新增 `scripts/rich-note-check.ts`，把 inline-flow demo 正式接进自动化 checker 面。

## 运行模型
脚本复用了现有 browser automation 基座：
- `ensurePageServer()`
- `loadHashReport()`
- `acquireBrowserAutomationLock()`

目标页固定为：
- `/demos/rich-note`

所以 checker 消费的不是隐藏专用页，而是 `rich-note` 页面自己已经暴露出来的 `report=1` 协议。

## 两种运行方式
`rich-note-check.ts` 支持两种入口：

### 1. preset 模式
- `--presets=narrow-320,default-516,...`

脚本逐个运行 `preset=...`，并校验页面回执的 `presetKey` 是否一致。这让页面里的命名场景第一次有了脚本协议守卫。

### 2. 手工宽度矩阵
- `--widths=320,516,680,...`

这时脚本直接传 `bodyWidth=...`，把 `rich-note` 当成连续 inline-flow 压力面来扫，而不只跑命名 preset。

## 关心的摘要信号
单条输出保留的不是 DOM 节点数量，而是 demo 真正稳定的几个 layout 指标：
- `bodyWidth`
- `maxBodyWidth`
- `noteWidth`
- `lineCount`
- `noteBodyHeight`
- `chipCount`
- `fragmentCount`

这些值回答的是：
- 当前宽度预算是否被 viewport 限制
- note 变成了几行
- inline-flow 在这一宽度下碎成了多少 fragment
- atomic chip 数量是否稳定

## matrix summary：把单条报告收束成整体 digest
脚本在全部 run 结束后会补 `matrix summary`，集中回答：
- 总 run 数 / ready 数 / error 数
- `bodyWidth` 区间
- 当前 viewport 下 `maxBodyWidth` 区间
- `noteWidth` 区间
- `lineCount` 区间
- `noteBodyHeight` 区间
- `fragmentCount` 区间

这样 `rich-note` 不再只是“拖 slider 看 chips 是否保持整体”，而是能被脚本直接回答：
- 哪组宽度导致 fragment 数明显上升
- 哪组宽度把行数推高了
- 当前浏览器窗口是否把预设宽度压缩掉了

## 设计判断
- `rich-note` 的状态面同样很小，适合先补一个轻量 checker：围绕 `bodyWidth` 和 inline-flow 摘要，不额外引入 DOM 级 debug dump。
- 这张脚本卡的重要性不在覆盖面，而在于把 `inline-flow` demo 接进 `demo -> report -> checker -> matrix summary` 的完整研究链。
- 这也说明 Phase 4 的 checker 不再只服务 `emoji`、`justification`、`dynamic-layout`、`editorial-engine` 这些重型页面，已经开始向更纯粹的 rich text demo 扩展。
