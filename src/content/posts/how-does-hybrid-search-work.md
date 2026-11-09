---
title: "混合搜索是如何工作的？"
description: "比较 BM25 与语义检索的优势，用 RRF 和归一化加权解释两份候选列表如何合并。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-07-07"
readingOrder: 32
tags: ["AI", "检索", "RAG", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-hybrid-search-work"
draft: false
---

![混合搜索是如何工作的？的原文封面](/images/posts/how-does-hybrid-search-work.png)

混合搜索同时执行关键词搜索和[语义搜索](/posts/how-does-semantic-search-work/)，再融合两份候选。这样既能匹配产品型号、错误码等精确文字，也能覆盖说法不同但意思相近的内容。

## 两类搜索各擅长什么？

BM25 等词项相关性算法适合对齐词汇，查找产品名称或准确代码。用户问「怎么把鞋退回去」，页面标题写的是「鞋类退货政策」，只依赖同词匹配可能漏掉有用文档。

语义搜索用[嵌入向量](/posts/what-are-embeddings/)代表查询和文档，再通过[向量检索](/posts/how-does-a-vector-database-work/)和[近似最近邻索引](https://outcomeschool.com/blog/how-does-approximate-nearest-neighbor-ann-search-work)找含义相近的候选。它有助于找回同义改写，遇到只差一位数字的 SKU 或版本号时，仍需要精确词匹配。

```text
TEXT  ->  EMBEDDING MODEL  ->  VECTOR (a list of numbers)

"return your shoes"   ->   [ 0.91, 0.12, 0.77, ... ]
"send shoes back"     ->   [ 0.89, 0.15, 0.74, ... ]   <- very close to the one above
"order a pizza"       ->   [ 0.04, 0.88, 0.21, ... ]   <- far away, different meaning
```

```text
            far away (different meaning)
                                          *  "order a pizza"


       *  "send shoes back"   (the query)
        \
         \  close by
          \
           *  "return your shoes"


                 *  "track my order"
                    (a bit farther)
```

## 怎样同时运行两种搜索？

收到用户问题后，可以并行执行 BM25 与向量搜索，分别取前若干候选。合并时按文档 ID 去重，再计算融合排名。

```text
                       Query: "how to send shoes back"
                                     |
                 +-------------------+-------------------+
                 |                                       |
          KEYWORD SEARCH                          SEMANTIC SEARCH
            (BM25)                                  (embeddings)
                 |                                       |
        ranked list A:                          ranked list B:
        1. Doc-7   (score 9.1)                  1. Doc-3   (score 0.95)
        2. Doc-2   (score 6.4)                  2. Doc-7   (score 0.88)
        3. Doc-9   (score 4.2)                  3. Doc-5   (score 0.81)
```

查询存在歧义时，[多查询检索](/posts/how-do-query-rewriting-and-multi-query-retrieval-work/)还可以用多个改写查询扩大候选范围。

## 倒数排名融合（RRF）

RRF 使用结果在每个列表中的位置。文档出现在多个列表中时，各表贡献相加。常见写法是 `score(d) = Σ 1 / (k + rank(d))`，没有出现的列表贡献为零，常数 `k` 用来减弱前几名之间的差异。

```text
Doc-7:  rank 1 in keyword list  ->  1/1 = 1.00
        rank 2 in semantic list ->  1/2 = 0.50
        total = 1.00 + 0.50 = 1.50

Doc-3:  not in keyword list     ->  0
        rank 1 in semantic list ->  1/1 = 1.00
        total = 0 + 1.00 = 1.00

Doc-2:  rank 2 in keyword list  ->  1/2 = 0.50
        not in semantic list    ->  0
        total = 0.50 + 0 = 0.50
```

由于只用名次，RRF 无须比较两个检索器的原始分数，适合作为容易验证的融合起点。

## 归一化后加权

也可以把 BM25 分数和语义分数分别映射到类似的范围，再按权重混合。

```text
final score = (weight_keyword  x  normalized keyword score)
            + (weight_semantic x  normalized semantic score)
```

如果用最小值和最大值归一化，需要处理全体同分等情况。权重应根据查询类型和产品评估集确定。比如商品编号查询可给词项匹配更大权重，自然语言问题可给语义匹配更大权重。

| 方式 | 依据 | 特点 |
| --- | --- | --- |
| RRF | 每路排名 | 不依赖原始分数的尺度，调参较少 |
| 加权融合 | 归一化后的分数 | 可精细调节，但对归一化和权重选择敏感 |

## 在 RAG 中使用

[检索增强生成](/posts/retrieval-augmented-generation-rag/)可以把混合搜索作为召回层。索引前可用[上下文检索](/posts/how-does-contextual-retrieval-work/)为分块补足背景，查询端可用 [HyDE](https://outcomeschool.com/blog/how-does-hyde-work) 补充语义线索，融合后再通过[重排序器](/posts/how-does-a-reranker-work/)精排。不同资料也可以使用[无向量 RAG](/posts/vectorless-rag/)等方案。

```text
   User question
        |
        v
  +--------------+     fetched documents       +-----+
  | HYBRID       | ------------------------>   | LLM | --> Answer
  | SEARCH       |                             +-----+
  | (retrieval)  |                                ^
  +--------------+                                |
                                            User question
```

## 常见问题

- **混合搜索是否总能改进？** 看任务、候选深度和融合方式。用实际查询对照单路搜索验证。
- **能直接相加 BM25 和向量分数吗？** 原始值含义和范围不同。可先归一化，或改用 RRF。
- **怎么选融合方法？** 可先试 RRF，在有高质量标注或明确业务权重时再试加权。
- **权重怎么定？** 在覆盖关键词、自然语言和困难样本的评估集上尝试不同权重，测相关性与召回率。
