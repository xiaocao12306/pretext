# 实现：checker 对 preset 回执的协议校验

相关文件：
- `scripts/emoji-check.ts`
- `scripts/justification-check.ts`
- `scripts/dynamic-layout-check.ts`
- `scripts/editorial-engine-check.ts`
- `DEVELOPMENT.md`

上游：[[功能-demo展示链]]
并列参考：[[实现-preset-key路由与报告对齐]]、[[实现-checker编排与快照生成]]

## 这张卡关注什么
这里看的不是页面怎样解析 `preset=`，而是 checker 怎样把这层参数面从“能请求”继续推进成“能校验的协议”。

如果脚本只是把 `?preset=...` 发出去，但不检查页面到底回了什么，那么 preset 仍然只是弱约定。

## 1. 四条 checker 现在都会校验 `presetKey`
这次四条脚本都补上了同一类守护：
- `emoji-check`
- `justification-check`
- `dynamic-layout-check`
- `editorial-engine-check`

当脚本走 preset 分支时，它们会要求页面报告中的 `presetKey` 必须等于请求值。

如果不相等：
- 脚本会打印 `protocol error`
- 并把进程标成失败

这说明 checker 现在守护的不只是内容摘要，还开始守护参数协议本身。

## 2. `manual` 与 `preset` 两条路径被明确区分
这次脚本输出也一起做了区分：
- preset 场景会显示页面回执的 `presetKey`
- 非 preset 的自由矩阵仍显示 `manual`

这样一来，日志层面已经能明确分清：
- 这是稳定 preset 场景
- 还是一次手工拼出来的自由诊断 URL

这对后续排查“到底是 preset 映射错了，还是内容指标回归了”很有帮助。

## 3. 这一步守护的是 URL 合同，不是排版正确性本身
`presetKey` 校验失败并不直接说明：
- line count 退化
- routing 压力变化
- emoji correction 假设破裂

它说明的是另一层更基础的问题：
- landing
- 页内 rail
- checker
- 页面 report

这几层对“当前场景是谁”的理解不一致了。

所以它属于协议面失败，而不是内容面失败。

## 4. 为什么这层守护值得单独保留
Pretext 这些 demo/checker 已经越来越像小型研究协议，而不是单纯的 UI 页面。

一旦 repo 开始系统性使用：
- `preset=` URL
- `presetKey` 回执
- landing / rail / checker 共用同一套 key

那么脚本就不该只看内容摘要，也该守住“是不是在谈同一个场景”。

否则后续再扩静态站点、截图、snapshot 或外部分享入口时，很容易出现：
- 看起来跑的是 `spread-1365`
- 实际页面落到的是另一组参数

而脚本却毫无察觉。

## 当前判断
- `preset=` 这条线现在已经不只是 URL 简写，而开始有了 checker 级协议守护
- 这一步让 Phase 4 脚本对 preset 场景的信任度更高，因为脚本不再只假设页面收到了正确场景，而是会显式验证
- 后续如果再扩更多 preset-aware demo，最好沿用同一种 `presetKey` 回执和 checker 失败策略，而不是回到“只要页面没报错就算通过”
