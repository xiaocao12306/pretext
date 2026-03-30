# 模块：Bidi 辅助

上游：[[模块-公共API与Prepared模型]]
下游：[[实现-rich-line-API调用链]]

## 模块定位
`src/bidi.ts` 不是断行引擎，也不是完整 bidi renderer。它的定位非常收敛：
- 只为 rich `prepareWithSegments()` 路径生成 segment-level bidi metadata
- 不参与 `layout()` 行数计算
- 不参与 `line-break.ts` 的断行决策

## 来源与范围
文件头已经说明：
- 代码思路 fork 自 pdf.js，经 Sebastian 的 `text-layout` 路线保留下来
- 目标是“simplified bidi metadata helper”

这意味着它更像“渲染侧辅助元数据”，而不是 Pretext 的主产品逻辑。

## 核心流程

### 1. `classifyChar()`
把字符粗分为 bidi type：
- ASCII / Latin 走 `baseTypes`
- Hebrew 范围直接记 `R`
- Arabic 范围查 `arabicTypes`
- 更宽的阿拉伯扩展区直接记 `AL`
- 其他默认 `L`

### 2. `computeBidiLevels()`
对整段 `normalized` 文本计算 embedding levels。

实现包含：
- 初始方向估计
- W1-W7
- N1-N2
- I1-I2

产物是逐 code unit 的 `Int8Array` level。

### 3. `computeSegmentLevels()`
把逐字符 level 压缩成逐 segment level：
- 输入 `normalized`
- 输入 `segStarts`
- 对每个 segment 取起始位置的 bidi level

最终返回的 `segLevels` 由 `layout.ts` 挂到 rich prepared handle 上。

## 与主引擎的边界

### rich path 才会调用
`layout.ts` 里只有在 `includeSegments` 为真时才会准备 `segStarts` 并调用 `computeSegmentLevels()`。

### fast path 不付费
opaque `PreparedText` 路径不需要这份 metadata，因此：
- `prepare()` 不为 bidi level 付费
- `layout()` hot path 完全不读 `segLevels`

### line breaking 不读 level
这点非常关键。Pretext 当前的断行产品模型是：
- bidi level 为 custom rendering 提供辅助信息
- 但行断仍由 segment 宽度与 break policy 决定

## 当前判断

### 值得借鉴
- 功能边界非常克制，没有把 bidi 复杂度扩散到整个引擎
- rich path 需要 metadata 时才付费，符合 Pretext 的总体成本观

### 限制与风险
- 这是简化实现，不是全量 Unicode bidi 系统
- 它目前更像“够用的 custom rendering 元数据”，后续如果用户land 需求扩大，风险会集中在这里，而不是主 breaker
