# 实现：justification demo 报告与 checker 链

相关文件：
- `pages/justification-comparison.html`
- `pages/demos/justification-comparison.ts`
- `pages/demos/justification-comparison.ui.ts`
- `scripts/justification-check.ts`
- `scripts/browser-automation.ts`
- `package.json`
- `DEVELOPMENT.md`

上游：[[功能-段落算法对比与river可视化]]
并列参考：[[实现-导航状态与报告通道]]、[[实现-emoji-test报告与checker链]]

## 这张卡关注什么
这里看的不是 Knuth-Plass 本身，而是 `justification-comparison` 怎样从一个纯交互 demo 接进 repo 现有的 query、hash report 与 checker 编排链。

## 1. demo 页面现在支持 query 驱动的可重复状态
`pages/demos/justification-comparison.ts` 新增了三类 query 输入：
- `report=1`
- `width=...`
- `showIndicators=0|1`

这很关键，因为原始页面虽然能人工拖 slider，但脚本没有稳定办法要求它“用某个宽度、某种显示状态”启动。

## 2. report 不是整页截图，而是段落质量摘要
页面回传的不是像素截图，而是：
- 三栏各自的 `lineCount` / `avgDeviation` / `maxDeviation` / `riverCount`
- `hyphenVsCss`、`optimalVsHyphen`、`optimalVsCss`
- `bestColumns`
- CSS overlay 实测得到的 `cssOverlayRiverCount`

这说明它要守护的不是“长得像不像”，而是“几种段落策略在质量指标上怎么变化”。

## 3. CSS overlay 计数被从纯视觉层抬升成报告字段
`justification-comparison.ui.ts` 以前只负责把 river 标红。

现在它还会返回 `CssOverlaySummary`：
- 如果指标显示开启，就边画边计数
- 如果指标隐藏但脚本要求测量，就只测不画

这是一种很典型的演进：
- UI 层原本只是 projection
- 当研究需要可重复摘要时，UI 层就把“浏览器里真实测到的信号”向上回传

## 4. root redirect 也补上了 query/hash 透传
`pages/justification-comparison.html` 以前是静态 meta refresh。

现在改成脚本跳转：
- 保留 `location.search`
- 保留 `location.hash`

这让顶层入口不再吞掉 `report=1`、宽度参数或后续 hash 状态。

## 5. checker 复用了现有 browser automation 骨架
`scripts/justification-check.ts` 走的仍然是统一链路：
- `acquireBrowserAutomationLock()`
- `ensurePageServer()`
- `createBrowserSession()`
- `loadHashReport()`

也就是说，demo automation 没有另起炉灶，而是继续复用仓库已有的页面到脚本 transport。

## 6. `ensurePageServer()` 的页面面被扩大到 demos
这次还顺手把 `scripts/browser-automation.ts` 里的临时 Bun 服务器从只暴露 `pages/*.html`，扩到：
- `pages/*.html`
- `pages/demos/*.html`
- `pages/demos/*/index.html`

这使自动化脚本终于可以直接命中 demo 页，而不必强依赖根页 redirect。

## 当前判断
- `justification-comparison` 现在和 `emoji-test` 一样，处在“研究页”与“正式验证页”之间
- 它还不是 accuracy/corpus 那种 standing snapshot，但已经具备稳定 query 输入、hash report 输出、checker 拉取三件套
- 这条实现链说明 repo 在逐步把高价值研究页升级成半正式的自动化探针，而不是永远停留在人工观察层
