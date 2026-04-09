# 实现-assets-atlas场景卡与root别名链

参见：[[功能-demo展示链]]、[[实现-assets预览页与demo导流]]、[[实现-assets-atlas报告与checker链]]、[[实现-demo矩阵入口与root别名路由]]

## 涉及文件
- `pages/assets.html`
- `pages/assets/index.html`
- `scripts/assets-check.ts`
- `scripts/build-demo-site.ts`

## 这次补的是哪条缺口
虽然 `/assets/` atlas 已经有：
- deep-link 状态
- `report=1`
- checker

但它还缺其它 demo 早就有的两层能力：
- 页内 `demo path / root alias / report run` 场景卡
- 明确的 root alias 页面

所以 atlas 之前还不像 `emoji-test`、`justification-comparison` 那样，拥有完整的页面导出链。

## 页面侧：atlas 也有 route cards 了
`pages/assets/index.html` 现在新增 route-card grid，直接导出三段链：
- `Demo path`
- `Root alias`
- `Report run`

这些卡会保留当前状态：
- `asset=openai|claude|all`
- `size=48|72|96|144`

这让 atlas 不再只是“页面里有几组 demo handoff pills”，而开始把自身当前状态也导出成稳定链接。

## `pages/assets.html`：补齐 root alias
这次新增了：
- `pages/assets.html`

它会把：
- `/assets`

稳定重定向到：
- `/assets/`

并保留 `search + hash`。

这让 atlas 终于进入了 repo 现有的 root alias 体系，而不是孤立地只活在目录页形式里。

## 脚本侧：`assets-check` 现在能跑 root alias
`scripts/assets-check.ts` 新增：
- `--pathMode=demo|root`

因此 checker 不再只验证 `/assets/` 深页，也可以直接验证 `/assets` 这条 alias 链。

这使 atlas 的 Phase 4 协议从“单一路径可校验”推进到“导出链两端都可校验”。

## 静态站：root alias 也会进入构建产物
`scripts/build-demo-site.ts` 现在会额外产出：
- `site/assets.html`

这保证 atlas 的 root alias 不只在 dev server 下存在，也会在静态站构建后继续存在。

## 设计判断
- 这一轮不是继续扩 atlas 内容，而是把它补成和其它 demo 一样的场景导出节点。
- atlas 现在也具备：`deep link -> route cards -> root alias -> report run -> checker`。
- 这让 `pages/assets/*` 不再只是 Phase 3/4 的配角，而真正进入统一的 demo/export/checker 词汇表。
