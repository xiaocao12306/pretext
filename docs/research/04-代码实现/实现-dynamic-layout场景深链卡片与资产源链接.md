# 实现-dynamic-layout场景深链卡片与资产源链接

参见：[[功能-demo展示链]]、[[实现-dynamic-layout资产卡片与几何可视摘要]]、[[实现-dynamic-layout与editorial预设上下文卡片]]、[[实现-preset-key路由与报告对齐]]

## 涉及文件
- `pages/demos/dynamic-layout.html`
- `pages/demos/dynamic-layout.ts`
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`

## 场景卡：把当前 dynamic-layout 状态导出成可跑深链
之前 `dynamic-layout` 已经有：
- probe rail
- preset cards
- asset geometry cards

但它还缺和 `emoji` / `justification` 一样的“当前场景导出层”。这次新增 `route-card-grid`，把当前页面状态直接导出成三张卡：
- `Demo path`
- `Root alias`
- `Report run`

### 导出规则
- 命中现有 preset 时：
  - 导出 `preset=...`
- 未命中 preset 时：
  - 导出 `pageWidth + pageHeight + openaiAngle + claudeAngle + showDiagnostics`

这意味着点击 logo 改变角度、或在 framed 模式里改变尺寸后，页面里能立刻拿到准确的复现链接，而不是只保留最初入口。

## 资产流：把 geometry card 接回真实 SVG 源
之前 asset cards 只展示：
- angle
- rect
- origin
- hull point counts

它们说明了“资产如何参与布局”，但没有把这层几何摘要接回真实输入文件。

这次每张 asset card 都新增 `source svg` 链接，分别指向：
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`

这样页面里的 asset 证据链终于闭环：
`SVG source -> imported URL -> transformed hull -> geometry card -> scene route`

## 设计判断
- `dynamic-layout` 的交互状态比 `emoji` / `justification` 更重，因为它不仅有 preset，还有可旋转资产和 framed viewport。没有场景卡时，复现路径并不完整。
- 资产卡里的 `source svg` 链接不是装饰，而是把 `pages/assets/*` 从“静态文件存在”提升成“页面中可追溯的输入源”。
- 这和 [[实现-SVG资产到wrap-hull投影]] 的关系很直接：后者解释计算链，这次的页面改动则把那条计算链暴露成可点击、可复现的 UI 证据。
