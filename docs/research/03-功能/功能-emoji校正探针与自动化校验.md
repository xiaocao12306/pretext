# 功能：emoji 校正探针与自动化校验

相关文件：
- `pages/emoji-test.html`
- `scripts/emoji-check.ts`
- `package.json`
- `DEVELOPMENT.md`

上游：[[模块-demo展示页面]]
下游：[[实现-emoji-test报告与checker链]]、[[专题-研究型demo与engine假设外显]]

## 功能定位
这条功能把原本只能人工打开的 `emoji-test.html` 提升成了可脚本消费的 measurement probe。

它现在同时服务两类场景：
- 人工打开页面，看多字体、多字号下 canvas 与 DOM emoji 宽度差
- 自动化通过 `emoji-check` 拉取摘要报告，判断 correction 是否仍保持“按字号近似常量、跨字体近似稳定”

## 页面侧能力
- `pages/emoji-test.html` 仍保留人读输出
- 同时支持 `?report=1&requestId=...`
- 也支持 `sizes=...`、`threshold=...`
- 会回传 machine-readable summary：
  - `emojiCount`
  - `fontCount`
  - `thresholdPx`
  - `sizes`
  - `totalMismatchObservations`
  - `sizeSummaries`
  - `fontIndependentSizes`
  - `variableSizes`
  - `environment`

## 自动化侧能力
- `scripts/emoji-check.ts` 复用了现有 browser automation / hash report 通道
- 可以像其他 checker 一样直接输出摘要
- 支持 `--output=...` 落 JSON
- 支持把 `--sizes=...`、`--threshold=...` 透传给页面
- 目前和 repo 里其他 demo/diagnostic checker 一样，先走 Chrome / Safari 两路

## 工程价值
这使 `emoji-test` 从“研究页”升级成了“可重复探针”：
- 还没变成官方 accuracy gate
- 但已经不再只能靠手动肉眼核对

它正好处在：
- 纯实验页面
- 正式回归快照

之间的中间层。
