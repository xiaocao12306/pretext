# 实现：SVG 资产到 wrap hull 投影

相关文件：
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`
- `pages/demos/wrap-geometry.ts`
- `pages/demos/dynamic-layout.ts`

上游：[[功能-SVG资产驱动的障碍物绕排]]
并列参考：[[实现-demo投影循环与几何路由]]、[[实现-dynamic-layout报告与资产几何探针链]]

## 这张卡关注什么
这里专门看 `pages/assets/*` 怎样一步步变成 `dynamic-layout.ts` 可以消费的 obstacle。

## 1. 资产入口是普通 SVG URL
`dynamic-layout.ts` 先通过 `resolveImportedAssetUrl()` 处理资源路径：
- 绝对 URL 直接返回
- 站点根路径用 `window.location.origin`
- 相对资源用 `import.meta.url`

这样同一份代码既能在本地 demo server 下跑，也能在构建后的静态站点里跑。

## 2. `getWrapHull()` 以“资源 + 参数”作为缓存 key
`wrapHullByKey` 的 key 由这些部分组成：
- `src`
- `mode`
- `smoothRadius`
- `convexify`

这说明 hull 不是单一缓存，而是“同一资源在不同平滑/包络策略下可以并存”。

## 3. 真实轮廓来自 alpha 扫描，不是直接解析 path
`makeWrapHull()` 的策略是：
1. 解码图片
2. 缩放到受控尺寸
3. `drawImage()` 到 `OffscreenCanvas`
4. 读取 `ImageData`
5. 对每个扫描行记录 `lefts[y]` / `rights[y]`

这带来两个工程含义：
- 支持的不只是 SVG path，理论上任何有 alpha 的图像都能进入这条链
- 页面不需要自己处理 SVG path 语法

## 4. hull 先做平滑，再做采样
对每个有效扫描行：
- `mean` 模式取邻域平均边界
- `envelope` 模式取邻域最外层边界

然后：
- 取有限采样行
- 拼成左边界点列 + 右边界反向点列
- 可选 `makeConvexHull()`

所以最终 polygon 不是原始像素边界，而是专门面向文本绕排的压缩近似轮廓。

## 5. 运行时投影分两层

### layout hull
`dynamic-layout.ts` 用 `wrapHulls.openaiLayout` / `claudeLayout`：
- 平滑半径更大
- 更适合当作 text obstacle

### hit hull
同页又单独预载 `openaiHit` / `claudeHit`：
- 平滑半径更小
- 更适合 hover / click 命中

这说明“视觉命中几何”和“文本避障几何”被有意分开了，而不是强迫复用一套轮廓。

## 6. 页面坐标投影再叠加旋转
`transformWrapPoints()` 在两种情况下工作：
- `angle === 0`：直接把 normalized point 缩放到目标矩形
- 旋转时：先转到局部中心坐标，再围绕矩形中心旋转

因此 logo 的 wrap 几何并不是静态矩形贴图，而是会随着交互旋转获得新的 polygon。

## 7. 最终给 line breaker 的不是 polygon，而是 interval
`getPolygonIntervalForBand()` 会对 band 采样多个 y：
- 求 polygon 与 band 的交点 x
- 归并为当前带状的 `left/right`
- 再加上 horizontal / vertical padding

然后 `carveTextLineSlots()` 才把：
- `base interval`
- `blocked intervals`

变成这一行真正可用的 text slot。

这一步很关键，因为它把连续图形问题降维成了 line-breaking 可以消费的一维区间问题。

## 8. `dynamic-layout.ts` 如何消费这些 hull
运行时流程是：
1. 字体与 layout/hit hull 一次性 preload
2. `buildLayout()` 根据 viewport 计算 logo rect
3. `getLogoProjection()` 生成：
   - `openaiObstacle`
   - `claudeObstacle`
   - `hits`
4. `evaluateLayout()` 把这些 obstacle 与 headline/title obstacle 合并
5. `layoutColumn()` 对每个 line band 选 slot，再 `layoutNextLine()`

所以 `pages/assets/*` 最终并不是只在 DOM 里渲染 `<img>`，而是深入到了每一行正文的宽度预算里。

## 当前判断
- 这条实现链很漂亮的一点是：资源解码、轮廓压缩、页面投影、band interval、text slot 被拆成了明确阶段
- 如果以后还要扩展更多 asset-driven wrap demo，最应复用的不是页面代码，而是这条 asset → hull → interval → slot 的管线
- `dynamic-layout` 新接入报告与 checker 后，也说明这条管线不只适合视觉演示，还能向自动化脚本暴露稳定摘要信号
