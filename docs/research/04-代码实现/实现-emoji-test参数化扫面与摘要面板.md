# 实现：emoji-test 参数化扫面与摘要面板

相关文件：
- `pages/emoji-test.html`
- `scripts/emoji-check.ts`
- `docs/research/03-功能/功能-emoji校正探针与自动化校验.md`
- `docs/research/04-代码实现/实现-emoji-test报告与checker链.md`

上游：[[功能-emoji校正探针与自动化校验]]
并列参考：[[实现-emoji-test报告与checker链]]

## 这张卡关注什么
这里看的不是 emoji correction 本身，而是 `emoji-test` 怎样从“固定样本探针”进一步升级成“可指定实验条件的半正式 sweep 页面”。

## 1. 页面不再把 sweep 条件写死在代码里
`pages/emoji-test.html` 现在除了 `report=1` / `requestId` 之外，还接受：
- `sizes=10,12,16,...`
- `threshold=0.5`

这样同一张页面就能在不改源码的前提下切换：
- 要观察哪些字号
- 以多大偏差阈值定义 mismatch

这比固定样本页更接近真正的研究工具。

## 2. summary panel 把本次实验条件直接打到页面上
页面顶部新增了 summary panel，直接显示：
- `threshold`
- `sizes`
- `emoji` / `fonts`
- `mismatch observations`
- 每个字号的 constant/varies 与 correction diff

这一步很重要，因为参数化之后，如果页面只给最终大块文本，用户反而不清楚“这次到底跑了什么条件”。

## 3. checker 只复用页面，不单独复制 sweep 逻辑
`scripts/emoji-check.ts` 没有重新实现一套字号循环。

它只是把：
- `--sizes=...`
- `--threshold=...`

透传给页面，再读取 hash report。

这延续了 repo 一贯的分工：
- 页面负责真实浏览器探针
- checker 负责批量调用和摘要回收

## 4. 新增的报告字段专门服务“参数化实验”
报告现在除了原有 `sizeSummaries` 之外，还多了：
- `thresholdPx`
- `sizes`
- `totalMismatchObservations`

这些字段的价值在于：
- 让 JSON 输出能自描述
- 让不同 sweep 结果之间可以直接比较，而不必猜测运行条件

## 5. 页面随后又把 `sizeSummaries` 落成了可见结果卡片
`emoji-test` 现在不只在 summary panel 里给出文本摘要，还把每个字号的结论渲染成独立卡片，详见 [[实现-emoji结果卡片与checker矩阵摘要]]。

这一步让参数化 sweep 不再只有“总览 + 原始文本”两层，而开始拥有真正可扫读的字号级显示层。

## 当前判断
- `emoji-test` 现在比之前更像一个真正的参数化实验页，而不是 repo 作者自己记得的一组默认样本
- 它仍不是 accuracy/corpus 那种 standing snapshot，但已经具备“页面显式条件 + checker 透传 + 报告自描述”三件套
