# 实现-accordion-check矩阵摘要

参见：[[功能-demo展示链]]、[[实现-accordion场景卡片与高度报告导出]]、[[实现-checker对preset回执的协议校验]]、[[实现-导航状态与报告通道]]

## 涉及文件
- `scripts/accordion-check.ts`

## 这次补的是哪条链
上一轮 `accordion` 页面已经补上了：
- preset rail
- route cards
- `report=1` hash 回执

但它还缺一个真正的 Phase 4 消费端。没有 checker，`Report run` 仍然只是页面导出入口，而没有进入批量验证链。

这次新增 `scripts/accordion-check.ts`，把 UI height demo 正式接进自动化 checker 面。

## 运行模型
脚本复用了现有 browser automation 基座：
- `ensurePageServer()`
- `loadHashReport()`
- `acquireBrowserAutomationLock()`

目标页固定为：
- `/demos/accordion`

所以 checker 消费的不是隐藏专用页，而是 `accordion` 页面自己已经暴露出来的 `report=1` 协议。

## 两种运行方式
`accordion-check.ts` 支持两种入口：

### 1. preset 模式
- `--presets=shipping-780,research-780,...`

脚本逐个运行 `preset=...`，并校验页面回执的 `presetKey` 是否一致。这让页面里的命名场景第一次有了脚本协议守卫。

### 2. 手工矩阵
- `--widths=520,780`
- `--openIds=shipping,research,mixed`

这时脚本直接传 `pageWidth` 和 `open`，把 `accordion` 当成连续 UI height 压力面来扫，而不只跑命名 preset。

## 关心的摘要信号
单条输出聚焦的是这个 demo 真正稳定的几个 layout 指标：
- `pageWidth`
- `contentWidth`
- `openItemId`
- `openLineCount`
- `maxPanelHeight`
- 每个 item 的 `lineCount / height`

这些值回答的是：
- 当前页面 framing 是否影响了内容宽度
- 当前展开 panel 变成了几行
- 哪个 panel 高度最高
- 各 panel 的高度分布是否稳定

## matrix summary：把单条报告收束成整体 digest
脚本在全部 run 结束后会补 `matrix summary`，集中回答：
- 总 run 数 / ready 数 / error 数
- `pageWidth` 区间
- `contentWidth` 区间
- `openLineCount` 区间
- `maxPanelHeight` 区间

这样 `accordion` 不再只是“点开看看高度对不对”，而是能被脚本直接回答：
- 哪组页面宽度把内容压窄了
- 哪个展开场景最容易把 panel 顶高
- preset 和手工场景是否仍然落在同一高度带

## 设计判断
- `accordion` 的状态面比 `bubbles` / `rich-note` 多一维，但仍然足够稳定，适合先补一个轻量 checker：围绕 `pageWidth + open item` 和高度摘要，不引入额外 DOM 诊断层。
- 这张脚本卡的重要性不在覆盖面，而在于把 `accordion` 也接进 `demo -> report -> checker -> matrix summary` 的完整研究链。
- 这也说明 Phase 4 的 checker 已经开始覆盖“预测驱动 UI 高度”的典型应用，而不再局限于测量页、justification 或重型 editorial demo。
