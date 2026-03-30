# 功能：Gatsby 诊断

入口：
- `pages/gatsby.ts`
- `scripts/gatsby-check.ts` / `scripts/gatsby-sweep.ts`（后续脚本研究补充）

相关模块：[[模块-浏览器验证页面]]

## 功能目标
用固定的 `gatsby.txt` 长文页面作为特定 canary，检查 Pretext 与浏览器在真实文章式内容上的换行与高度一致性。

## 页面特点
- 文本源固定：`pages/gatsby.txt`
- 使用 `prepareWithSegments()` 与 `layoutWithLines()`
- 维护更重的 mismatch 结构：
  - `firstMismatch`
  - `firstBreakMismatch`
  - joined-text diff
  - boundary description
  - segment window

## 与 `corpus.ts` 的差异
- `corpus.ts` 是多语料、参数化、广义 deep diagnostic 页
- `gatsby.ts` 是固定文本、固定字体与版式条件下的专项 canary 页

它更像一个专门保留的产品形态回归页，而不是通用 corpus 工作台。

## 重要机制
- 仍使用 `getDiagnosticUnits()` 和 `formatBreakContext()`
- 仍支持 hash / POST 双通道报告
- 但额外关注“拼接后的全文是否仍与原文一致”，以排除 line extraction 本身的 offset 错误

## 当前判断
- Gatsby 页是一个介于 broad sweep 与 corpus deep diagnostic 之间的专项 canary
- 它把“真实文章形态”的回归单独固化下来，避免只靠共享短文本 sweep 评估正确性
