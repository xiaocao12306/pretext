# 实现：emoji-test 报告与 checker 链

相关文件：
- `pages/emoji-test.html`
- `pages/report-utils.ts`
- `shared/navigation-state.ts`
- `scripts/emoji-check.ts`
- `scripts/browser-automation.ts`
- `scripts/build-demo-site.ts`
- `pages/demos/index.html`

上游：[[功能-emoji校正探针与自动化校验]]
并列参考：[[实现-导航状态与报告通道]]

## 这张卡关注什么
这里看的不是 emoji correction 理论本身，而是 `emoji-test` 如何从单页实验 HTML 接进仓库现有的报告、命令、静态站点链路。

## 1. 页面仍保留人读输出，但新增 machine-readable report
`pages/emoji-test.html` 现在：
- 默认仍渲染原来的文字摘要
- 当带 `?report=1` 时，会：
  - 发布 `loading` / `measuring`
  - 生成摘要 report
  - 用 hash 发布 report

这样它就能被 `loadHashReport()` 消费，而不需要单独发明一套 transport。

## 2. 摘要结构刻意小于 accuracy/corpus
这页没有回传所有 emoji × font × size 的原始明细，而是回传：
- 每个字号的 mismatch 数
- correction diff 集合
- 是否跨字体恒定
- 最大方差与 worst emoji
- 当前 `thresholdPx`
- 当前 `sizes`
- 总 mismatch observation 数

这是因为它的目标是“验证 correction 假设是否还站得住”，不是保存完整实验数据库。

## 2.5. 页面现在支持参数化 sweep，而不是写死一组样本
`pages/emoji-test.html` 不再只能跑固定字号表。

现在页面和 checker 都能透传：
- `sizes=10,12,16,...`
- `threshold=0.5`

再配合页面顶部新增的 summary panel，就能把“这次探针到底用什么条件跑的”直接显示出来。

## 3. `OffscreenCanvas` 现在有 DOM canvas fallback
原始页面直接依赖 `OffscreenCanvas`。

现在改成：
- 有 `OffscreenCanvas` 就用它
- 没有则退回普通 `<canvas>`

这是一个真正的页面实现改进，因为探针页的价值就是尽量能在更多浏览器环境里自己跑起来。

## 4. checker 复用现有自动化骨架
`scripts/emoji-check.ts` 基本复用了现有 checker 模式：
- `acquireBrowserAutomationLock()`
- `createBrowserSession()`
- `ensurePageServer()`
- `loadHashReport()`

这说明它不是特例脚本，而是被接进了仓库统一的 checker 编排体系。

## 5. demo 入口与静态站点也接上了
- `pages/demos/index.html` 新增了 emoji probe 卡片
- `scripts/build-demo-site.ts` 现在会构建 `pages/emoji-test.html`
- 静态站点根页上的 `/emoji-test` 链接也会被改写成相对路径

因此这次不是只加了一个 CLI，还把页面的 discoverability 和 site build 链路一起补上了。

## 6. 页面和 checker 现在又补了更可读的结果层
`emoji-test` 页面后续又新增了字号结果卡片，`emoji-check` 也新增了 preset 矩阵摘要，详见 [[实现-emoji结果卡片与checker矩阵摘要]]。

这一步让这条链不只“能出 report”，而开始更适合人直接扫读一轮 preset/sweep 结果。

## 当前判断
- 这条实现链很典型地展示了仓库的演进方式：
  - 先有研究性页面
  - 再加最小报告协议
  - 再加 checker
  - 最后接进 demo site 与命令面
- `emoji-test` 现在仍不是正式快照资产，但它已经从孤立探针变成了半正式的自动化研究工具
