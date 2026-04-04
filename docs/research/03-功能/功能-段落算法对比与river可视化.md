# 功能：段落算法对比与 river 可视化

相关文件：
- `pages/justification-comparison.html`
- `pages/demos/justification-comparison.html`
- `pages/demos/justification-comparison.ts`
- `pages/demos/justification-comparison.data.ts`
- `pages/demos/justification-comparison.model.ts`
- `pages/demos/justification-comparison.ui.ts`

上游：[[模块-demo展示页面]]
下游：[[实现-justification-demo报告与checker链]]、[[专题-研究型demo与engine假设外显]]

## 功能定位
这张 demo 的核心不是“展示三栏排版”，而是把三种段落算法放到同一份文本、同一宽度、同一指标体系下直接比较：
- 浏览器 CSS justification
- Pretext greedy + hyphenation
- Pretext global optimal line breaking

它把 Pretext 从“预测浏览器结果”推进到了“用同一套段落原语试验不同排版策略”。

## 三条比较路径

### 1. CSS / Greedy
- 直接让浏览器做 `text-align: justify`
- 再用 `Range` 逐空格测宽，额外叠加 river overlay

这条路径给出的是浏览器原生行为与视觉后果。

### 2. Pretext + Hyphenation
- 用 `prepareWithSegments()` 先准备文本
- 在词内按 prefix / suffix / exception 插入 `SOFT_HYPHEN`
- 再用 greedy `layoutNextLine()` 逐行排版

这条路径展示的是“只改变 hyphenation 策略，结果能好多少”。

### 3. Pretext + Optimal
- 先建立 `breakCandidates`
- 再通过 DP 搜索全局最小 badness
- badness 同时惩罚：
  - 过松 spacing
  - 过紧 spacing
  - river
  - hyphen break

这条路径证明 Pretext 的 prepared segments 能承载浏览器默认段落算法之外的全局最优实验。

## river 可视化为什么重要
很多排版比较只给最终段落图，不给诊断层。

这页不一样：
- CSS 栏使用 DOM `Range` 逐空格抽取矩形并上色
- Pretext 两栏则在 canvas 绘制时同步标出 spacing quality
- 三栏同时显示 line count、avg deviation、max deviation、river count

因此它不是纯视觉 demo，而是“段落质量实验台”。

## 新增的探针能力
这页现在不再只是人工拖 slider 的视觉实验页，也能作为可脚本消费的摘要探针：
- `/demos/justification-comparison?report=1&width=...&showIndicators=0&requestId=...`
- 页面会回传三栏 metrics、列间 delta、`bestColumns`
- 同时把 CSS overlay 实测到的 `riverMarkCount` 单独带回

这使它从“肉眼看 river”前进到了“可以批量回收同一组段落质量摘要”。

## 与主库的关系
- 主库本身没有公开 Knuth-Plass API
- 但 demo 证明：
  - `prepareWithSegments()` 给出的 segments 足够稳定
  - `layoutNextLine()` 不会阻碍用户态构造另一套段落算法

这让 Pretext 的产品边界更清楚：
- 库默认保持浏览器近似行为
- 更激进的段落质量策略可以在用户态叠加，不必塞回核心引擎

## 当前判断
- `pages/justification-comparison.html` 顶层只是 redirect，真正有价值的是 `/demos/justification-comparison` 里的算法对比与指标面
- 它现在还多了一层半正式探针能力：不是 accuracy gate，但已经能被 `justification-check` 拉取摘要
- 这张页面最重要的不是 Knuth-Plass 名字本身，而是它证明了“Pretext 能做段落实验平台，而不只是浏览器结果复刻器”
