# 实现：dynamic-layout 报告与资产几何探针链

相关文件：
- `pages/demos/dynamic-layout.ts`
- `pages/demos/wrap-geometry.ts`
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`
- `scripts/dynamic-layout-check.ts`
- `scripts/browser-automation.ts`
- `package.json`
- `DEVELOPMENT.md`

上游：[[功能-SVG资产驱动的障碍物绕排]]
并列参考：[[实现-SVG资产到wrap-hull投影]]、[[实现-justification-demo报告与checker链]]

## 这张卡关注什么
这里看的不是 `dynamic-layout` 的视觉风格，而是它怎样从 asset-driven editorial demo 进一步升级成可回收摘要的几何探针。

## 1. 页面新增了 query 驱动的可重复状态
`pages/demos/dynamic-layout.ts` 现在接受：
- `report=1`
- `requestId=...`
- `pageWidth=...`
- `pageHeight=...`
- `openaiAngle=...`
- `claudeAngle=...`

这让自动化脚本第一次能稳定要求这张页：
- 在某个页面宽高下启动
- 在某个 logo 角度下启动
- 然后再汇报状态

而不是只能吃当前浏览器 viewport 或靠人工点击旋转。

而且页面本身也不再只把这些参数当“隐藏测试开关”：
- 当传 `pageWidth/pageHeight` 时，会把 `.page` 收成一个固定 frame
- hint pill 也会直接显示当前场景尺寸、spread/narrow 状态和两个 logo 角度

所以这条参数链已经同时服务 automation 和人工复现。

## 2. report 的重点不是像素，而是流式布局是否还成立
页面回传的摘要集中在三类信号：
- 页面与排版参数：`page`、`typography`
- 文本流状态：headline line 数、left/right body line 数、是否用到右栏、是否吃完整段正文
- 资产几何状态：logo rect、当前 angle、layout/hit hull 点数

这非常符合 `dynamic-layout` 的工程意义。
它最重要的不是“某一帧长什么样”，而是：
- 两栏 handoff 还通不通
- obstacle geometry 还在不在
- 资产投影和正文续排有没有一起跑通

## 3. 报告是在 `commitFrame()` 里生成的
这点很关键。

`dynamic-layout` 没有另写一套离线推导，而是在：
- `buildLayout()`
- `evaluateLayout()`
- `commitFrame()`

这条真实渲染路径上，直接取：
- `headlineLines`
- `leftLines` / `rightLines`
- `bodyCursor`
- `layout.openaiRect` / `layout.claudeRect`

然后组装报告。

因此 checker 看见的是页面真实会提交到 DOM 的那一版几何状态，而不是一套旁路估算。

## 4. `bodyCursor` 被抬升成“正文是否被截断”的信号
以前 `evaluateLayout()` 只返回左右两栏的已投影行。

现在还额外回传 `bodyCursor`，让报告能判断：
- 是否消费完整段正文
- 如果没消费完，停在 `segmentIndex/graphemeIndex` 哪

这一步很值钱，因为它把“看上去排出来了”升级成了“正文流是否完整 handoff”的显式证据。

## 5. 资产几何探针直接复用现有 hull 缓存
报告里没有重新计算一套资源几何，而是直接读取：
- `wrapHulls.openaiLayout`
- `wrapHulls.openaiHit`
- `wrapHulls.claudeLayout`
- `wrapHulls.claudeHit`

再结合当前 `logoAnimations.*.angle` 与 `layout.*Rect` 输出摘要。

也就是说，这条探针守护的正是页面真正拿来绕排和 hit-test 的那组资产几何。

## 6. checker 复用了统一 automation 骨架
`scripts/dynamic-layout-check.ts` 走的还是 repo 统一模式：
- `acquireBrowserAutomationLock()`
- `ensurePageServer()`
- `createBrowserSession()`
- `loadHashReport()`

同时这次继续受益于前一轮对 `ensurePageServer()` 的扩面：
- 临时 Bun 服务器已经能直接暴露 `pages/demos/*.html`
- 所以 checker 可以直接打 `/demos/dynamic-layout`

而且它已经不只会拉“当前窗口”：
- 支持 `--scenarios=1365x900,700x900,...`
- 支持 `--anglePairs=openai:claude,...`
- 页面侧再用 `pageWidth/pageHeight` 明确吃进这些场景

这样脚本就能稳定区分：
- 双栏 spread
- 窄屏单栏
- 低高度截断
- 以及不同 logo 旋转组合下的资产几何状态

而不必依赖浏览器外部窗口管理能力。

## 当前判断
- `dynamic-layout` 现在和 `emoji-test`、`justification-comparison` 一样，进入了“研究页到半正式探针”的过渡带
- 这次更重要的进展在于：`pages/assets/*` 不再只通过视觉效果证明存在，而是第一次通过 report/checker 暴露出稳定的资产几何与流式正文信号
- 这条链证明 asset-driven wrap demo 也可以逐步进入自动化研究面，而不必永远停留在手工观察层
