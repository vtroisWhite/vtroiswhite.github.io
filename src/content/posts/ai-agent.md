---
title: "什么是 AI 智能体？它是如何工作的？"
description: "从模型、指令、工具、记忆和运行循环五个部分理解 AI 智能体，用研究助手示例看看它如何完成任务，以及何时值得使用。"
publishedAt: "2026-11-09"
readingOrder: 41
originalPublishedAt: "2026-04-27"
tags: ["AI", "LLM", "AI 智能体", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/ai-agent"
draft: false
---

![Outcome School 的 AI 智能体文章封面](/images/posts/ai-agent.png)

AI 智能体接收一个目标，用[大语言模型（LLM）](https://outcomeschool.com/blog/large-language-model-llm)决定下一步，再由程序调用工具、收集结果。模型根据结果继续决策，直到任务完成或触发停止条件。这个反复决策和执行的过程，就是[智能体循环](/posts/ai-agent-loop/)。

可以把它想成一位刚入职的同事。接到任务后，他会先弄清要求，再打开文件、发消息或查数据。每做一步，他都要检查结果，再决定接下来做什么。智能体也按这个顺序工作。

## 模型、聊天机器人和智能体

单次模型调用接收输入并返回一次响应。传统聊天机器人保留当前会话的历史，每次调用模型时带上有关对话，因此可以连续交流。

智能体在此基础上加入工具和运行循环，能搜索网页、执行代码、发送邮件或更新数据库，具体取决于它获准使用的工具。它可以通过聊天界面接收任务，也可以作为后台程序运行。需要多步完成、且后一步要参考前一步结果的任务，适合用这种方式处理。

## 智能体的五个组成部分

```text
Instructions ──┐
               ├──▶ LLM ──▶ Tools
Memory ────────┘     ▲        │
                     └────────┘
                        Result
```

### 1. 大语言模型

模型读取目标、已有进展和工具说明，决定接下来请求哪个工具、传入哪些参数，或者直接给出最终答案。程序接到工具调用请求后，负责实际执行。

### 2. 指令

系统提示告诉模型它的职责、可以使用的工具以及要遵守的规则。任务所需的长流程可以写成独立的 [Agent Skills](/posts/what-are-agent-skills/)，由智能体按需加载。

### 3. 工具

工具把搜索、计算、文件读取和 API 调用等能力交给智能体。每个工具通常有名称、描述和输入模式。下面是一个网页搜索工具的定义。

```json
{
  "name": "web_search",
  "description": "搜索与查询相关的网页。用户询问时事、新闻或需要查证的外部信息时使用。",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "要执行的搜索查询。"
      },
      "max_results": {
        "type": "integer",
        "description": "最多返回的结果数，默认为 5。"
      }
    },
    "required": ["query"]
  }
}
```

名称用于标识工具，描述帮助模型判断什么时候使用，输入模式约定参数的结构。多个工具用途相近时，描述越明确，模型越容易选对。通过 [MCP（模型上下文协议）](/posts/what-is-mcp-model-context-protocol/)，智能体连接服务器后还可以发现服务器提供的工具及其定义。

### 4. 记忆

[记忆](/posts/ai-agent-memory/)帮助智能体记录进度，避免重复工作。短期记忆是当前任务的状态，包括对话、[工具调用](/posts/how-does-function-calling-work-in-llms/)和执行结果。模型每次调用都要收到完成当前步骤所需的历史，任务过长时可以压缩较早的内容。

长期记忆保存跨任务有用的信息，例如用户偏好、之前的决定和已知事实。系统可以把这些信息存入用户档案或[向量数据库](/posts/how-does-a-vector-database-work/)，在后续任务需要时取出。

### 5. 运行循环

循环负责向模型发送消息，执行它请求的工具调用，再把工具结果交回模型。模型可以据此继续调用工具或返回最终答复。步数预算、检查和退出条件也由运行程序管理。[循环工程](/posts/what-is-loop-engineering/)

## 一次任务如何完成

```text
User goal ──▶ LLM ──▶ Tool ──▶ Observation
               ▲                    │
               └────────────────────┘
               │
               └──▶ Final answer
```

假设用户想找明天飞往德里、价格低于 8,000 卢比的三班最便宜的直飞航班。

1. 运行程序把目标、指令和有关记忆一起发给模型。
2. 模型决定先查航班，并给出搜索参数。
3. 程序执行查询，把结果作为一次观测交回模型。
4. 模型根据结果继续筛选直飞和价格符合条件的航班，必要时再查，最后按价格排序。
5. 拿到足够信息后，模型返回符合条件的航班。达到步数上限时，程序结束循环并说明进度。

支持工具调用的模型可以一次请求多个工具。没有相互依赖的调用可以并行执行，结果汇总后再交回模型。[AI 工程基础视频](https://www.youtube.com/watch?v=lnfWvX66FUk)

## 示例　研究助手如何筛选笔记本电脑

假设任务是研究预算 1,500 美元以内、适合视频剪辑的笔记本电脑。智能体可以用搜索工具找候选机型，用网页读取工具查看评测、规格和售价，再用计算工具比较内存、显卡、存储和价格。

它可以从宽泛的搜索开始，筛出五款值得比较的机型，打开评测和商品页核对信息，再查看用户评价。模型根据每轮结果决定下一步查什么，并说明最终三款候选各自的优缺点和推荐理由。

下面用 Python 示意这个循环。`call_llm` 和 `call_tool` 分别由应用对接模型服务和工具。示例中的消息结构是抽象格式，接入时需要按模型接口转换。

```python
async def run_agent(user_goal, tools, max_steps=10):
    messages = [{"role": "user", "content": user_goal}]

    for _ in range(max_steps):
        response = await call_llm(messages, tools)
        if response.is_done:
            return response.final_answer

        # 保留模型发起的调用，让后续结果能与请求对应
        messages.append(response.message)

        for tool_call in response.tool_calls:
            result = await call_tool(tool_call.name, tool_call.arguments)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": str(result),
            })

    return "达到步数上限，任务尚未完成。"
```

循环每轮发出一次模型请求。拿到最终答复时直接返回，否则执行本轮工具调用，把请求和结果记录到消息中，供下一轮使用。`await` 让程序在等待模型或工具响应时可以处理其他工作，`max_steps` 给整个循环设定上限。

## 常见的智能体模式

- **[ReAct 智能体](/posts/react-agent/)** 交替决策、行动和观察，根据每一步的结果调整下一步。
- **[计划与执行智能体](/posts/plan-and-execute-agent/)** 先列出计划，再逐步执行，适合步骤较多的任务。
- **[反思智能体](/posts/reflection-agent/)** 先生成草稿，再检查和修订，适合有余量反复打磨的任务。
- **[Agentic RAG](/posts/agentic-rag/)** 让智能体决定何时检索、查哪里，以及是否需要补充资料。
- **[多智能体系统](/posts/multi-agent-systems/)** 让多个智能体分工，例如分别负责查资料、起草和审核。

这些模式可以组合。比如，一个 ReAct 智能体用 Agentic RAG 查资料，最后加一步反思，检查答复是否完整。

## 智能体能做什么

| 用途 | 工作内容 |
| --- | --- |
| 编程 | 阅读代码库、修改代码、运行测试、提交拉取请求。原文列举了 [Claude Code](https://outcomeschool.com/blog/how-does-claude-code-work)、[Cursor](https://outcomeschool.com/blog/how-does-cursor-work) 和 GitHub Copilot 的智能体模式。 |
| 研究 | 搜索网页、阅读论文、综合证据，整理成结构化报告。 |
| 客服 | 读取工单、查询账户与订单、给出处理方案，必要时转人工。 |
| 浏览器操作 | [浏览器智能体](/posts/how-do-browser-agents-work/)可以导航、填写表单、完成预订等任务。与之相关的[计算机操作智能体](/posts/how-do-computer-use-agents-work/)通过桌面界面完成工作。 |
| 数据分析 | 查询数据库、计算、绘图并解释结果。[OKF（开放知识格式）](/posts/what-is-okf-open-knowledge-format/)可以把表和字段的业务含义写成智能体能读取的文件。 |
| 个人助理 | 管理日历、读取和起草邮件、查找文件，按用户授权完成多步任务。 |

## 何时使用智能体

当任务需要访问外部信息或采取实际操作，且后续步骤取决于前面查到了什么，智能体能根据执行结果动态调整。单次模型调用足以完成的摘要任务，可以直接调用模型。步骤固定且无需分支的流程，用普通脚本更简单。对成本、延迟或结果确定性要求较高时，也要评估引入循环和模型决策的代价。

## 常见故障及处理方式

| 故障 | 处理方式 |
| --- | --- |
| 陷入循环 | 设置硬性的步数上限，防止反复调用同一个工具。 |
| 选错工具 | 写清工具的适用条件和用途，帮助模型区分相近的工具。 |
| 工具不存在或参数无效 | 使用模型原生的工具调用机制，并在运行程序中校验工具名称和参数。把清楚的错误信息作为观测返回，给模型修正机会。 |
| 上下文溢出 | 历史超出[上下文窗口](https://outcomeschool.com/blog/context-window)时，可以[压缩较早的步骤](https://outcomeschool.com/blog/how-does-context-compaction-work)或移除过时的结果。保留任务目标和最近进展，减少关键信息[淹没在中间](/posts/lost-in-the-middle-problem-in-llms/)的情况。 |
| 提前停止 | 在指令里写清交付物和完成条件，让模型能检查还有哪些工作未完成。 |

评估时可以分别检查最终结果、执行过程和工具使用情况，找出失败发生在哪一步。[AI 智能体评估](/posts/ai-agent-evaluation/)

## 常见问题

### ChatGPT 算 AI 智能体吗？

取决于具体的运行方式。像 ChatGPT 或 Claude 这样的产品，在能自主调用工具并根据结果继续执行任务的场景中，就具备智能体行为。

### 智能体需要聊天界面吗？

可以直接在后台运行。应用把指令、记忆和工具交给运行循环，再用代码或任务队列接收目标并返回结果。

### 工具定义中哪个字段最影响工具选择？

模型通常通过描述判断什么时候该用某个工具。选定后，它用名称标识工具，再按输入模式组织参数。

### 一个系统可以组合多种模式吗？

可以。例如，系统用 ReAct 循环决策，用 Agentic RAG 检索资料，最后通过反思步骤复查答案。

### 模型传入无效参数时怎么处理？

运行程序先校验输入，通过后再调用工具。校验失败时，返回具体错误，让模型知道哪个字段需要修正。
