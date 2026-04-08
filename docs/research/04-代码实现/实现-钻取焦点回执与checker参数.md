# 实现-钻取焦点回执与checker参数

参见：[[功能-demo展示链]]、[[功能-自动化批量sweep与发布验收]]、[[实现-emoji与justification钻取深链导出]]、[[实现-emoji-test报告与checker链]]、[[实现-justification-demo报告与checker链]]

## 涉及文件
- `pages/emoji-test.html`
- `pages/demos/justification-comparison.ts`
- `scripts/emoji-check.ts`
- `scripts/justification-check.ts`

## 这次补的是哪条缺口
上一轮已经把 drilldown 焦点接进 route cards：
- `emoji-test` 会导出 `focusSize` / `focusFont`
- `justification-comparison` 会导出 `focusColumn`

但到这里为止，焦点态仍然只存在于：
- URL
- 页内 detail panel

真正的 `report=1` 回执和 Phase 4 checker 还不知道这些焦点参数。这意味着：
- 页面可以深链复现异常
- 脚本却不能确认“页面回来的到底是不是同一个焦点态”

## 页面侧：焦点态进入 report 与上下文卡

### `pages/emoji-test.html`
`EmojiReport` 现在会显式回写：
- `focus.size`
- `focus.fontFamily`

同时页面把这组状态展示到两处：
- summary 文本里新增 `focus ...`
- context / route cards 新增 focus 行，明确当前是 matrix overview、size drilldown、font drilldown，还是单个 `size × font`

这样 `report=1` 不再只是矩阵统计，还会说明“这份统计是在什么 drilldown 视角下采出来的”。

### `pages/demos/justification-comparison.ts`
`JustificationReport` 现在会显式回写：
- `focusColumn`

页面同步补了：
- summary 文本里的 `focus ...`
- context card 的 drilldown badge
- route cards 的 focus 行

因此 `CSS / Hyphen / Optimal` 的单列钻取不再只是视觉高亮，而是进入了可回执、可导出的协议面。

## 脚本侧：checker 终于能验证焦点深链

### `scripts/emoji-check.ts`
脚本新增两个可选 query 驱动：
- `--focusSize=16`
- `--focusFont=Georgia`

它不只把参数拼进 URL，还会校验页面回执里的 `report.focus` 是否与请求一致。也就是说，脚本现在可以断言：
- 页面有没有落到指定 size
- 页面有没有恢复指定 font drilldown

### `scripts/justification-check.ts`
脚本新增：
- `--focusColumn=css|hyphen|optimal`

它同样会校验 `report.focusColumn`。这使 checker 不再只是看 preset / width / indicator，而开始覆盖“当前正在检查哪一列”的 drilldown 协议。

## 设计判断
- 这一轮真正推进的是“页内焦点态进入协议层”，不是再加一个展示组件。
- 深链、summary、report、checker 现在共享同一套焦点词汇，减少了“URL 对、页面看起来也对，但脚本实际上没校验到”的灰区。
- 这一步把 Phase 3 demo 的 drilldown 继续推到了 Phase 4 自动化层，后续如果还要补 `pages/assets/*` 导流或 preset rail，只需要继续沿用同样的回执模式。
