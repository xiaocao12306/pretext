# 实现-assets预览页与demo导流

参见：[[功能-demo展示链]]、[[功能-SVG资产驱动的障碍物绕排]]、[[实现-emoji与justification上下文卡片与资产导流]]、[[实现-SVG资产到wrap-hull投影]]

## 涉及文件
- `pages/assets/index.html`
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`
- `pages/emoji-test.html`
- `pages/demos/justification-comparison.ts`

## 这次补的是哪条缺口
之前仓库里虽然已经有：
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`

但它们还只是“可被引用的裸文件”，不是一个真正能打开、能深链、能解释自己在 demo 链里扮演什么角色的页面。

结果就是：
- `dynamic-layout` / `editorial-engine` 确实在消费这些资产
- `emoji-test` / `justification-comparison` 也已经开始显示 asset bridge
- 但用户一旦顺着 bridge 点到 `/assets/...svg`，看到的还是原始文件，而不是仓库级的资产视图

## `pages/assets/index.html`：把裸 SVG 升成可交互 atlas
这次新增了一个真正的 `/assets/` 页面，做三件事：

### 1. 资产可以被 deep-link 预览
页面支持 query 驱动：
- `?asset=openai|claude`
- `?size=48|72|96|144`

这让 `pages/assets/*` 第一次拥有了和其它 Phase 3 demo 类似的状态面：不是“只能打开文件”，而是可以稳定指向某个资产、某个预览尺寸的页面状态。

### 2. 资产卡会显式解释输入角色
每张资产卡会显示：
- 文件路径
- native size
- `viewBox`
- 当前 preview 尺寸
- 资产在系统里的角色：`logo hull input`

因此这个页面不只是展示 logo，而是把“这些 SVG 会怎样进入 wrap / obstacle demo”明说出来。

### 3. 资产页直接导流到实际 demo 与 report run
每张卡都带着成组的 handoff：
- `dynamic-layout`
- `editorial-engine`
- `emoji-test`
- `justification`

并且每条都有普通 demo 链接和 `report=1` 链接。

这让 `/assets/` 不再是一个静态角落，而变成 Phase 3 页面链里的真正节点。

## `emoji-test` / `justification-comparison`：asset bridge 不再只指向原始文件
这两张页的 `Asset bridge` 以前只会把人带到：
- `dynamic-layout`
- `editorial-engine`
- 原始 SVG

现在额外补了：
- `asset-atlas -> /assets/`

因此 probe 页上的资产桥终于有了一个中间解释层：用户可以先看 atlas，再决定跳去 obstacle demo、report run，还是直接查看原始 SVG。

## 设计判断
- 这一步不是再堆 landing，而是把 `pages/assets/*` 从“文件存在”推进到“页面存在”。
- atlas 和 probe 页之间形成了真正的资产流：`emoji/justification -> asset-atlas -> dynamic/editorial -> source svg`。
- 对 Phase 3 来说，这比继续堆 route card 文案更实，因为它给 `pages/assets/*` 补上了缺失已久的默认打开面和深链状态面。
