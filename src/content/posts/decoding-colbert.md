---
title: "什么是 ColBERT？延迟交互检索详解"
description: "解释 ColBERT 如何分别编码查询和文档，用 MaxSim 在词元级匹配，并权衡索引大小、延迟和检索质量。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-08-12"
readingOrder: 34
tags: ["AI", "检索", "RAG", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/decoding-colbert"
draft: false
---

![什么是 ColBERT？延迟交互检索详解的原文封面](/images/posts/decoding-colbert.png)

ColBERT 将查询和文档分别编码成多个词元向量，检索时用 MaxSim 衡量两者相关性。文档可以提前处理，打分时仍能对齐查询和文档的细节。Omar Khattab 和 Matei Zaharia 于 2020 年提出这一方法。[ColBERT 论文](https://arxiv.org/abs/2004.12832)

## 两类基线

交叉编码器把查询和候选一起交给 [BERT 编码器](https://outcomeschool.com/blog/encoder-vs-decoder-in-transformers)，可以细致判断相关性，但要为每一对输入运行模型，常用于[重排序](/posts/how-does-a-reranker-work/)。单向量双编码器能分别处理查询和文档，提前建立向量索引，常用于大规模[语义搜索](/posts/how-does-semantic-search-work/)，但压缩为单个向量可能损失局部信息。

```text
  1. Cross-encoder  (accurate, slow)

     query + document together  ->  BERT  ->  score
     BERT runs once per pair, nothing can be stored ahead of time


  2. Single-vector dual encoder  (fast, blunt)

     query     ->  BERT  ->  [ one vector ]
                                          >--  one dot product  ->  score
     document  ->  BERT  ->  [ one vector ]


  3. Late interaction, ColBERT  (accurate and fast)

     query     ->  BERT  ->  [ v1  v2  v3 ]
                                          >--  MaxSim  ->  score
     document  ->  BERT  ->  [ v1  v2  v3  v4  v5 ]
```

## ColBERT 怎样编码？

ColBERT 在 BERT 输出后保留各词元的[嵌入向量](/posts/what-are-embeddings/)，用线性层降低维度并归一化。查询和文档用不同标记区分。短查询补 `[MASK]` 位置，让模型学习扩展线索。文档侧丢弃标点对应的向量以节省空间。

```text
q1 = [0.6, 0.8, 0.0]   (length = sqrt(0.36 + 0.64) = 1)
d1 = [0.8, 0.6, 0.0]   (length = sqrt(0.64 + 0.36) = 1)

dot = 0.6*0.8 + 0.8*0.6 + 0.0*0.0 = 0.48 + 0.48 = 0.96
```

### MaxSim 怎么计算？

对每个查询词元，计算它与所有文档词元的点积，取最大的一个。归一化之后，点积等于[余弦相似度](/posts/cosine-similarity/)。把各查询词元的最大值相加，就是这个文档的得分。

```text
S(q, d) = sum over i of ( max over j of ( Eq_i · Ed_j ) )
```

原文以多个查询词元和文档词元演示：

```text
Query tokens                Document tokens
q1 = [0.6, 0.8, 0.0]        d1 = [0.8, 0.6, 0.0]
q2 = [0.0, 0.6, 0.8]        d2 = [0.0, 0.0, 1.0]
                            d3 = [1.0, 0.0, 0.0]
```

```text
q1 · d1 = 0.6*0.8 + 0.8*0.6 + 0.0*0.0 = 0.48 + 0.48 + 0.00 = 0.96
q1 · d2 = 0.6*0.0 + 0.8*0.0 + 0.0*1.0 = 0.00 + 0.00 + 0.00 = 0.00
q1 · d3 = 0.6*1.0 + 0.8*0.0 + 0.0*0.0 = 0.60 + 0.00 + 0.00 = 0.60

q2 · d1 = 0.0*0.8 + 0.6*0.6 + 0.8*0.0 = 0.00 + 0.36 + 0.00 = 0.36
q2 · d2 = 0.0*0.0 + 0.6*0.0 + 0.8*1.0 = 0.00 + 0.00 + 0.80 = 0.80
q2 · d3 = 0.0*1.0 + 0.6*0.0 + 0.8*0.0 = 0.00 + 0.00 + 0.00 = 0.00
```

```text
   q1: max(0.96, 0.00, 0.60) = 0.96   (best match is d1)
   q2: max(0.36, 0.80, 0.00) = 0.80   (best match is d2)
```

```text
   score = 0.96 + 0.80 = 1.76
```

最大值保留每个查询词元最强的文档匹配，不会被许多无关词元平均稀释。最终排名仍根据整个查询的 MaxSim 总分决定。

```text
q1 similarities to the document: [0.96, 0.00, 0.60]

MaxSim uses:   0.96        (rewards the single strong match)
Average gives: (0.96 + 0.00 + 0.60) / 3 = 1.56 / 3 = 0.52   (dilutes the strong match)
```

```text
q1 · b1 = 0.6*1.0 + 0.8*0.0 + 0.0*0.0 = 0.60
q1 · b2 = 0.6*0.8 + 0.8*0.0 + 0.0*0.6 = 0.48
q2 · b1 = 0.0*1.0 + 0.6*0.0 + 0.8*0.0 = 0.00
q2 · b2 = 0.0*0.8 + 0.6*0.0 + 0.8*0.6 = 0.48

   q1: max(0.60, 0.48) = 0.60
   q2: max(0.00, 0.48) = 0.48

   score(B) = 0.60 + 0.48 = 1.08
```

## 怎样训练？

给定查询、正例段落和负例段落，分别计算它们的 MaxSim，再训练模型给正例更高的分数。这个过程与[对比学习](https://outcomeschool.com/blog/contrastive-learning)的思路类似，用 softmax 和[交叉熵损失](https://outcomeschool.com/blog/math-behind-cross-entropy-loss)计算错误。

```text
   <  q  ,  d+  ,  d-  >

   q   =  the query
   d+  =  a passage that DOES answer the query   (the positive)
   d-  =  a passage that does NOT answer it      (the negative)
```

```text
e^2.5 = 12.182
e^0.5 = 1.649

p    = 12.182 / (12.182 + 1.649) = 12.182 / 13.831 = 0.881
loss = -ln(0.881) = 0.13
```

## 怎样支持大规模检索？

ColBERT 可以重排已有检索器返回的候选，也可以用[向量索引](/posts/how-does-a-vector-database-work/)索引所有词元，通过[近似最近邻](https://outcomeschool.com/blog/how-does-approximate-nearest-neighbor-ann-search-work)为每个查询词元收集候选文档，再对候选计算精确 MaxSim。

主要代价是索引体积。单向量表示中一段只有一个向量，而在 ColBERT 中可能要为这一段存上百个词元向量。论文报告其索引约占 154 GB，具体大小随集合、向量维度与压缩方式变化。

```text
Single-vector model:  1 vector   x 128 numbers =     128 numbers
ColBERT:              100 vectors x 128 numbers =  12,800 numbers
```

## 论文报告的重排序结果

在原文引用的 MS MARCO 段落检索实验中，ColBERT 的 MRR@10 与 BERT 重排序器接近，同时明显降低了论文设置下的重排序延迟。

| 方法 | MRR@10 | 报告的重排序延迟 |
| --- | --- | --- |
| BERT 重排序器 | 34.7 | 约 10,700 毫秒 |
| ColBERT 重排序 | 34.9 | 约 61 毫秒 |

ColBERTv2 用残差压缩缩小索引，PLAID 用中心向量先剪枝，再对较少候选计算相关性。ColPali 把延迟交互延伸到视觉文档检索，将查询词元与页面的[图像块](https://outcomeschool.com/blog/decoding-vision-transformer-vit)匹配。

## 常见问题

- **为什么能预先计算文档向量？** 文档编码阶段不需要知道未来的查询，交互发生在计算 MaxSim 时。
- **一定优于单向量检索吗？** 它保留细粒度匹配信息，但收益取决于模型、数据和索引参数，同时存储成本通常更高。
- **能作为第一阶段吗？** 可以。索引词元并按查询词元收集候选。也能作为[关键词检索](/posts/how-does-hybrid-search-work/)后的精排器。
- **能放进 RAG 吗？** 可以在[检索增强生成](/posts/retrieval-augmented-generation-rag/)中做召回或重排，再把原始段落交给生成模型。
