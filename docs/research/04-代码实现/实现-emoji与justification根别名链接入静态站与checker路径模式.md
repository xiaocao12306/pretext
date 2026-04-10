# 实现-emoji与justification根别名链接入静态站与checker路径模式

参见：[[实现-assets-atlas场景卡与root别名链]]、[[实现-emoji与justification接入assets-atlas场景卡与checker回执]]、[[实现-build-demo-site重写根路径链接]]

## 涉及文件
- `pages/demos/emoji-test.html`
- `pages/justification-comparison.html`
- `scripts/emoji-check.ts`
- `scripts/justification-check.ts`
- `scripts/build-demo-site.ts`

## 这轮补的是哪段缺口
前一轮已经把：
- `emoji-test`
- `justification-comparison`

的 atlas handoff 写进了页面和 checker 回执。

但还有一段链没真正闭环：
- redirect/root alias 页虽然存在
- checker 却只打其中一条路径
- `site:build` 也没有显式产出这两张 redirect 页

这意味着页面自己会展示 `Root path / Demo alias`，但静态产物和 Phase 4 脚本还没有一起承认这两条链都属于正式协议。

## `site:build`：把两张 redirect 页也纳入产物
`scripts/build-demo-site.ts` 这轮新增了两个 entrypoint：
- `pages/demos/emoji-test.html`
- `pages/justification-comparison.html`

对应 target 现在也会产出：
- `site/demos/emoji-test.html`
- `site/justification-comparison.html`

这让静态站终于不只包含真正的 demo 页，还包含和 repo 开发态一致的 redirect/root alias 页。

## 构建解析器：开始接受带 `pages/` 的 source path
因为这次出现了：
- `pages/emoji-test.html`
- `pages/demos/emoji-test.html`

以及：
- `pages/justification-comparison.html`
- `pages/demos/justification-comparison.html`

这样的同名 basename 冲突，`resolveBuiltHtmlPath()` 不能再只靠 basename 猜文件。

现在它会同时尝试：
- 原始 `pages/...` 路径
- 去掉 `pages/` 后的路径
- `outdir/pages/...`
- `outdir/pages/demos/...`

这使构建脚本第一次真正能区分“root alias 页”和“真实 demo 页”两种输出源，而不是碰运气命中同名文件。

## Phase 4：`emoji-check` / `justification-check` 现在校验双路径
两份 checker 都新增了：
- `--pathMode=root|demo`

默认会覆盖两条链：
- `emoji-check`: `/emoji-test` 和 `/demos/emoji-test`
- `justification-check`: `/justification-comparison` 和 `/demos/justification-comparison`

并把 `pathMode` 写进 matrix summary。

这让 Phase 4 不再只是验证“页面本体是否返回正确 report”，而是开始验证：
- root alias 是否仍然能保留参数进入 report
- demo path 是否和 root alias 共用同一套回执协议

## 为什么这步重要
Phase 3 里这些 redirect 页不只是方便入口。

在这个 repo 里，redirect 页其实承担两件事：
- 给 demo landing / root route 提供稳定短链
- 把 query + hash 完整带到真正 demo 页

如果 checker 永远只测一侧，就会出现页面上有卡片、但协议上没承认那条链的情况。

所以这轮真正补的是“路径模式成为被验证的状态”，而不是单纯多了两个 redirect HTML 文件。

## 设计判断
- demo 页的 root/demo 两条路径都已经是页面协议的一部分，就应该进入 checker 默认覆盖，而不是只留给人工点点看。
- 静态站构建必须显式产出 redirect 页，否则 GitHub Pages 侧会比开发态少一层路由。
- 这一步让 `emoji-test` 和 `justification-comparison` 更像 `assets-atlas`：页面、静态站、checker 三端都承认同一组 root alias 链。
