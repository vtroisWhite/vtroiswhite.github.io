---
title: "检索增强生成（RAG）是如何工作的？"
description: "通过密码重置问答案例，解释 RAG 的索引、语义检索和答案生成，以及怎样追溯答案的来源。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-11-09"
readingOrder: 25
tags: ["AI", "LLM", "RAG", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/retrieval-augmented-generation-rag"
draft: false
---

![检索增强生成（RAG）是如何工作的？的原文封面](/images/posts/retrieval-augmented-generation-rag.png)

[大语言模型](https://outcomeschool.com/blog/large-language-model-llm)会根据训练所得知识和当前输入生成文本。它不一定知道刚更新的政策，也无法直接访问公司内部文档。问它不知道的事，它可能给出貌似可信的错误答案，这就是[幻觉](/posts/why-do-llms-hallucinate-the-token-level-explanation/)。

## 什么是 RAG？

RAG 是 Retrieval-Augmented Generation，即检索增强生成。先检索与问题相关的信息，将信息补充到模型的输入，再让模型根据这些资料生成答案。这可以让模型利用当前资料回答问题，而更新资料时主要改动的是检索索引。

## RAG 怎么工作？

RAG 分为索引和问答两个阶段。索引提前处理资料。问答每次接收用户问题时，查找相关资料并调用生成模型。

```text
   INDEXING PHASE (done once)
   --------------------------
   Documents --> Chunks --> Embeddings --> Vector Database


   QUERY PHASE (done for every question)
   -------------------------------------
   Question --> Retrieval --> Generation --> Answer
                   |
                   +--> reads from the Vector Database
```

### 索引：准备知识

收集文档并将它们拆成较小的[片段](/posts/chunking-strategies-for-rag/)。片段通常是一段话或几句话。以片段为单位检索，能避免把无关章节一起发给模型，还能保留来源、标题和文档位置。

### 嵌入向量与向量数据库

[嵌入向量](/posts/what-are-embeddings/)用一组数字表示文本的特征。模型可能把「怎么重置密码」和「忘了登录信息，想修改」放得很近，而把「高级套餐多少钱」放在更远处。

```text
   meaning map
   -----------

      [reset my password]
            *
            * <- close together (similar meaning)
      [forgot my login details]



                                  [price of premium plan]
                                          *
                                  (far away, different meaning)
```

用同一个嵌入模型为片段向量化，把结果和原文或标识存入[向量数据库](/posts/how-does-a-vector-database-work/)。问答时，数据库根据问题向量查找接近的片段。

### 检索：找到相关信息

把用户问题转成向量，搜索索引并取前几个候选。这个过程叫[语义搜索](/posts/how-does-semantic-search-work/)，可以检索意思相近但用词不同的内容。需要更精细排序时，可再用[重排序器](/posts/how-does-a-reranker-work/)核查候选的相关性。

### 生成：写出最终回答

提示词包含用户原问题、检索材料和作答规则。让模型依据材料回答，并允许它在材料不足时明确说明。

```text
You are a helpful assistant. Answer the question using only the
information given below.

Information:
"To reset your password, go to Settings, click Security, then click
Reset Password. You will receive an email with a reset link."

Question:
How do I reset my password?
```

```text
To reset your password, open Settings and click on Security. Then click
Reset Password. You will get an email with a link to set a new password.
```

## 一次完整的问答

原文示例先将文档切块、向量化并存入索引。用户提问后，应用用问题向量找相似的片段，把问题和片段拼入提示词，再由模型根据提供的事实生成答案。

```text
   Documents
      |
      ↓
   Chunks ---> Embeddings ---> +-----------------+
                               | Vector Database |
                               +-----------------+
                                        ↑
                                        | search by meaning
                                        |
   Question ---> Embedding -------------+
      |                                 |
      |                                 ↓
      |                          Top relevant chunks
      |                                 |
      +-------------+-------------------+
                    |
                    ↓
                 Prompt  (question + retrieved chunks)
                    |
                    ↓
                  LLM
                    |
                    ↓
              Final Answer
```

## RAG 有什么作用？

- 更新文档和索引后，回答可以使用新信息，无须为此重新训练模型。
- 授权范围内的公司制度、产品说明和内部知识可以作为答案依据。
- 提供证据有助于减少凭空猜测。检索结果还可带上文档与片段位置供用户追溯。
- 对需要按中间结果继续查资料的问题，可进一步使用[智能体 RAG](/posts/agentic-rag/)。

## 常见问题

- **使用 RAG 要重新训练大语言模型吗？** 基本流程直接使用已有模型，变化发生在索引和输入上下文。
- **每问一次都要重新索引吗？** 文档索引通常提前建立，文档变化时更新。每个问题只执行查询和生成。
- **为什么检索多个片段？** 一个问题的事实可能分散在多个片段。候选数要兼顾信息覆盖、噪声和上下文预算。
- **能展示答案来自哪里吗？** 保存片段对应的文档、页码或链接，并让应用在回答旁显示出处。
