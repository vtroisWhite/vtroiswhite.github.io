---
title: "提示词链是如何工作的？"
description: "把复杂任务拆成独立的模型调用，逐步传递结果，并了解常见链式模式和中间校验方法。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-07-10"
tags: ["AI","LLM","提示词工程","转载","翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-prompt-chaining-work"
readingOrder: 6
draft: false
---

![Outcome School 文章封面](/images/posts/how-does-prompt-chaining-work.png)

提示词链（Prompt Chaining）把一个大任务拆成多次模型调用。每次调用接到明确的小任务，并把结果交给下一次调用。提示词是单次调用的指令。[思维链](/posts/how-does-chain-of-thought-prompting-work/)让模型在一次回答中逐步推导，而提示词链的中间结果可以由应用保存、校验或重试。

## 为什么要拆开任务

一条长提示要求模型同时理解材料、做判断、生成内容并遵守格式，任何一部分做错都可能让最终结果难以使用。拆开之后，每一步可以选择合适的提示和模型，也能看清错误是从哪一步开始的。

```text
原始输入 → 提示 1 → 输出 1 → 提示 2 → 输出 2 → 提示 3 → 最终结果
```

第一步取得原始材料，第二步只需要消费第一步的输出以及当前任务所需的信息。后续各步按同样的方式接续。最终结果通常是最后一步的输出。

## 示例：长文改成社交媒体帖子

假设博客需要把一篇长文改成短帖。先请模型用三句话概括原文，再用摘要写成简短、吸引人的帖子，最后为帖子添加三个相关话题标签。三个结果可以分别查看，某一步不合格时，只需从对应步骤重新运行。

```python
def ask_ai(prompt):
    # call_the_ai_model 由调用方接入实际模型服务。
    return call_the_ai_model(prompt)

article = "<在这里放入文章全文>"
summary = ask_ai(f"用三句短句总结以下文章：\n{article}")
post = ask_ai(f"把以下摘要改写成一条简短的社交媒体帖子：\n{summary}")
final_post = ask_ai(f"给以下帖子添加三个相关话题标签：\n{post}")
print(final_post)
```

普通函数就能串起小型流程。任务增加时，也可以使用 [LangChain](/posts/how-does-langchain-work/) 管理这些调用。

## 常见模式

- **顺序链**让每一步都只向前传递结果。需要分支、回退或循环时，可以用[图工程](/posts/what-is-graph-engineering/)描述流程。
- **生成、校验和改写**先生成草稿，再由下一步给出反馈，最后根据反馈修改。类似的过程也见于[反思智能体](/posts/reflection-agent/)。
- **路由**先判断请求类型，再交给对应的下游提示。
- **并行后汇总**分别处理若干独立输入，最后把结果综合成一个交付物。

## 优点、代价与使用场景

较短的提示能突出当前步骤所需的信息，减轻长上下文[迷失在中间](/posts/lost-in-the-middle-problem-in-llms/)的问题。中间结果可见，也方便排查故障和复用步骤。但上游错误同样会沿链传递，多次调用还会增加延迟与费用。

先明确各步的输入和输出格式，再校验关键中间结果。下一步只接收所需信息，必要时带上原文证据。研究、内容生成、文档分析和多阶段分类都可能受益。对于一次调用即可稳定完成的简单任务，额外拆分只会增加开销。
