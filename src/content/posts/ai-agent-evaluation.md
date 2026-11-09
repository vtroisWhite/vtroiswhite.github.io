---
title: "如何评估 AI 智能体？指标、方法与最佳实践"
description: "从结果、执行轨迹、工具使用和规划四方面评估智能体，并结合指标、基准与人工评分理解实际表现。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-05-23"
tags: ["AI", "AI 智能体", "评估", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/ai-agent-evaluation"
readingOrder: 63
draft: false
---

![如何评估 AI 智能体？指标、方法与最佳实践的原文配图](/images/posts/ai-agent-evaluation.png)

[AI 智能体](/posts/ai-agent/)可能先规划、再调用工具、读取结果并决定下一步。评估需要定义任务的成功条件，再衡量它在实际任务中的结果与执行过程。

## 智能体评估衡量什么

[大语言模型评估](/posts/llm-evaluation/)常关注模型输出。智能体还要对工具调用、动作顺序、延迟、成本、恢复及安全负责。比如智能体给出正确天气预报，但根本没查天气来源，结果可能来自猜测。只看最终文本就发现不了这个问题。

## 四类评估

### 结果评估

检查最终状态是否符合目标。例如，是否订到了星期五从德里飞往班加罗尔且符合要求的最便宜航班。可统计任务成功率、答案正确率和目标完成情况。这种评估容易自动化，也需要清楚地定义[什么算完成](/posts/ai-is-only-as-good-as-our-definition-of-done/)。它很难单独解释失败原因或察觉浪费。

### 轨迹评估

检查行动及其顺序。判断用户明天去班加罗尔是否该带伞时，先调用天气工具查次日天气，读出 70% 的降雨概率，再提出建议。跳过查询直接猜，即使结论碰巧正确，也属于轨迹问题。首先要通过[可观测性](/posts/ai-agent-observability/)记录实际行动。

- **完全匹配。** 每一步与预期序列一致。
- **顺序匹配。** 必须的步骤保持相对顺序，允许额外步骤。
- **无序匹配。** 所有必要步骤都出现即可。
- **[精确率与召回率](https://outcomeschool.com/blog/precision-vs-recall)。** 分别衡量已执行步骤中有用的比例和必要步骤中已完成的比例。

任务可能有多种正确路径，需要为真正重要的步骤设约束。

### 工具使用评估

检查[工具调用](/posts/how-does-function-calling-work-in-llms/)的选型、参数、执行成功率和结果处理，识别不存在的工具。订票时，先调用 `search_flights`，再用匹配结果调用 `book_flight`，最后才发确认邮件。先发邮件或调用未定义的 `cancel_flight` 都可以通过结构化日志发现。

### 规划评估

查看计划是否完整、有序、可行且精简。例如先查符合日期的航班，再按行程挑价格合适的航班，并查找目的地附近且预算内的酒店，最后组装行程。先审查计划可以尽早发现无法执行的步骤，这种评估适用于会先产生计划的[规划与执行智能体](/posts/plan-and-execute-agent/)。

## 常见指标

| 指标 | 衡量内容 |
| --- | --- |
| 任务成功率 | 正确完成的任务比例 |
| 工具调用准确率 | 正确且有用的工具调用比例 |
| 单任务步数 | 完成任务需要多少步 |
| 单任务成本与延迟 | 模型和工具花费的费用及时间 |
| 恢复率 | 遇到工具失败后仍能完成任务的比例 |
| 安全得分 | 是否产生越权或危险动作 |
| 循环检测 | 是否出现重复调用或[无法结束的循环](/posts/ai-agent-loop/) |

成功率应结合延迟、费用和风险判断。许多问题也反映了[循环工程](/posts/what-is-loop-engineering/)的设计质量。

## 公开基准

| 领域 | 基准及用途 |
| --- | --- |
| 函数调用 | BFCL 检查函数与参数选择 |
| 客户服务 | τ-bench 要求按政策使用工具，τ²-bench 增加模拟用户和智能体在同一环境分别采取行动 |
| 编程 | SWE-bench Verified 使用真实项目问题，Terminal-Bench 在命令行环境完成任务，MLE-bench 关注机器学习工程 |
| 通用助理 | GAIA 涉及推理、工具和网页 |
| 网页操作 | WebArena 面向[浏览器智能体](/posts/how-do-browser-agents-work/)，VisualWebArena 关注视觉，BrowseComp 测试开放网络的信息查找 |
| 计算机操作 | OSWorld 测试[桌面操作智能体](/posts/how-do-computer-use-agents-work/)，AppWorld 涉及应用 API |

高分集中在基准上限时，基准区分不同系统的能力会下降。公开基准也可能与产品的实际流程有差距，内部仍要为常见任务和风险场景建立测试。

## 三种执行评估的方法

1. **自动检查。** 比对预期航班号、数据库状态或工具调用记录。适用于有明确标准答案或规则的任务。
2. **[以大模型为裁判](/posts/llm-as-a-judge/)。** 把请求、执行轨迹和最终答案交给模型，按正确性、实用性、效率等维度打分。评分规则要明确，并用人工结果检查偏差。
3. **人工评估。** 审查复杂轨迹、用户体验和安全边界，成本较高，可用于重要样本或上线前检查。

下面是原文给出的裁判提示词示例。

```text
You are an expert evaluator. Read the user request, the agent trajectory, and the final answer.
Rate the agent on a scale of 1 to 5 on the following aspects:
- Did it finish the task?
- Did it use the right tools?
- Did it take an efficient path?
- Was the final answer correct?

Give a short reason for each rating.

User request: {request}
Agent trajectory: {trajectory}
Final answer: {answer}
```

[LangChain](/posts/how-does-langchain-work/)和[LangGraph](/posts/how-does-langgraph-work/)的工作流可结合 LangSmith 查看追踪和评估结果。DeepEval 也提供针对工具使用、智能体和 RAG 的指标。

## 评估实践

- 从真实场景建立可重复的任务集，为关键动作写明完成条件和安全边界。
- 模型在同样输入下[可能给出不同结果](https://outcomeschool.com/blog/how-does-temperature-control-llm-output)，对重要用例运行多次，报告总体表现和波动。
- 固定能固定的依赖，例如用工具响应快照回放，降低环境变化对结果的影响。
- 记录轨迹和成本，检查错误从哪一步开始传播。把生产中见过的故障加入回归用例。
- 将自动检查、模型评分和人工核验组合起来。涉及真实付款或发信的测试应控制副作用。

## 常见问题

- **答案正确，评估也可能失败吗？** 如果轨迹漏掉必要核验、使用了错误工具或存在越权操作，答案正确也不能抵消这些问题。
- **跑多少次比较合适？** 对有波动且影响大的用例增加重复次数，关注通过比例及失败方式。
- **能只看基准分数吗？** 实际应用还需要验证自身的任务、工具、预算和安全边界。
