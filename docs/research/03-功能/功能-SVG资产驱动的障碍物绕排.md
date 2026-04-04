# 功能：SVG 资产驱动的障碍物绕排

相关文件：
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`
- `pages/demos/wrap-geometry.ts`
- `pages/demos/dynamic-layout.ts`
- `pages/demos/editorial-engine.ts`

上游：[[模块-demo展示页面]]
下游：[[实现-SVG资产到wrap-hull投影]]、[[专题-demo作为rich-API狗粮]]

## 功能定位
这里展示的不是“页面上有 logo 图片”，而是“外部视觉资产可以直接变成文本布局几何约束”。

Pretext 在这条能力链里扮演的角色不是读 SVG，而是：
- 接收用户态给出的 line slot 宽度
- 对连续文本做 streaming layout
- 让页面层可以把任意 obstacle 几何转成可排版的行带约束

## 核心能力

### 1. 资产不是装饰，而是排版输入
`openai-symbol.svg` 和 `claude-symbol.svg` 在 `dynamic-layout.ts` 中先被当成图片显示，再被当成几何输入消费。

这和普通前端页面的区别很大：
- 普通页面：图片只决定视觉层
- 这里：图片的 alpha 轮廓直接决定文本在哪些 band 里不能落字

### 2. 同一资产支持 layout 与 hit-test 两种用途
`dynamic-layout.ts` 预载了两组 hull：
- `openaiLayout` / `claudeLayout`
- `openaiHit` / `claudeHit`

这说明资产几何不只是给 text wrap 用，还给 hover/click 命中测试用。

### 3. obstacle 可以随动画变化
两枚 logo 都支持旋转，文本会围绕旋转后的轮廓重新排版。

这意味着这个功能不是静态 CSS Shapes 替代品，而是动态 obstacle-aware text flow。

### 4. 标题与资产会共同参与正文路由
在 `dynamic-layout.ts` 中：
- logo 通过 SVG hull 进入 obstacle 集
- 标题先被排出来，再转成 `Rect[]`
- 右栏正文同时绕开 logo 和标题矩形

这里形成了一个很重要的用户态排版能力：
- 外部资产可以是 obstacle
- 已排版文本自己也可以在下一阶段变成 obstacle

### 5. `editorial-engine.ts` 证明这不是 logo 专用技巧
`editorial-engine.ts` 用 circle orb 和 pull quote 重复了同一种 band-slot 路由思想。

因此 SVG 资产只是这个功能的一个输入来源，不是唯一形态。

## 对 Pretext API 的要求

这条功能链要求 rich path 满足三件事：
- `layoutNextLine()` 能接受不断变化的 slot 宽度
- cursor 可以跨列、跨区域连续 handoff
- 页面层能够把多个 obstacle 组合后，仍保持 streaming layout 语义

所以它证明的是 rich API 的通用性，而不只是某一页 demo 的视觉巧合。

## 当前判断
- `pages/assets/*` 在这个仓库里已经是“布局几何资产”，不是纯静态资源
- `dynamic-layout` 是最接近产品级证明的页面：它把 SVG 资产、命中测试、连续正文 handoff、动态 obstacle reflow 串成了同一条链
