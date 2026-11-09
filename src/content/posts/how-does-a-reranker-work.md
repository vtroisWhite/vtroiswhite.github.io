---
title: "重排序器是如何工作的？"
description: "通过法国首都示例比较双编码器和交叉编码器，说明 RAG 怎样在召回后复核候选。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-06-08"
readingOrder: 33
tags: ["AI", "检索", "RAG", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-a-reranker-work"
draft: false
---

![重排序器是如何工作的？的原文封面](/images/posts/how-does-a-reranker-work.png)

重排序器在初次检索后再给候选文档评分，把能回答当前问题的内容排到前面。它常用在[检索增强生成](/posts/retrieval-augmented-generation-rag/)和[智能体 RAG](/posts/agentic-rag/)中。

## 为什么要分两阶段？

第一阶段面向整个文档库，用 BM25、[语义搜索](/posts/how-does-semantic-search-work/)或[混合搜索](/posts/how-does-hybrid-search-work/)快速取回一批可能相关的文档。第二阶段只读候选集合，复核每篇是否能回答这个问题。以原文的量级为例，先从全文库找一两百项，再留下最相关的五到十项。

```text
Question
   |
   v
[ Retriever ]   --> fetches many candidate documents (fast, rough)
   |
   v
[ Reranker ]    --> reorders the candidates by true relevance (slow, precise)
   |
   v
[ LLM ]         --> reads the best documents and writes the final answer
   |
   v
Answer
```

```text
Corpus (1,000,000 documents)
        |
        |  Stage 1: fast retriever
        v
   100 candidates  (rough shortlist)
        |
        |  Stage 2: reranker
        v
   Top 5 documents  (carefully reordered, most relevant)
```

BM25 会关注相同的词项。向量检索会把问题和文档各压缩成一个[嵌入向量](/posts/what-are-embeddings/)，通过[向量数据库](/posts/how-does-a-vector-database-work/)与[近似最近邻索引](https://outcomeschool.com/blog/how-does-approximate-nearest-neighbor-ann-search-work)高效查找。单一向量可能弱化数字、限定条件和否定等细节。[HyDE](https://outcomeschool.com/blog/how-does-hyde-work)与[多查询检索](/posts/how-do-query-rewriting-and-multi-query-retrieval-work/)能扩展第一阶段的候选，随后仍可重排。

## 双编码器与交叉编码器

| 比较项 | 双编码器 | 交叉编码器 |
| --- | --- | --- |
| 输入方式 | 分别编码查询和文档 | 拼接查询和单篇文档 |
| 输出 | 每段一个向量，再比较相似度 | 每对输入输出一个相关性分数 |
| 文档侧能否预计算 | 可以 | 需要针对每个查询重新计算 |
| 适合 | 大规模召回 | 小批量精排 |

```text
BI-ENCODER (used for fast retrieval)

  Question  -->  [encoder]  -->  [ vector A ]
                                       \
                                        compare distance --> score
                                       /
  Document  -->  [encoder]  -->  [ vector B ]
```

```text
CROSS-ENCODER (used for reranking)

  Question + Document  -->  [ model reads them together ]  -->  relevance score (for example, 0.92)
```

交叉编码器同时看到问题和文档，能对照查询与原句中的词元。这往往能改进排序，但每增加一个候选都要多处理一个查询与文档配对。

## 用法国首都问题演示

对于「法国首都是哪里」，第一阶段可能找出介绍法国、巴黎、埃菲尔铁塔、以及德国首都柏林的片段。交叉编码器把问题和每段组成一对并评分：

```text
Question: "What is the capital of France?"

(Question + Document 1)  -->  cross-encoder  -->  0.34
(Question + Document 2)  -->  cross-encoder  -->  0.97
(Question + Document 3)  -->  cross-encoder  -->  0.55
(Question + Document 4)  -->  cross-encoder  -->  0.21
```

按分数重新排列后，直接说明巴黎是法国首都的段落应排在前面：

```text
   BEFORE (first-stage order)            AFTER (reranked order)

   +-----------------------+             +-----------------------+
   | 1. Document 1  (0.34) |             | 1. Document 2  (0.97) |
   | 2. Document 4  (0.21) |   rerank    | 2. Document 3  (0.55) |
   | 3. Document 2  (0.97) |   ------->  | 3. Document 1  (0.34) |
   | 4. Document 3  (0.55) |             | 4. Document 4  (0.21) |
   +-----------------------+             +-----------------------+
```

最后按上下文预算留下前几项。把大量分块都放进提示词会增加开销，也可能让关键证据[淹没在中间](/posts/lost-in-the-middle-problem-in-llms/)。

## 延迟、成本和召回之间的取舍

```text
Run cross-encoder on ALL 1,000,000 docs  -->  extremely slow and costly  (we avoid this)

Run cross-encoder on TOP 100 only         -->  fast enough and very accurate  (we do this)
```

加大候选数有机会把更相关的文档送入精排，同时增加模型调用量。若初次检索根本没返回相关文档，重排序无法找回它。应分别评估第一阶段的[召回率](https://outcomeschool.com/blog/precision-vs-recall)和第二阶段的排序质量。重复编码的开销也可结合具体系统考虑[嵌入缓存](https://outcomeschool.com/blog/how-does-an-embedding-cache-work)。

## 延迟交互与 ColBERT

[ColBERT](/posts/decoding-colbert/)给每个词元保留向量，先分别编码查询与文档，打分时再做词元级匹配。它可以用来精排候选，也可以为全文库建立词元索引做首阶段检索。

```text
Option A - ColBERT as the Reranker (Stage 2 only):

   Question --> [ Retriever ] --> [ ColBERT ] --> [ LLM ] --> Answer

Option B - ColBERT as Retriever and Reranker together (Stage 1 + Stage 2):

   Question --> [ ColBERT ] --> [ LLM ] --> Answer
```

预先存储文档词元向量，查询延迟较低，索引更大。只在收到查询时编码少量候选，节省存储，但增加单次查询延迟。

## 常见问题

- **可以直接拿交叉编码器搜全文库吗？** 数据量小时可行，规模上升后逐对计算通常过慢。
- **应该重排多少条？** 从代表性请求测延迟和排序效果，调召回深度以及最终保留数量。
- **可以本地运行吗？** 可以试用 BGE 等可本地部署的重排序模型，也有托管服务。
- **0.8 意味着什么？** 分数通常适合给同一次查询的候选排序。要作为跨查询的阈值，需用标注数据校准。
