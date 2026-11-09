---
title: "什么是 GraphRAG？知识图谱如何改善 RAG"
description: "以公司收购关系为例，解释 GraphRAG 如何建图、收集多跳证据，以及局部搜索与全局搜索的区别。"
publishedAt: "2026-11-09"
readingOrder: 38
originalPublishedAt: "2026-05-05"
tags: ["AI", "RAG", "知识图谱", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/graphrag"
draft: false
---

![Outcome School 原文封面](/images/posts/graphrag.png)

GraphRAG 在[检索增强生成](/posts/retrieval-augmented-generation-rag/)中加入知识图谱。它用节点表示人、公司或产品，用边记录它们之间的关系。生成答案前，系统可以沿着这些关系收集互有关联的证据。

## 普通 RAG 为什么难答多跳问题

普通流程把资料[切成块](/posts/chunking-strategies-for-rag/)，生成[嵌入](/posts/what-are-embeddings/)，再用[向量检索](/posts/how-does-a-vector-database-work/)找出与问题最相似的块。答案在一两个片段里时，这通常够用。若用户想知道“某个人怎样通过工作经历与某家公司产生联系”，系统要找出那个人、他的前雇主以及雇主和目标公司的关系。只做[相似度搜索](https://outcomeschool.com/blog/how-does-approximate-nearest-neighbor-ann-search-work)时，相关证据可能分散在不同片段，且部分片段与原问题并不相似。

GraphRAG 补充了关系检索。[Agentic RAG](/posts/agentic-rag/)从另一角度优化流程，由智能体决定什么时候、怎样查找。[HyDE](https://outcomeschool.com/blog/how-does-hyde-work)则通过假设答案改进检索输入。

## 索引阶段怎样建图

先切分文档，再用大模型提取实体和关系。例如，Alice 曾是 Acme 的工程师。Globex 在 2020 年收购了 Acme，当时 Bob 是 Globex 的 CEO。这段话可以得到以下关系：

```text
   Alice ----(works at)----> Acme
                              ^
                              |
                          (acquired)
                              |
   Bob ------(CEO of)----> Globex
```

系统从所有块提取信息，将指向同一实体的记录合并为一个节点，并保留关系对应的原始资料。然后将紧密连接的节点划分成社区，让大模型为各社区写摘要。索引中可以同时保留实体、关系、原始文本块和社区摘要的向量。反复索引时，用[嵌入缓存](https://outcomeschool.com/blog/how-does-an-embedding-cache-work)可以复用未变化文本的向量。

## 查询阶段怎样找证据

如果用户问“Alice 和 Bob 有什么关系？”，先从查询识别 Alice 与 Bob，也可以按向量相似度找到与提问相关的起点。随后沿边走过 Acme 和 Globex，收集沿途节点、边及原始文档片段。把证据与问题一起交给模型，答案便能说明 Alice 工作过的 Acme 被 Globex 收购，而 Bob 当时是 Globex 的 CEO。

```text
   INDEXING PHASE (run once)
   ----------------------------------------------------
   Documents
       |
       v
   Split into Chunks
       |
       v
   Extract Entities + Relations  (using LLM)
       |
       v
   Build Knowledge Graph
       |
       v
   Group nodes into Communities
       |
       v
   Write Community Summaries  (using LLM)
       |
       v
   Stored: Graph + Embeddings + Summaries

   ----------------------------------------------------

   QUERY PHASE (run for every question)
   ----------------------------------------------------
   User Question
       |
       v
   Find starting entities (embedding similarity + extraction)
       |
       v
   Walk connections + collect chunks + summaries
       |
       v
   Pass everything to the LLM as context
       |
       v
   Final Answer
```

将找到的节点、关系和原文组装为模型可用的材料，也涉及[上下文工程](/posts/context-engineering/)。

## 局部搜索与全局搜索

- **局部搜索**从明确实体出发，访问邻近节点和相关原文。例如从 Acme 出发回答“谁收购了 Acme？”
- **全局搜索**适用于“过去几年并购呈现哪些主题？”这类覆盖全库的问题。先让模型用不同社区摘要并行写局部回答并打相关性分，再汇总得分较高的回答。这分别是 Map 和 Reduce 两个阶段。

## 哪些场景值得用

| 方面 | 普通 RAG | GraphRAG |
| --- | --- | --- |
| 证据检索 | 按文档块相似度查找 | 遍历关系，并可结合相似度搜索 |
| 常见问题 | 查找直接事实 | 多跳推理、全局主题归纳 |
| 索引与维护 | 文档块和向量 | 另需维护图、关系与社区摘要 |

研究文档、公司知识库或新闻资料经常包含跨实体的关系，图可以提高多跳问题的可检索性。代价是索引期间需要额外模型调用和存储，文档变更后还要更新图及相关摘要。关系简单、问题多为单一事实时，普通 RAG 更容易维护。图也可以人工构建，例如用[开放知识格式](/posts/what-is-okf-open-knowledge-format/)把互相关联的知识写成 Markdown 文件。
