# 实现-bubbles-check矩阵摘要

参见：[[功能-demo展示链]]、[[实现-bubbles场景卡片与shrinkwrap报告导出]]、[[实现-checker对preset回执的协议校验]]、[[实现-导航状态与报告通道]]

## 涉及文件
- `scripts/bubbles-check.ts`

## 这次补的是哪条链
上一轮 `bubbles` 页面已经补上了：
- preset rail
- route cards
- `report=1` hash 回执

但它仍然缺一个真正的 Phase 4 消费端。没有 checker，`Report run` 仍然更像“页面内可点击导出”，还没有进入脚本化矩阵验证链。

这次新增 `scripts/bubbles-check.ts`，把 shrinkwrap demo 正式接进自动化 checker 面。

## 运行模型
脚本复用了现有 browser automation 基座：
- `ensurePageServer()`
- `loadHashReport()`
- `acquireBrowserAutomationLock()`

目标页固定为：
- `/demos/bubbles`

也就是说，checker 消费的不是另一套隐藏页面，而是页面自己已经暴露出来的 `report=1` 协议。Phase 3 demo 和 Phase 4 脚本第一次在 bubbles 这条线上完全复用同一套状态面。

## 两种运行方式
`bubbles-check.ts` 支持两种入口：

### 1. preset 模式
- `--presets=narrow-260,default-340,...`

脚本会逐个运行 `preset=...`，并校验页面回执的 `presetKey` 是否一致。这让页面里的命名场景第一次有了可脚本验证的协议守卫。

### 2. 手工宽度矩阵
- `--widths=260,340,460,...`

这时脚本直接传 `chatWidth=...`，把 bubbles 当成连续 shrinkwrap 压力面来扫，而不是只跑命名 preset。

## 关心的摘要信号
单条输出保留的是 shrinkwrap 真正有意义的几项：
- 当前 `chatWidth`
- 当前 viewport 下的 `maxChatWidth`
- `bubbleMaxWidth`
- `totalWastedPixels`
- `totalSavedWidth`
- `maxSavedWidth`
- `maxCssWidth / maxTightWidth`

这些值回答的是：
- 当前宽度预算下 CSS 还浪费了多少面积
- Pretext 一共收回了多少宽度
- 最极端的单条气泡能收回多少

它们比“页面看起来更紧”更接近可比较的工程信号。

## matrix summary：把单条报告收束成整体 digest
脚本在全部 run 结束后会补 `matrix summary`，集中回答：
- 总 run 数 / ready 数 / error 数
- 实际 `chatWidth` 区间
- 当前浏览器 viewport 允许的 `maxChatWidth` 区间
- `waste` 区间
- `total saved` 区间
- `max saved` 区间

这样 bubbles 不再只是一个只能手拖 slider 的视觉对比页，而是能被脚本回答：
- 哪组宽度浪费面积最大
- 哪组宽度 shrinkwrap 收益最高
- 当前浏览器窗口是否把场景宽度夹窄了

## 设计判断
- `bubbles` 的状态面很小，恰好适合先补一个轻量 checker：只围绕 `chatWidth` 和 shrinkwrap 收益，不额外发明复杂几何或 DOM 诊断字段。
- 这张脚本卡的意义不在于覆盖范围有多广，而在于把一个旧 demo 真正接进 `demo -> report -> checker -> matrix summary` 的完整研究链。
- 这也让 [[实现-demo页内probe-rail与场景快捷入口]] 不再只覆盖“富 demo”，而是开始向更传统的 `prepare()/layout()` 应用 demo 扩展。
