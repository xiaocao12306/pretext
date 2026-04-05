# 实现：dynamic-layout 根路由与入口对齐

相关文件：
- `pages/dynamic-layout.html`
- `pages/demos/index.html`
- `scripts/build-demo-site.ts`
- `DEVELOPMENT.md`

上游：[[功能-demo展示链]]
并列参考：[[实现-demo矩阵入口与root别名路由]]、[[实现-dynamic-layout报告与资产几何探针链]]

## 这张卡关注什么
这里看的不是 `dynamic-layout` 的几何逻辑，而是它怎样补齐根路由别名，让本地 dev 入口、首页矩阵入口和静态站点入口保持一致。

## 1. `dynamic-layout` 现在也有了顶层 alias
这次新增了 `pages/dynamic-layout.html`：
- 保留 `search`
- 保留 `hash`
- 统一跳到 `/demos/dynamic-layout`

这让它和下面两张页终于进入同一入口形态：
- `/editorial-engine`
- `/justification-comparison`

之前 `dynamic-layout` 还只能直接打 `/demos/dynamic-layout`，入口层明显不对称。

## 2. 首页 probe 链接也一起切到了根入口
`pages/demos/index.html` 上原本指向 `/demos/dynamic-layout?...` 的 live/probe 链接，现在全部切到：
- `/dynamic-layout`
- `/dynamic-layout?pageWidth=...`

这意味着首页矩阵开始把 `dynamic-layout` 当成一个独立入口页看待，而不是内部 demo 深链。

## 3. 静态站点重写规则同步认识了 `/dynamic-layout`
`scripts/build-demo-site.ts` 之前已经会把：
- `/editorial-engine`
- `/justification-comparison`
- `/emoji-test`

改写到静态站点根目录的相对链接。

这次又把 `/dynamic-layout` 加进去，所以 landing page 上新的根路由 probe 链接在静态站点形态里也不会断。

## 4. 这一步补的是入口对称性，不是单纯 redirect 文件
表面看这轮只是：
- 多一个 redirect HTML
- 多一条 rewrite 规则

但更重要的是，它把 `dynamic-layout` 拉回到了和 `editorial-engine` / `justification-comparison` 同一级的 demo 入口面。

这样一来：
- 首页矩阵
- 本地 dev server
- 静态站点

三处对 `dynamic-layout` 的入口表达终于统一了。

## 当前判断
- `dynamic-layout` 的 root alias 补上后，repo 的高价值 probe demo 基本都具备了“根入口 + demo 深页 + query 场景”的统一入口结构
- 这类入口对齐工作虽然不触碰版式算法，但它直接影响 Phase 3 demo 的可发现性和 Phase 4 checker 场景的可分享性
