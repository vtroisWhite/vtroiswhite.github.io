---
title: "什么是循环工程？"
description: "通过最小智能体循环和故障示例理解预算、状态、验证与退出条件。"
publishedAt: "2026-11-09"
readingOrder: 43
originalPublishedAt: "2026-08-20"
tags: ["AI", "AI 智能体", "工程实践", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/what-is-loop-engineering"
draft: false
---

![Outcome School 原文封面](/images/posts/what-is-loop-engineering.png)

循环工程设计[AI 智能体](/posts/ai-agent/)反复执行的流程。每一轮应给任务带来进展，系统还要能够验证结果并及时退出。

## 用煮汤理解循环工程

厨师加盐、尝味、记住已经放了多少盐，再决定下一步。咸淡适宜就能出锅，端上桌的时间也限制了能尝几次。

| 厨房里的动作 | 智能体里的对应部分 |
| --- | --- |
| 厨师决定下一步 | 模型选择行动 |
| 加一小撮盐 | 读取文件、运行命令等操作 |
| 尝味 | 观察工具执行结果 |
| 记得放过多少盐 | 跨轮保存状态 |
| 味道符合要求 | 达到完成标准 |
| 趁热上桌 | 限制执行轮数和时间 |

## 一轮是怎么运行的

在一次[智能体循环](/posts/ai-agent-loop/)中，模型先根据目标和现状选择动作，运行时执行[工具](/posts/how-does-function-calling-work-in-llms/)，再把结果反馈给模型。[ReAct 智能体](/posts/react-agent/)就采用思考、行动和观察交替的方式。最简单的写法只有三行逻辑：

```python
while True:
    decision = model(context)
    result = run_tool(decision.tool, decision.input)
    context = context + result
```

这个循环会一直运行。它也缺少异常处理、历史压缩和可验证的[完成标准](/posts/ai-is-only-as-good-as-our-definition-of-done/)。模型即使声称已经做完，代码也无法判断结果是否达标。

## 循环由哪些部分控制

- **目标与完成标准**。目标描述要交付什么，完成标准规定怎样验证。每轮都提供目标，有助于避免执行偏离。
- **工具和反馈**。给模型合适的权限，把成功结果或失败原因反馈回去。工具返回的信息应当足够判断下一步。
- **[记忆](/posts/ai-agent-memory/)**。完整历史便于追溯，但调用成本会随轮数增长。滚动摘要更省上下文，也可能丢失关键细节。
- **预算和退出**。给轮数、耗时、令牌和工具调用设上限。预算耗尽时返回当前进展和卡点。

## 提示词、上下文和循环工程

| 关注点 | 提示词工程 | 上下文工程 | 循环工程 |
| --- | --- | --- | --- |
| 工作单位 | 一条指令 | 一次模型输入 | 一次完整运行 |
| 要解决的问题 | 指令怎样写 | 当前该让模型看到什么 | 接下来做什么，何时结束 |
| 常见调整 | 改写措辞和格式 | 增减信息、调整顺序 | 加入预算、检查和退出条件 |
| 主要控制方 | 提示词编写者 | 收集和组装输入的代码 | 重复调用模型的运行时 |

[上下文工程](/posts/context-engineering/)关注每次调用时桌面上放了哪些信息。循环工程还需要决定多轮工作怎么推进。

## 循环怎样失效，怎样修复

重复相同的动作可能浪费整份预算。可以记录工具、参数和结果，检测重复后要求换一种办法。模型也可能偏离目标、把半成品当成完成，或者带着越来越长的原始工具输出继续跑。把初始目标重新放入每轮输入、使用独立验证、[压缩旧上下文](https://outcomeschool.com/blog/how-does-context-compaction-work)，可以分别应对这些问题。

长任务可以先写计划，把未完成项保留在每轮状态中。[规划与执行智能体](/posts/plan-and-execute-agent/)展示了这种做法。可以把独立任务交给[子智能体](/posts/ai-subagents/)，让主循环只接收所需结果。执行工具时应捕获可恢复错误，让智能体根据反馈换路径。发邮件、改账单等敏感操作可以先暂停，交给人审核。

```python
MAX_STEPS = 12

def run_agent(goal, context):
    for step in range(MAX_STEPS):
        # the goal goes in on every single turn, so the agent cannot drift
        decision = model(goal, context)

        if decision.is_done:
            if verify(goal):          # check the claim, do not believe it
                return decision.answer
            context = add(context, "Verification failed. Keep working.")
            continue

        try:
            result = run_tool(decision.tool, decision.input)
        except ToolError as e:
            # a crash becomes a lesson instead of the end of the run
            result = f"Tool failed: {e}. Try a different approach."

        context = add(context, trim(result))

    return "Could not finish within the step budget."
```

示例每轮带上目标，只在验证通过后返回答案。工具失败会成为新的上下文，工具输出会经过裁剪，超过 12 步则退出。`model`、`verify`、`run_tool` 和 `trim` 需要由实际系统提供。

## 哪些场景值得使用

编程、研究、排查故障等任务通常要根据中间结果决定下一步，并且有可检查的交付物，适合让循环承担探索。结果难以验证、操作难以撤销或任务只要一次调用即可完成时，循环的成本和错误会逐轮累积。已知的阶段和分支也可以由[图工程](/posts/what-is-graph-engineering/)显式描述，再在需要探索的节点里使用循环。

模型可以提出任务已经完成，运行时仍应按完成标准检查。预算耗尽时，要保留已完成的步骤和待确认的事项，让下一次运行或人工接手有据可查。
