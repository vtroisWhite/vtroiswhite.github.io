---
title: "什么是 ReAct 智能体？详解它如何思考与行动"
description: "通过东京人口计算示例和 Python 骨架理解 ReAct 的思考、行动、观察循环。"
publishedAt: "2026-11-09"
readingOrder: 45
originalPublishedAt: "2026-04-30"
tags: ["AI", "AI 智能体", "LLM", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/react-agent"
draft: false
---

![Outcome School 原文封面](/images/posts/react-agent.png)

ReAct 取自 Reasoning（推理）和 Acting（行动）。在这种[智能体](/posts/ai-agent/)里，模型判断下一步该做什么，控制器执行工具，模型再根据观察到的结果继续处理。经典 ReAct 会把简短的任务推理、工具动作和观察分别写进轨迹。

## ReAct 在智能体模式中的位置

[智能体循环](/posts/ai-agent-loop/)是较宽泛的概念。ReAct 把它组织成“思考 → 行动 → 观察”的交替过程，把[思维链提示](/posts/how-does-chain-of-thought-prompting-work/)中的逐步处理与实际工具操作结合起来。[规划与执行](/posts/plan-and-execute-agent/)先安排整体计划，[反思](/posts/reflection-agent/)侧重改进已有产物，[Agentic RAG](/posts/agentic-rag/)用相似的循环控制检索与生成。[操控计算机的智能体](/posts/how-do-computer-use-agents-work/)也可以这样组织，只是把操作换成点击、键盘和屏幕观察。

## 五个组成部分

```text
+------------------------------------------------+
|                Loop Controller                 |
|                                                |
|   System Prompt --->  +-------+                |
|                       |       |                |
|   Memory        --->  |  LLM  | <-----+        |
|                       +-------+       |        |
|                           |           |        |
|                           | pick      | obs    |
|                           v           |        |
|                       +-------+       |        |
|                       | Tools | ------+        |
|                       +-------+                |
+------------------------------------------------+
```

1. **大语言模型**读取任务和历史，决定请求工具还是给出最终答案。
2. **系统提示词**约定行为、工具、何时继续和何时结束。
3. **工具**暴露搜索、数据库、计算等能力，并声明名称、描述和参数结构。
4. **[记忆](/posts/ai-agent-memory/)** 记录用户问题、已执行的动作和实际观察。
5. **循环控制器**负责发送上下文、执行[工具调用](/posts/how-does-function-calling-work-in-llms/)、写回结果和判断退出。预算和退出方式属于[循环工程](/posts/what-is-loop-engineering/)。

## 提示词和调用协议

经典模板让模型选择 `Thought`、`Action`、`Observation` 和 `Final Answer` 对应的阶段。工具结果由运行时填入。

```text
You are a helpful assistant that solves problems by thinking step by step and recommending tools when needed.

You have access to the following tools:
- search(query): Search the web for information.
- calculator(expression): Evaluate a math expression.

At each step, respond in one of these two formats:

Format 1 - When you need to recommend a tool:
Thought: <your reasoning about what to do next>
Action: <tool_name>(<tool_input>)

Format 2 - When you have the final answer:
Thought: <your final reasoning>
Final Answer: <the answer to the user's question>

Rules:
- Always start with a Thought.
- Recommend one tool per turn, unless multiple independent tools would clearly help in parallel.
- Wait for the Observation before continuing.
- Stop as soon as you have the final answer.
```

原始论文使用类似 `Action: search[Apple Remote]` 的字符串。现代 API 可以用原生工具定义和结构化参数替代字符串解析，应用侧仍需验证参数和权限。若模型在一轮内返回多项彼此独立的调用，控制器可以并行执行并汇总结果。

## 运行轨迹

```text
        +-----------------+
        |  User Question  |
        +-----------------+
                 |
                 v
        +-----------------+
        |    Thought      |  <-- LLM reasons about the next step
        +-----------------+
                 |
        +--------+--------+
        |                 |
        v                 v
  +-----------+    +---------------+
  |  Action   |    | Final Answer  | ---> back to user
  +-----------+    +---------------+
        |
        v
  +-----------+
  |   Tool    |
  +-----------+
        |
        v
  +-------------+
  | Observation | --+
  +-------------+   |
                    |
                    +---> back to Thought (loop continues)
```

控制器把用户问题加到历史，再调用模型。如果模型返回最终答案，控制器交付它。如果模型请求工具，控制器执行动作，把真实结果写为观察，并带着更新后的历史进入下一轮。

原文用“东京人口的 15% 是多少？”展示完整轨迹。智能体先搜索示例人口，再调用计算器计算比例，最后根据两个工具的结果回答。以下数字是演示输入。

```text
Thought 1: I need to find the population of Tokyo first. I do not know the exact current number, so I will search for it.
Action 1: search("current population of Tokyo")
Observation 1: The population of Tokyo is approximately 14 million.

Thought 2: Now I need to calculate 15% of 14 million. Let me use the calculator to be accurate.
Action 2: calculator("14000000 * 0.15")
Observation 2: 2100000

Thought 3: I now have the answer. 15% of the population of Tokyo (14 million) is 2.1 million.
Final Answer: 15% of the population of Tokyo is approximately 2.1 million people.
```

## Python 实现骨架

```python
REACT_SYSTEM_PROMPT = "..."  # the ReAct prompt template from the previous section

async def run_react_agent(user_question, tools, max_steps=10):
    messages = [
        {"role": "system", "content": REACT_SYSTEM_PROMPT},
        {"role": "user", "content": user_question},
    ]
    step = 0

    while True:
        # Safety stop: bail out if we hit the step limit
        if step >= max_steps:
            return "Reached step limit without a final answer."
        step += 1

        # Ask the LLM to think, then either act or give the final answer
        response = await call_llm(messages, tools)

        # If the LLM has the final answer, stop the loop and return it
        if response.is_done:
            return response.final_answer

        # Otherwise, run each tool the LLM picked and feed the observation back
        for tool_call in response.tool_calls:
            observation = await call_tool(tool_call.name, tool_call.arguments)
            messages.append({
                "role": "tool",
                "name": tool_call.name,
                "content": str(observation),
            })
```

示例用 `call_llm`、`parse_action` 和工具注册表表示接入层。控制器按动作查找工具、捕获异常并回写结果，同时用 `max_steps` 限制执行轮数。

## 常见故障与处理

| 故障 | 对策 |
| --- | --- |
| 循环重复相同动作 | 设置步数上限并检测重复的工具名与参数 |
| 选错工具 | 写清每个工具的用途、输入和适用场景 |
| 请求了不存在的工具或非法参数 | 用结构化工具定义，执行前再验证，失败时反馈错误 |
| 历史撑满[上下文窗口](https://outcomeschool.com/blog/context-window) | 摘要旧轨迹、丢弃过期观察或转存到外部记忆 |
| 查证不足就结束 | 增加核对清单或独立审核步骤 |
| 工具故障后卡住 | 把超时、参数错误等写成观察，让下一轮改用其他路径 |

长时间运行的任务还需要[上下文工程](/posts/context-engineering/)。[递归语言模型](https://outcomeschool.com/blog/recursive-language-models)给出了另一种控制上下文体积的做法，将部分工作交给子调用处理。
