---
title: "什么是 AI 智能体循环？"
description: "从思考、行动、观察三个阶段理解智能体运行时，包括并行工具调用、停止条件和常见故障。"
publishedAt: "2026-11-09"
readingOrder: 42
originalPublishedAt: "2026-05-28"
tags: ["AI", "AI 智能体", "LLM", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/ai-agent-loop"
draft: false
---

![Outcome School 原文封面](/images/posts/ai-agent-loop.png)

AI 智能体循环是运行[智能体](/posts/ai-agent/)的那段代码。它把当前任务和进展交给大语言模型，执行模型选出的动作，把结果送回模型，再开始下一轮。一次完整的循环也叫一步或一轮。

## 循环在智能体中的位置

指令和记忆进入模型，模型挑选工具，工具结果再回到模型。循环负责把这些部分串起来。模型生成工具名和参数，运行时负责实际调用工具。如何约束轮数、保留哪些状态以及何时退出，属于[循环工程](/posts/what-is-loop-engineering/)。

```text
+------------------------------------------------+
|                      Loop                      |
|                                                |
|   Instructions --->  +-------+                 |
|                      |       |                 |
|   Memory       --->  |  LLM  | <-----+         |
|                      +-------+       |         |
|                          |           |         |
|                          | pick      | result  |
|                          v           |         |
|                      +-------+       |         |
|                      | Tools | ------+         |
|                      +-------+                 |
+------------------------------------------------+
```

## 为什么需要循环

假设要找明天飞往德里的最低价航班。模型需要先查实时航班，再读取结果、比较价格并筛选航班。后面的决策依赖前面实际查到的结果。模型的独立调用也不会自动记住上一次发生的事。在这个简单实现中，运行时逐轮带回原始目标、工具请求和结果。它们组成了智能体的短期历史，长期信息则需要另外设计[记忆机制](/posts/ai-agent-memory/)。

## 思考、行动和观察

1. **思考**。模型读取任务、指令、工具列表和历史，返回工具请求或最终答案。
2. **行动**。运行时用模型给出的参数执行搜索、数据库查询或 API 调用。
3. **观察**。运行时把工具结果写入历史，下一轮的模型就能根据结果选择新动作。

[ReAct 智能体](/posts/react-agent/)把这套节奏明确组织成推理与行动交替的过程。

```text
   +----------------+
   |  User's Goal   |
   +----------------+
            |
            v
   +----------------+        +-------------+
   |      LLM       |------->|    Tool     |
   |  (decides:     |        +-------------+
   |   pick a tool  |              |
   |   or return    |              v
   |   final answer)|        +-------------+
   |                |<-------| Observation |
   +----------------+        +-------------+
            |
            | when goal is achieved
            v
   +----------------+
   |  Final Answer  |
   +----------------+
```

假设用户要找明天飞往德里、低于 8000 卢比的三班最便宜的直飞航班。模型先请求航班搜索，运行时返回实时结果。模型随后筛掉中转航班和超预算航班，再从剩余结果里排序。原文的示例结果是 AI-123（6500 卢比）、IX-201（7200 卢比）和 SG-312（7800 卢比）。运行时事先不必写死行动路径。

## 用 Python 表示最小循环

`call_llm` 接收消息和工具定义，`call_tool` 按名称执行工具。下例用统一的响应结构表示供应商接口，实际接入时需要保留模型的工具请求以及对应的调用 ID。

```python
async def run_agent(user_goal, tools, max_steps=10):
    messages = [{"role": "user", "content": user_goal}]
    step = 0

    while True:
        # Safety stop: bail out if we hit the step limit
        if step >= max_steps:
            return "Reached step limit without completing the task."
        step += 1

        # Ask the LLM what to do next
        response = await call_llm(messages, tools)

        # If the LLM says "I am done", stop the loop and return the final answer
        if response.is_done:
            return response.final_answer

        # Otherwise, run each tool the LLM picked and feed the result back
        for tool_call in response.tool_calls:
            result = await call_tool(tool_call.name, tool_call.arguments)
            messages.append({
                "role": "tool",
                "name": tool_call.name,
                "content": str(result),
            })
```

`messages` 随执行增长，`is_done` 表示模型主动交付结果，`max_steps` 给循环设上限。示例逐一调用工具。支持[并行工具调用](/posts/how-does-function-calling-work-in-llms/)的模型可以在同一轮请求三个城市的天气，运行时并行执行三个独立查询，再一次送回全部结果。有依赖关系的工具仍需按顺序执行。运行时也可以执行鼠标和键盘动作，见[操控计算机的智能体](/posts/how-do-computer-use-agents-work/)。

## 什么时候停止

模型给出最终答案时，循环可以自然退出。步数、时间或费用达到上限时，由运行时终止，必要时交回人工处理。[Claude Code](https://outcomeschool.com/blog/how-does-claude-code-work)也反复收集上下文、执行动作和验证结果，直到任务结束。

## 常见故障

| 故障 | 应对方法 |
| --- | --- |
| 工具请求一直持续 | 强制限制轮数、时间和费用 |
| 同一工具和参数不断重试 | 检测重复，反馈已经尝试过的动作和结果 |
| 历史撑满可用上下文 | [压缩旧历史](https://outcomeschool.com/blog/how-does-context-compaction-work)，按[上下文工程](/posts/context-engineering/)的原则保留仍有用的事实 |
| 任务尚未做完就退出 | 定义并验证[完成标准](/posts/ai-is-only-as-good-as-our-definition-of-done/) |

反复触发步数上限时，可以先查看指令是否明确、工具是否覆盖了目标，以及智能体是否在原地重试。用[智能体评估](/posts/ai-agent-evaluation/)同时检查结果、执行轨迹和工具使用，才能定位问题出现在哪一轮。
