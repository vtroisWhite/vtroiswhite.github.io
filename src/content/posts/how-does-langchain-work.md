---
title: "LangChain 是如何工作的？"
description: "从提示词模板和链讲起，说明 LangChain 怎样将模型与输出解析、记忆、检索和工具调用连接起来。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-07-01"
tags: ["AI", "LLM", "LangChain", "工作流", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-langchain-work"
readingOrder: 58
draft: false
---

![LangChain 是如何工作的？的原文配图](/images/posts/how-does-langchain-work.png)

LangChain 是用于构建大语言模型应用的框架。单个模型调用可以回答问题，应用通常还要填充提示词、查自己的资料、处理模型输出或调用外部工具。LangChain 提供一组能连接这些步骤的组件。

## 为什么需要 LangChain

应用可能需要从用户提问中提取信息，查找资料，再把结果以指定格式展示。各步骤都由业务代码管理时，输入输出、模型接口和异常处理会散在不同位置。LangChain 把提示词、模型、检索器和解析器组织成可复用的步骤，像一条装配线。

| 装配线 | LangChain |
| --- | --- |
| 原料 | 用户输入 |
| 工位 | 一个可组合组件 |
| 半成品流向下一工位 | 数据传给下一步 |
| 成品 | 最终答案 |

## 模型与提示词模板

模型根据输入生成文本。提示词模板预先写好公共指令，把主题、用户问题等可变部分留到运行时填写。

```python
from langchain_core.prompts import PromptTemplate

template = PromptTemplate.from_template(
    "Explain {topic} in simple words for a beginner."
)

prompt = template.format(topic="LangChain")
```

## 链

链让一个组件的输出成为下一个组件的输入。下面的例子用管道操作符把模板、模型和输出解析器连在一起。这也体现了[提示词链](/posts/how-does-prompt-chaining-work/)的思路。

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

llm = ChatOpenAI(model="gpt-4o-mini")

template = PromptTemplate.from_template(
    "Explain {topic} in simple words for a beginner."
)

chain = template | llm

result = chain.invoke({"topic": "LangChain"})
```

```text
  user input              filled prompt              answer
   {topic}                    text                    text
      |                        |                        |
      v                        v                        v
  +----------+    pipe    +----------+    pipe    +----------+
  | Template | ---------> |   LLM    | ---------> |  Parser  |
  +----------+            +----------+            +----------+
   fills the              the brain:              cleans the
   blank space            reads the prompt,       answer into a
                          gives an answer         clean result
```

## 输出解析器

输出解析器处理模型返回的原始结果。示例用 `StrOutputParser` 提取文本。需要固定字段的应用也可以使用结构化解析，将结果变成列表或对象供代码处理。

```python
from langchain_core.output_parsers import StrOutputParser

parser = StrOutputParser()

chain = template | llm | parser

result = chain.invoke({"topic": "LangChain"})
```

## 记忆

每次模型调用只看到本次输入。若应用希望模型理解后一轮里的「他」指谁，需要保存前面的消息，并在下一次组装提示词时带上。[智能体记忆](/posts/ai-agent-memory/)介绍了怎样处理更长的时间跨度。

```python
# Turn 1
# Stored in memory: "User: Who is Albert Einstein?"

# Turn 2
# Memory + new message are sent together:
# "User: Who is Albert Einstein?
#  AI: Albert Einstein was a famous physicist.
#  User: Where was he born?"
```

上下文较长时，可以保留近期消息或引入摘要，控制占用的词元。

## 检索与 RAG

当用户询问内部文档或新近信息时，应用可以先查自己的资料，再让模型据此回答。这就是[检索增强生成（RAG）](/posts/retrieval-augmented-generation-rag/)。

1. 将原始文档切成较小的[文本块](/posts/chunking-strategies-for-rag/)。
2. 为各块生成[嵌入向量](/posts/what-are-embeddings/)。
3. 把向量与原文关联，存进[向量数据库](/posts/how-does-a-vector-database-work/)。
4. 用户提问时也生成向量，用[语义搜索](/posts/how-does-semantic-search-work/)找到最相近的资料。
5. 把资料和问题一起交给模型生成答案。

```text
  Our document
       |
       v
  +----------+    +-----------+    +--------------+
  |  Chunks  | -> | Embeddings | -> | Vector Store |
  +----------+    +-----------+    +--------------+
                                          ^
                                          | search by meaning
                                          |
  User question --> Embedding ------------+
                                          |
                                          v
                                  matching chunks
                                          |
                                          v
                           User question + matching chunks
                              combined into one prompt
                                          |
                                          v
                              +-----------------------+
                              |          LLM          | --> Answer
                              +-----------------------+
```

```python
# Find the chunks that match the user question
relevant_chunks = vector_store.similarity_search("What is the leave policy?")

# Send the chunks and the question to the LLM
chain = prompt_with_context | llm | parser

result = chain.invoke({
    "context": relevant_chunks,
    "question": "What is the leave policy?"
})
```

当智能体需要自行决定何时查找、从哪找、是否再查，可以在这个模式上增加控制逻辑。参见[Agentic RAG](/posts/agentic-rag/)。

## 工具与智能体

计算器、搜索引擎或天气接口属于工具。模型通过[函数调用](/posts/how-does-function-calling-work-in-llms/)提出工具名和参数，真正运行工具的是应用代码。[智能体](/posts/ai-agent/)把工具结果交还模型，再请模型决定下一步。这个[循环](/posts/ai-agent-loop/)会持续到任务完成或达到终止条件。

例如，用户询问 25 乘 18 是否大于 400。模型建议用计算器算 `25 * 18`，应用执行并得到 450，再把 450 交给模型比较和回答。流程出现复杂分支、循环和多个工具节点时，可以用[LangGraph](/posts/how-does-langgraph-work/)组织。

## 一条完整的执行流程

应用拿到问题，读出相关对话，从向量库取回文档片段。模板把这些信息合成提示词，经链传给模型。若模型建议执行工具，智能体负责调用并交回结果。模型生成回答后，解析器整理输出，应用展示答案，并把新消息存入会话历史。

```text
   User question
        |
        v
  +-----------+        +-----------+        +--------------+
  |  Memory   | -----> |  Prompt   | <----- | Retrieval /  |
  | (context) |        | Template  |        | Vector Store |
  +-----------+        +-----------+        +--------------+
        ^                    |
        |                    v
        |              +-----------+  agent calls   +-------+
        |              |    LLM    | <------------> | Tools |
        |              +-----------+ (LLM advises)  +-------+
        |                    |
        |                    v
        |              +-----------+
        |              |  Parser   |
        |              +-----------+
        |                    |
        |                    v
        |          Clean answer to user
        |                    |
        +--------------------+
              saves new messages
```

## 常见问题

- **LangChain 是一种语言模型吗？** 它用于连接模型和应用的其他组件，可以配合不同模型使用。
- **模型可以直接运行工具吗？** 模型提供工具名与参数，应用执行实际调用。
- **管道操作符有什么作用？** 它把左侧组件的结果传到右侧，例如 `template | llm | parser`。
- **何时考虑 LangGraph？** 简单的顺序流程可以用链，带循环、分支和暂停恢复的流程适合用图。
