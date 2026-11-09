---
title: "什么是无向量 RAG？不使用嵌入或向量数据库的检索增强生成"
description: "以保险条款为例，讲解模型如何按文档目录逐层检索，以及关键词、结构化查询和文件浏览等无向量做法。"
publishedAt: "2026-11-09"
readingOrder: 39
originalPublishedAt: "2026-09-10"
tags: ["AI", "RAG", "检索", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/vectorless-rag"
draft: false
---

![Outcome School 原文封面](/images/posts/vectorless-rag.png)

无向量 RAG 在检索时不为文档创建嵌入，也不使用向量数据库。文章重点介绍一种做法：保留文档的章节结构，让大语言模型根据标题和摘要逐层决定打开哪里，再读原文回答。

## 从向量 RAG 说起

大语言模型依赖输入或工具访问内部资料。[RAG](/posts/retrieval-augmented-generation-rag/)把相关证据检索出来，随问题一起发送给模型。假设一份保险合同有 300 页，用户只想查牙科条款，发送全部正文既耗费上下文，也可能让关键内容被淹没，见[长上下文中的“迷失在中间”问题](/posts/lost-in-the-middle-problem-in-llms/)。

常见做法是先将文档[分块](/posts/chunking-strategies-for-rag/)，再用[嵌入模型](/posts/what-are-embeddings/)生成向量并写入[向量数据库](/posts/how-does-a-vector-database-work/)。查询时，系统将问题向量与索引比较，取[最接近的若干块](https://outcomeschool.com/blog/how-does-approximate-nearest-neighbor-ann-search-work)。这类[语义搜索](/posts/how-does-semantic-search-work/)能找出不同措辞的相关内容，但相关并不等于充分。固定分块可能拆开规则和例外，前几个结果可能只覆盖某一章节。精确的条款号、产品型号、数值与否定条件也可能需要别的检索信号。

## 先建立章节树，再逐层搜索

准备文档时，把章、节和小节组织成树，每个节点记录标题、一两句内容摘要和正文位置。可以利用已有目录，也可以先解析文档层级，再补摘要。

收到问题后，只把顶层标题和短摘要交给模型。模型选择一个或多个可能相关的章节，再对这些章节的子节点重复选择。到达目标章节后，读取完整原文，把问题和原文交给模型生成带出处的答案。这个过程可以记录每次展开的节点，以便排查检索路径。

## 保险条款示例

用户问：“第一年可以报销牙科治疗吗？”合同的目录大致如下：

```text
Insurance Policy
|
|-- Chapter 1: Definitions
|-- Chapter 2: How to Buy the Policy
|-- Chapter 3: What is Covered
|     |-- 3.1 Hospital Stay
|     |-- 3.2 Surgery
|     |-- 3.3 Eye Care
|     |-- 3.4 Dental Treatment
|-- Chapter 4: What is Not Covered
|-- Chapter 5: Waiting Periods
|-- Chapter 6: How to Claim
```

向量检索可能返回多段 3.4 节的牙科保障范围，却漏掉第 5 章有关等待期的限定。按目录搜索时，模型先选中保障范围和等待期两章，再取出牙科治疗和牙科等待期两个小节。原文的示例答复是牙科治疗在保障范围内，但要等满 12 个月，第一年不能报销。决定答案的是两个章节共同提供的证据。

## 其他无向量做法

- **关键词检索**适合发票号 `INV-2024-8891` 等需要精确匹配的输入。
- **结构化查询**适合在日期、城市、金额等明确字段上过滤。让应用执行查询并将结果交给模型。
- **传入全文**适合足够短的合同或报告，可以省掉单独的检索环节。
- **文件浏览**给模型列目录、打开文件和搜索文本的工具，按观察逐步定位资料，类似[智能体检索](/posts/agentic-rag/)和 [Claude Code 的代码查找](https://outcomeschool.com/blog/how-does-claude-code-work)。

## 如何选择

| 方面 | 向量 RAG | 按章节树检索的无向量 RAG |
| --- | --- | --- |
| 文档准备 | 分块、生成向量并建立索引 | 识别层级并保存标题、摘要及位置 |
| 查询过程 | 按向量相似度取前若干块 | 由模型逐层展开候选章节 |
| 查询成本 | 索引建好后通常较快 | 多层选择通常需要多次模型调用 |
| 文档更新 | 更新相关块和向量 | 更新受影响的节点、正文位置和摘要 |
| 适用数据 | 规模大、文档结构差异大的语料 | 目录清晰的合同、手册或长报告 |

章节摘要写得不准确时，模型可能一开始就走错分支。缺少结构的大批日志和聊天记录也难以靠目录选出文档。可以用关键词或向量快速缩小候选范围，再对少量文档按目录精读。这种组合借鉴了[混合检索](/posts/how-does-hybrid-search-work/)的思路，既保留召回范围，也能找到完整章节。
