---
title: "智能体的长期记忆"
description: "从上下文窗口、短期记忆、长期记忆和外部知识四层出发，了解 AI 智能体怎样跨会话读取、写入、更新和遗忘信息。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-04-28"
tags: ["AI", "LLM", "AI 智能体", "记忆", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/ai-agent-memory"
draft: false
---

![Outcome School 的 AI 智能体记忆文章封面](/images/posts/ai-agent-memory.png)

你今天告诉智能体自己习惯用 Go，下周请它写一个函数时，它仍能用 Go 作答。这段偏好由智能体保存，等到有用时再放回模型的上下文。本文从长期记忆出发，介绍它和短期状态、上下文窗口、外部知识怎样配合。

## 先看全貌

单次大语言模型（LLM）调用依靠本次输入里的信息。要让它接着处理昨天的任务，应用需要保存昨天的进度，再在本次调用时提供相关内容。[AI 智能体](/posts/ai-agent/)的记忆系统负责完成这项工作。

可以把智能体想成一位每次开会都要重新听简报的助理。会议桌放当前要看的材料，桌上的便签记录本次任务的进度，抽屉里的档案保存以后还能用到的信息。要查公司手册时，再去资料库找。

## 为什么智能体需要记忆

- **接续对话。** 下一轮回答需要知道上一轮说了什么。
- **保留偏好。** 用户惯用的编程语言、回复长度和时区等信息，可以按需提供给模型。
- **复用经验。** 记录尝试过的做法和结果，后续任务可以参考这些记录，减少重复试错。
- **延续长任务。** 保存计划、当前步骤和中间结果，智能体才能在多次调用之间继续工作。如何让这套循环持续推进，是[循环工程](https://outcomeschool.com/blog/what-is-loop-engineering)的一部分。

## 记忆的四个层次

| 层次 | 保存或提供什么 | 生命周期 |
| --- | --- | --- |
| 上下文窗口 | 本次调用直接提供给模型的文本 | 单次调用，受长度上限约束 |
| 短期记忆 | 当前任务的计划、进度和中间结果 | 通常限于任务或会话 |
| 长期记忆 | 稳定的用户信息、偏好、对话摘要和可复用经验 | 跨会话保存，按需检索 |
| 外部知识 | 文档、数据库、API 和网页 | 由外部来源维护，智能体按需查询 |

**上下文窗口**是模型在单次调用中能直接读取的内容。超过窗口容量时，需要压缩或移除部分输入。遇到大到放不进窗口的材料，还可以让模型通过工具按需读取和分段处理，相关做法见[递归语言模型（RLM）](https://outcomeschool.com/blog/recursive-language-models)。

**短期记忆**像一本本次任务的工作笔记。它由应用在调用之间维护，可以在下一轮放回[上下文窗口](https://outcomeschool.com/blog/context-window)。有些框架把上下文窗口也称为短期记忆。这里把模型眼前的输入与应用保存的会话状态分成两层。

**长期记忆**跨任务和会话保留信息。按用途还可以区分为情景记忆（以往经历）、语义记忆（事实与概念）和程序性记忆（做事的方法）。想看产品中的例子，可以参考[ChatGPT 怎样记住你](https://outcomeschool.com/blog/how-does-chatgpt-remember-you)。

**外部知识**由其他系统维护。即使文档和数据库属于同一家公司，智能体查询它们时，也是在读取共享知识。不同框架对这一层的归类有所不同，有些将它归入广义的长期记忆。

## 写入、读取、更新和遗忘

1. **写入。** 保存有复用价值的信息。例如用户说「我习惯用 Go」，就记录其语言偏好。
2. **读取。** 只取本次任务用得上的内容。用户要写反转字符串的函数时，取出 Go 偏好即可，收货地址与任务无关。
3. **更新。** 新信息与旧记忆冲突时，替换或修订原有记录。比如用户从偏好 Python 改为偏好 Go。
4. **遗忘。** 清理过期、错误或已失去用途的记录。登录故障排查到哪一步，通常只需要保留到当前会话结束。

这四项操作决定了记忆能否派上用场。缺少读取，写入的信息用不上。缺少更新和遗忘，旧记录会挤占检索结果，甚至影响回答。

## 每轮对话怎样使用记忆

```text
用户消息
  ↓
检索相关的长期记忆，读取当前会话的短期记忆
  ↓
组装上下文，把指令、相关记忆和用户消息交给模型
  ↓
模型决定下一步，必要时调用工具并读取结果
  ↓
记录任务进展，按需保存值得长期保留的信息
  ↓
返回回答
```

长期记忆按当前用户和任务检索，短期记忆则提供本会话里的计划和中间结果。模型需要其他资料时，智能体还可以通过[检索增强生成（RAG）](https://outcomeschool.com/blog/retrieval-augmented-generation-rag)查文档，或者调用数据库等工具，并在[智能体循环](https://outcomeschool.com/blog/ai-agent-loop)中继续处理结果。流程可以写成下面的伪代码。

```python
while user_active:
    user_message = receive_message()
    long_term = search_long_term_memory(user_id, user_message)
    short_term = read_short_term_memory(session_id)
    messages = build_messages(system_prompt, long_term, short_term, user_message)

    while True:
        response = call_llm(messages, tools)
        if not response.is_tool_call:
            break
        tool_result = call_tool(response.tool_name, response.tool_args)
        messages.extend([response, tool_result])

    write_short_term_memory(session_id, user_message, response)
    if is_worth_keeping(user_message, response):
        write_long_term_memory(user_id, user_message, response)
    send_to_user(response)
```

第一次对话中，Priya 说自己写 Go。系统查不到已有偏好，于是在本轮结束时记录她的姓名和惯用语言。一周后，她请智能体写一个反转字符串的函数。系统检索到这条偏好，把它随当前问题一起交给模型，模型便用 Go 作答。

生产系统可以在返回回答后异步写入长期记忆，缩短用户的等待时间。

## 哪些信息值得长期保存

优先保存稳定的用户信息、明确的偏好、任务结果和会影响后续工作的决定。例如用户的时区、期望的回答长度、上一次排查中验证有效的做法，或者一项已经定下来的架构约束。

逐条聊天记录、问候语和短期任务进度通常留在当前会话即可。涉及敏感信息时，需要先确认用户同意保存。判断一条信息是否值得写入，可以问自己，下次对话还会用到它吗？

表的业务含义、销售数据的统计口径等公司知识适合维护在共享文档里，供不同智能体和工具查询。[开放知识格式（OKF）](https://outcomeschool.com/blog/what-is-okf-open-knowledge-format)提供了一种组织这类信息的方式。

## 常见问题和处理办法

| 问题 | 处理办法 |
| --- | --- |
| 上下文超长，早期信息被截断 | [压缩旧对话](https://outcomeschool.com/blog/how-does-context-compaction-work)，清理无用的工具输出，只载入本轮相关的记忆。 |
| 有记录却检索不到 | 为条目写清标题和描述，使用[语义检索](https://outcomeschool.com/blog/how-does-semantic-search-work)，先取候选再筛选。数据量大时可以用[近似最近邻（ANN）检索](https://outcomeschool.com/blog/how-does-approximate-nearest-neighbor-ann-search-work)快速找到相似向量。 |
| 智能体继续使用过时信息 | 写入时检查冲突，发现变化就更新对应记录。 |
| 记忆越积越多 | 制定清理策略，删除失效、长期未使用或已被新信息取代的条目。 |
| 向其他用户泄露记忆 | 按用户标识隔离并授权访问。保存敏感信息需经同意，并对存储和传输加密。 |
| 把临时状态当作长期事实 | 根据有效期选择存储层。有疑问时先放短期记忆，确认有复用价值后再转存。 |

这些故障有时只表现为回答悄悄出错。日志、[智能体可观测性](https://outcomeschool.com/blog/ai-agent-observability)和定期审计可以帮助定位问题。还要留意记忆投毒。攻击者如果能让恶意指令写入长期记忆，这些内容就可能在后续会话中被反复取回。[大语言模型中的提示词注入](/posts/prompt-injection-in-llms/)

## 小结

上下文窗口提供本轮输入，短期记忆接续手头任务，长期记忆保存跨会话有用的信息，外部知识提供按需查询的资料。每轮调用从记忆中取相关内容，任务推进后再更新记录。系统长期有效依赖检索质量、写入边界和过期清理。

## 常见疑问

### 模型本身会记住用户吗？

应用通过记忆存储保留信息，并在每轮调用时把相关内容交给模型。跨会话的连续性来自应用的读取和写入流程。

### 短期记忆和长期记忆的区别是什么？

短期记忆保存某个任务或会话中的计划、进度和中间结果。长期记忆保存能跨会话复用的事实、偏好、摘要和经验。

### RAG 和智能体记忆有什么关系？

RAG 提供检索并把结果用于生成的机制，可以用于查询文档、数据库，也能用于找回已保存的记忆。智能体的记忆系统还负责记录的写入、更新和清理。

### 每条消息都要写入长期记忆吗？

长期记忆更适合存放稳定偏好、关键决定和有复用价值的结果。临时信息可以随着会话结束而清理。

### 长期记忆写入会让响应变慢吗？

同步写入会占用响应时间。系统也可以先返回回答，再在后台写入记忆。
