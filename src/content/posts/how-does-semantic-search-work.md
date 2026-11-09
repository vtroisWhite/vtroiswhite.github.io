---
title: "语义搜索是如何工作的？"
description: "从汽车维修查询出发，解释关键词搜索的局限、向量编码与近邻检索，并串起语义搜索的完整流程。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-07-23"
readingOrder: 31
tags: ["AI", "检索", "RAG", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-semantic-search-work"
draft: false
---

![语义搜索是如何工作的？的原文封面](/images/posts/how-does-semantic-search-work.png)

用户搜索「fixing my automobile」，资料里写的可能是「repairing a car」。语义搜索根据两段话的含义匹配，能找回关键词不同但主题相符的资料。

## 关键词搜索与语义搜索

关键词搜索按词项查找包含查询词的文档，适合错误码、产品编号、人名和准确术语。查询词与文档措辞不同时，可能漏掉结果。

```text
   the collection                       the user
  +----------------+
  |  Document 1    |
  |  Document 2    |              query: "how do I get my money back"
  |  Document 3    |                       |
  |  Document 4    |                       v
  |  ...           |  <------ match ------ search
  +----------------+                       |
                                           v
                              results: the few documents
                              that help with the query
```

语义搜索把查询和文档变成[嵌入向量](/posts/what-are-embeddings/)，让含义相近的文本落在向量空间的邻近位置。

```text
Document:  "How to repair your car at home"
```

```text
Query:  "fixing my automobile"
```

```text
        meaning space (simplified to 2 numbers)

   ^
   |                                    dog .
   |                              cat .
   |
   |        automobile .
   |        car .
   |     vehicle .
   |
   +----------------------------------------->
```

## 怎样比较含义接近程度？

[余弦相似度](/posts/cosine-similarity/)比较向量的夹角。方向越接近，得分越高。这个得分可用于排序候选，实际阈值由数据、模型和业务判断决定。

```text
similarity( "car", "automobile" )  =  0.95   -> very similar, almost the same meaning
similarity( "car", "vehicle"    )  =  0.88   -> similar, related meaning
similarity( "car", "banana"     )  =  0.04   -> not related at all
```

## 先建索引，再处理查询

**索引阶段。** 文档可以先[切分](/posts/chunking-strategies-for-rag/)，然后逐段调用嵌入模型，存入[向量数据库](/posts/how-does-a-vector-database-work/)。同时保存文档 ID、原文和必要的元数据。

```text
PREPARE ONCE (done ahead of time):

  Document 1  -->  embedding model  -->  [numbers]  -->  +-----------------+
  Document 2  -->  embedding model  -->  [numbers]  -->  | vector database |
  Document 3  -->  embedding model  -->  [numbers]  -->  | (all embeddings)|
  ...                                                    +-----------------+
```

**查询阶段。** 用户提交问题后，用兼容的编码方式把查询转成向量，再检索最相近的文档片段。可以直接把候选展示给用户，也可以用[重排序器](/posts/how-does-a-reranker-work/)做进一步筛选。

```text
SEARCH (done on every query):

  user query
  "fixing my automobile"
        |
        v
  embedding model  -->  query embedding [numbers]
                              |
                              v
                     +-----------------+
                     | vector database |   find nearest by cosine similarity
                     +-----------------+
                              |
                              v
              top matches (highest similarity):
              1. "How to repair your car at home"   (0.93)
              2. "Car maintenance basics"           (0.81)
              3. "Replacing a flat tyre"            (0.67)
```

通常同一嵌入模型同时用于文档和查询。部分检索模型针对两类输入提供各自的指令或配套编码器，核心是让输出位于同一个可比较的空间。

## 数据量大时怎么办？

精确搜索可以逐条比较所有向量，数据规模大时可用[近似最近邻](https://outcomeschool.com/blog/how-does-approximate-nearest-neighbor-ann-search-work)加速。索引先找可能相关的区域或邻居，在更少候选中精排。效果取决于索引结构、搜索参数和数据分布。

```text
Exact search:        compare query against ALL embeddings   -> perfect, but slow at scale
Approximate (ANN):   compare query against a SMALL subset   -> almost perfect, and very fast
```

## 实际应用

语义搜索可用于客服帮助中心、商品搜索、内部知识库与相似内容推荐。在[检索增强生成](/posts/retrieval-augmented-generation-rag/)里，它把相关片段送给模型作为证据。关键词与语义检索各有擅长的输入，可以用[混合搜索](/posts/how-does-hybrid-search-work/)保留两边的结果。某些场景也可使用[无向量 RAG](/posts/vectorless-rag/)。

## 常见问题

- **语义搜索一定比关键词好？** 语义适合改写和自然语言问题，关键词适合精确术语和标识符。
- **能换一个查询模型吗？** 查询和文档编码必须处于兼容空间。换用互不兼容的模型时需要重新索引。
- **每次搜索都重新生成文档向量吗？** 文档在索引阶段预处理，用户发来问题时计算查询向量。
- **每次都能找到精确最近项吗？** 精确搜索可以，近似索引的结果受候选范围和参数影响。
- **RAG 怎样使用它？** 将相关文档片段取回，作为模型生成回答时的上下文。
