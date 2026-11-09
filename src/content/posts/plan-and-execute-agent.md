---
title: "什么是规划与执行智能体？它如何工作？"
description: "通过人口对比示例拆解规划器、执行器、重新规划与停止条件。"
publishedAt: "2026-11-09"
readingOrder: 46
originalPublishedAt: "2026-05-04"
tags: ["AI", "AI 智能体", "LLM", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/plan-and-execute-agent"
draft: false
---

![Outcome School 原文封面](/images/posts/plan-and-execute-agent.png)

规划与执行智能体是一类先规划、再逐步执行的[AI 智能体](/posts/ai-agent/)。它在开始时拟定整体步骤，执行期间遇到意外结果时才修改计划。开发者也可以先用[提示词链](/posts/how-does-prompt-chaining-work/)把固定流程串起来，再按需增加自动规划能力。

## 模式与组成

[智能体循环](/posts/ai-agent-loop/)可以用多种方式组织。[ReAct](/posts/react-agent/)根据每次观察选择下一步，[反思智能体](/posts/reflection-agent/)围绕审稿和修订运行，[Agentic RAG](/posts/agentic-rag/)围绕检索和判断证据运行。规划与执行模式把全局规划和具体操作拆开。

```text
+--------------------------------------------------------+
|                     The Agent Loop                     |
|                                                        |
|   User Task                                            |
|       |                                                |
|       v                                                |
|   +---------+                                          |
|   | Planner |  --->  Plan: [Step 1, Step 2, Step 3]    |
|   +---------+                                          |
|       |                                                |
|       v                                                |
|   +----------+         +-------+                       |
|   | Executor |  <--->  | Tools |                       |
|   +----------+         +-------+                       |
|       |     ^                                          |
|       v     | (updated plan, if needed)                |
|   +------------+                                       |
|   | Re-Planner |                                       |
|   +------------+                                       |
|       |                                                |
|       v                                                |
|   Final Answer (when the task is done)                 |
+--------------------------------------------------------+
```

- **规划器**读懂用户目标，产出顺序合理、可以逐项执行的计划。复杂规划通常交给能力较强的模型。
- **执行器**只处理当前步骤，可以用更小的模型选择工具，或把一步交给一个 [ReAct 子智能体](/posts/ai-subagents/)。
- **工具**提供查询、计算、数据访问等操作，并定义参数。
- **[记忆](/posts/ai-agent-memory/)** 记录目标、计划、已执行步骤及结果。
- **重新规划器**读取当前状态，判断继续、改计划还是结束。它可以复用规划器的模型。

## 规划、执行与重新规划

起初由规划器将任务拆成一组小步骤。执行器每完成一步，就把结果写回状态。如果结果符合预期，继续下一步。出错或新信息推翻原先的假设时，重新规划器保留已完成工作，修改剩余步骤。步数预算、重新规划触发条件和退出都属于[循环工程](/posts/what-is-loop-engineering/)。

原文以“印度人口比日本多多少？”为例。规划器先写下四步。

```text
1. Search for the current population of India.
2. Search for the current population of Japan.
3. Compare the two numbers.
4. Return the country with the larger population and the difference.
```

执行器先分别查询两国人口。在示例数据中，印度为 14.3 亿，日本为 1.24 亿。计算器执行 `1,430,000,000 - 124,000,000` 得到 `1,306,000,000`，即约 13.06 亿人。重新规划器看到每步都有可用结果，结束任务。如果一个来源返回不同统计口径，系统可以插入核对步骤，然后再计算。

## 与 ReAct 的区别

| 方面 | ReAct | 规划与执行 |
| --- | --- | --- |
| 规划时机 | 每次获得观察后决定下一步 | 先规划整体，遇到变化时修订 |
| 调用方式 | 每一步都由模型重新决策 | 一次较大的规划调用，加上各步的执行调用 |
| 适应性 | 每轮都可以改变方向 | 通过重新规划处理变化 |
| 成本与延迟 | 长流程的反复推理开销可能较大 | 可预见步骤可用更小的模型执行 |
| 可见过程 | 可以逐轮检查行动与观察 | 一开始就能查看总体计划 |
| 适用任务 | 路径不清楚的探索 | 阶段较清楚的多步工作 |

```text
ReAct Agent - the LLM thinks at every step:

  +---------+   +--------+   +-------------+
  | Thought |-->| Action |-->| Observation |--+
  +---------+   +--------+   +-------------+  |
       ^                                      |
       +-- (loop until final answer) ---------+


Plan-and-Execute Agent - the LLM thinks once, then runs:

  +------+   +--------+   +--------+   +--------+
  | Plan |-->| Step 1 |-->| Step 2 |-->| Step 3 |--> Final Answer
  +------+   +--------+   +--------+   +--------+
                              ^
                              +-- (re-plan only if a step fails)
```

## 常见故障

1. **计划遗漏或顺序错误**。给规划器可用工具、好计划示例和明确目标，让它写成小而具体的步骤。
2. **执行偏离计划**。记录预期工具、输入和输出，例如明确查内部文档中的重试策略。
3. **失败后照旧执行**。在步骤返回错误或意外结果时检查剩余计划的前提。
4. **计划拆得过细**。合并可一起执行的步骤，减少无用的模型与[工具调用](/posts/how-does-function-calling-work-in-llms/)。
5. **计划过时**。基于最新结果重写余下步骤，保留已完成且仍有效的部分。
6. **不断重新规划**。设置总步数和修改次数上限。连续修改仍然得到同一计划时，可以结束或交人工判断。

固定流程可以只保留规划和执行两部分。任务越依赖外部数据、越容易遇到意外，重新规划的价值越大。
