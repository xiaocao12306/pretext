# 实现：demo 页内 probe rail 与场景快捷入口

相关文件：
- `pages/demos/dynamic-layout.html`
- `pages/demos/dynamic-layout.ts`
- `pages/demos/editorial-engine.html`
- `pages/demos/editorial-engine.ts`
- `pages/demos/index.html`

上游：[[功能-demo展示链]]
并列参考：[[实现-demo矩阵入口与root别名路由]]、[[实现-dynamic-layout报告与资产几何探针链]]、[[实现-editorial-engine报告与orb场景checker链]]

## 这张卡关注什么
这里看的不是 report 协议本身，而是 query 场景怎样在 demo 页内部被显式暴露出来，避免 probe 永远停留在“改 URL 的暗门”状态。

## 1. `dynamic-layout` 和 `editorial-engine` 现在都有页内 probe rail
两张页都新增了固定浮层 rail：
- `Live`
- 固定宽高 probe
- 特定 obstacle / angle preset

而且 rail 不是硬编码静态文案，它会按当前 query 参数判断哪一个 preset 处于激活态。

这一步的重要性在于：
- 页面本身开始承认“这不只是视觉 demo，也是 probe 页”
- 用户不必离开当前页面或手改地址栏就能切换研究场景

## 2. rail 直接复用页面自己的 query 参数面
`dynamic-layout.ts` 的 rail 复用：
- `pageWidth/pageHeight`
- `openaiAngle/claudeAngle`
- `showDiagnostics`

`editorial-engine.ts` 的 rail 复用：
- `pageWidth/pageHeight`
- `orbPreset`
- `animate`
- `showDiagnostics`

也就是说，这次没有引入第二套 UI-only 状态；
rail 只是把原有的 probe query 面变成了页面内的可点击入口。

## 3. 这层实现让“landing page 矩阵”延伸进了 demo 内部
上一层入口页已经能从首页直接点到 probe preset。
这次又把同一思路推进到 demo 页内部：
- 首页负责暴露“有哪些 probe”
- 页内 rail 负责暴露“进来以后怎么继续切场景”

于是 demo 矩阵不再只存在于 landing page。

## 4. 页内 rail 也让 telemetry/readout 更像真正的实验台
`showDiagnostics` 一旦打开，页面上已经会有 telemetry panel。
rail 再接上之后，页面就同时具备了：
- 可切换的 preset
- 可见的摘要面板
- 真实布局结果

这三者拼起来，`dynamic-layout` / `editorial-engine` 都更接近“浏览器里的实验台”，而不是单向展示视频。

## 当前判断
- probe rail 是个很小的 UI 层，但它改变了 demo 页的角色认知：从 showcase 进一步靠近 instrumented lab page
- 这类入口层工作很值得继续做，因为它能让 Phase 3 demo 和 Phase 4 checker 共享同一套场景 vocabulary
