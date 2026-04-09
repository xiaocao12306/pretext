# 实现-dynamic-layout资产卡接入atlas深链

参见：[[功能-demo展示链]]、[[实现-assets预览页与demo导流]]、[[实现-assets-atlas报告与checker链]]、[[实现-dynamic-layout资产卡片与几何可视摘要]]

## 涉及文件
- `pages/demos/dynamic-layout.html`
- `pages/demos/dynamic-layout.ts`
- `pages/assets/index.html`

## 这次补的是哪条缺口
前面虽然已经给 `dynamic-layout` 的 asset cards 补过 `source svg`，也单独补出了 `/assets/` atlas，
但两边还没有真正接起来。

结果就是：
- `dynamic-layout` 里看到了 logo 的实时几何摘要
- `/assets/` 里也有 atlas
- 但 asset card 还是只能跳回原始 SVG，不能把当前几何上下文导到 atlas

这让新 atlas 还没有真正回流到现有 obstacle demo。

## 资产卡：从单点源文件跳转变成双链出口
`dynamic-layout` 的每张 asset card 现在不再只放一个 `source svg`，而是补成：
- `asset atlas`
- `source svg`

这样用户在看：
- `angle`
- `rect`
- `origin`
- `layout hull`
- `hit hull`

之后，可以直接切去 atlas 看同一个资产的独立预览态，而不是只能掉回原始文件。

## atlas 深链不是固定死链，而是跟当前几何联动
这次不是简单把两张卡都指向 `/assets/`。

`dynamic-layout.ts` 会根据当前 logo 的实时矩形尺寸，从 atlas 支持的预览档位里选一个最接近的尺寸：
- `48`
- `72`
- `96`
- `144`

然后生成类似：
- `/assets/?asset=openai&size=144`
- `/assets/?asset=claude&size=96`

这意味着 atlas 链接开始携带来自 obstacle demo 的当前几何信号，而不是一个脱离上下文的静态入口。

## 设计判断
- 这一轮推进的不是“再加一个链接”，而是让 `dynamic-layout` 的资产证据链真正接上 atlas 状态面。
- 路径现在变成：`dynamic-layout geometry card -> asset atlas deep link -> source svg`。
- 对 Phase 3 来说，这一步比继续堆单独 atlas 页面更实，因为它把新页面真正拉回了现有的核心 demo 交互里。
