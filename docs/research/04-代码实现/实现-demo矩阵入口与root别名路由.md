# 实现：demo 矩阵入口与 root 别名路由

相关文件：
- `pages/demos/index.html`
- `pages/editorial-engine.html`
- `pages/justification-comparison.html`
- `scripts/build-demo-site.ts`
- `DEVELOPMENT.md`

上游：[[功能-demo展示链]]
并列参考：[[实现-justification-demo报告与checker链]]、[[实现-checker编排与快照生成]]

## 这张卡关注什么
这里看的不是某一张 demo 页内部怎么排版，而是 repo 怎样把这些 demo/probe 页面组织成一个可点击、可分享、可静态托管的入口矩阵。

## 1. `pages/demos/index.html` 不再只是“罗列页面名”
现在 landing page 里，`editorial-engine`、`justification-comparison`、`emoji-test` 三张卡都补了 probe-ready 的快捷入口：
- live demo
- 带 query 的 probe preset
- 不同场景宽度/阈值的快速入口

这一步很重要，因为 report/checker 如果只藏在 query 参数里，就仍然是 repo 作者自己知道的暗门。

补成矩阵入口后，demo 页第一次把“可交互展示”和“可重复实验场景”同时摆到首页。

## 2. `editorial-engine` 新增了和 `justification-comparison` 对称的 root alias
`pages/editorial-engine.html` 现在和 `pages/justification-comparison.html` 一样，是一个顶层 redirect：
- 保留 `search`
- 保留 `hash`
- 跳到 `/demos/editorial-engine`

这让本地 dev server 上的入口更一致：
- `/editorial-engine`
- `/justification-comparison`
- `/emoji-test`

而不是只有 `editorial-engine` 还强依赖 `/demos/...` 深路径。

## 3. 静态站点重写逻辑这次补上了“带 query 的 demo 链接”
以前 `scripts/build-demo-site.ts` 的 `rewriteDemoLinksForStaticRoot()` 主要处理：
- `/demos/foo`
- `/emoji-test`

但 landing page 一旦开始放 probe preset，这些链接就会长成：
- `/editorial-engine?pageWidth=...`
- `/justification-comparison?width=...`
- `/emoji-test?sizes=...`
- `/demos/editorial-engine?...`

如果不补 rewrite，GitHub Pages 根目录站点上的这些快捷入口会失效。

所以这次重写逻辑显式升级成：
- 识别 `/demos/<slug>` 且保留 query/hash 后缀
- 识别 `/editorial-engine`、`/justification-comparison`、`/emoji-test` 这些 root alias，并同样保留后缀

这说明 build 脚本现在守护的不只是“静态站点能打开”，而是“带实验参数的快捷入口在静态托管后仍然能打开”。

## 4. 这条链把 Phase 3 页面和 Phase 4 脚本真正接起来了
这次的关键不是又加了一个 redirect 页，而是首页矩阵终于开始直接暴露 Phase 4 所依赖的参数面：
- `editorial-engine` 的 `pageWidth/pageHeight/orbPreset/animate`
- `justification-comparison` 的 `width/showIndicators`
- `emoji-test` 的 `sizes/threshold`

换句话说，脚本不再只是“仓库内部自动化”；它的参数面第一次在 demo 入口页上公开露出。

## 当前判断
- `pages/demos/index.html` 正在从“案例目录”升级成“研究型 demo 控制台”
- root alias + query-preserving rewrite 这条链补上后，`editorial-engine`、`justification-comparison`、`emoji-test` 的 probe 场景终于能同时在 dev server 和静态站点上稳定分享
- 这类入口级工作很容易被误判成 UI 小修，但它实际上是 demo 页面和 checker 脚本闭环的一部分
