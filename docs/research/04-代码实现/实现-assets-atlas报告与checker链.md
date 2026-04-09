# 实现-assets-atlas报告与checker链

参见：[[功能-demo展示链]]、[[功能-自动化批量sweep与发布验收]]、[[实现-assets预览页与demo导流]]、[[实现-导航状态与报告通道]]

## 涉及文件
- `pages/assets/index.html`
- `scripts/assets-check.ts`
- `scripts/browser-automation.ts`
- `scripts/build-demo-site.ts`
- `package.json`

## 这次补的是哪条缺口
上一轮虽然已经补出了 `/assets/` atlas 页面，但它还停在“人可以打开看”的阶段：
- 没有 `report=1`
- 没有 hash 回执
- 没有 checker
- dev server / site build 也还没保证把 `pages/assets/index.html` 带进入口链

这意味着它还算不上和其它 demo 同级的 Phase 3 / Phase 4 页面，只能算一个孤立 HTML。

## 页面侧：`/assets/` 进入 report 协议
`pages/assets/index.html` 现在开始支持：
- `report=1`
- `requestId=...`

并会回写一份 `AssetAtlasReport`，其中至少包含：
- `focusAsset`
- `previewSize`
- `assetCount`
- `visibleAssetCount`
- `routeCount`
- `assets[]`

这样 `/assets/` 不再只是视觉 atlas，而是可以像 `emoji-test`、`justification-comparison` 那样，被自动化脚本读取并验证当前页面状态。

## 脚本侧：新增 `scripts/assets-check.ts`
这次新增了独立 checker：
- `scripts/assets-check.ts`
- `package.json` 脚本入口：`assets-check`

它会批量跑：
- `asset=all|openai|claude`
- `size=48|72|96|144`

然后校验页面回执是否真的对应请求值，至少检查：
- `focusAsset`
- `previewSize`
- `visibleAssetCount`
- `routeCount`

这一步很关键，因为它把 `/assets/` 从“静态页面可见”推进到了“脚本可断言协议正确”。

## 运行链：别让页面存在但入口起不来
除了页面和 checker，本轮还补了运行链：

### `scripts/browser-automation.ts`
临时 Bun server 现在会把：
- `pages/assets/*/index.html`

纳入 serve 入口。否则 checker 虽然存在，也会在 `/assets/` 这里直接失效。

### `package.json`
`start` / `start:watch` 同步把：
- `pages/assets/*/index.html`

加入人类开发时的本地入口。

### `scripts/build-demo-site.ts`
静态站点构建现在也会把：
- `pages/assets/index.html`

编进 `site/assets/index.html`

这样 `/assets/` 在 dev、checker、static build 三条路径上终于一致了。

## 设计判断
- 这一轮不是再扩 atlas 视觉，而是把它正式拉进 demo 协议和 checker 体系。
- `/assets/` 现在终于和其它 demo 页一样，拥有“能看、能深链、能回执、能脚本校验”的完整闭环。
- 对 Phase 3 / Phase 4 来说，这比继续堆说明文字更实，因为它把一个新页面真的接进了仓库已有的自动化基础设施。
