---
title: "向量数据库是如何工作的？"
description: "从相似度与最近邻问题出发，解释 HNSW、IVF、PQ，并用 FAISS 演示查询。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-06-06"
readingOrder: 30
tags: ["AI", "向量数据库", "RAG", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-a-vector-database-work"
draft: false
---

![向量数据库是如何工作的？的原文封面](/images/posts/how-does-a-vector-database-work.png)

向量数据库存储[嵌入向量](/posts/what-are-embeddings/)，还能查找与查询向量最接近的记录。原文用水果相关文章说明，一个查询可能命中意思相关但措辞不同的内容。

## 为什么需要向量检索？

文本、图片或商品可以通过嵌入模型编码成数列。经过[对比学习](https://outcomeschool.com/blog/contrastive-learning)的模型通常会让含义相近的输入在空间里更接近。需要重复计算同一输入时，也可考虑[嵌入缓存](https://outcomeschool.com/blog/how-does-an-embedding-cache-work)。

```text
"king"   ->  [0.91, 0.12, 0.55]

"queen"  ->  [0.89, 0.15, 0.58]

"banana" ->  [0.10, 0.95, 0.03]
```

关键词或精确条件查询擅长找已知名称、编号和日期。要实现[语义搜索](/posts/how-does-semantic-search-work/)，数据库还要支持按向量的接近程度排列结果。PostgreSQL 也可通过 pgvector 等扩展提供这一能力。

## 一条记录通常存什么？

记录通常包含向量、原始内容或引用，以及分类、日期、作者等元数据。索引按向量找到候选，元数据可用于筛选，原始内容用于展示或交给生成模型。

```text
ID:        101

Vector:    [0.91, 0.12, 0.55, ... ]

Data:      "An apple a day keeps the doctor away."

Metadata:  { "category": "health", "year": 2024 }
```

## 怎样计算相似度？

| 方法 | 计算 | 如何解释 |
| --- | --- | --- |
| [余弦相似度](/posts/cosine-similarity/) | 点积除以两个模长的乘积 | 越接近 1，方向越接近 |
| 点积 | 将对应分量相乘并求和 | 得分同时受方向和长度影响，单位向量时等于余弦相似度 |
| 欧氏距离 | 对应分量差的平方和开方 | 越小，两点越近 |

用 `A = [2, 3]` 和 `B = [4, 6]` 为例，点积是 26，模长分别是 √13 和 √52，余弦相似度为 1。两者欧氏距离为 √13。这说明同方向可以同时有较大的空间距离。选择指标时按嵌入模型的训练和使用方式决定。

## 从逐一比较到近似最近邻

精确检索可以比较每一条向量。百万级记录乘上数百维后，逐一比对的延迟和成本会明显增加。[近似最近邻（ANN）](https://outcomeschool.com/blog/how-does-approximate-nearest-neighbor-ann-search-work)先借助索引缩小候选，再比较相似度，交换的是一部分[召回率](https://outcomeschool.com/blog/precision-vs-recall)和查询速度。

```text
Brute force (exact):
query  ->  compare with ALL 100,000,000 vectors  ->  perfect match, but very slow

ANN (approximate):
query  ->  jump to the promising area  ->  check only a few thousand  ->  very close match, super fast
```

### HNSW

分层可导航小世界索引把向量组织成多层图。上层节点少，用于快速跳到邻近区域。逐层下降后，底层在较密集的图中继续找接近的候选。调大搜索范围通常能提升召回率，但也会增加查询开销。

```text
Layer 2 (top):     A --------------- F        few points, big jumps
                                     |
                                     v
Layer 1 (middle):  A --- C --- D --- F        more points, medium steps
                           |
                           v
Layer 0 (bottom):  A-B-C-D-E-F-G-H            all points, fine steps  ->  reach E
```

### IVF

倒排文件索引先把向量聚成若干组。查询时对比组中心，只在若干最近的组内扫描。若真实近邻落在跳过的组里就可能漏掉，增加探测组数可以改善召回。

```text
   Cluster 1          Cluster 2          Cluster 3
  +----------+       +----------+       +----------+
  |  x    x  |       |  x   x   |       |  x  x  x |
  |    C1    |       |    C2    |       |    C3    |
  |  x    x  |       |   x   x  |       |   x   x  |
  +----------+       +----------+       +----------+

  C1, C2, C3 are the center points (the average of each group)
  each x marks one stored vector inside the cluster
```

```text
Query
  |
  v
Compare with cluster centers only      (cheap, just a few comparisons)
  |
  v
Pick the closest clusters              (say, the 3 nearest clusters)
  |
  v
Search only inside those clusters      (ignore all the other clusters)
```

### PQ

乘积量化把向量分段。每段用训练好的码本中最接近的代表编码，保存编号来降低存储和比较成本。例如 128 维切成 8 段，每段从 256 个代表中选一个。

```text
Original vector (128 numbers, 512 bytes)

[ piece 1 ][ piece 2 ][ piece 3 ] ... [ piece 8 ]
     |          |          |              |
     v          v          v              v
  code 37    code 12    code 200  ...   code 5      (each code is 1 byte)

Compressed vector (8 codes, 8 bytes)
```

IVF-PQ 可用 IVF 缩小查询范围，用 PQ 压缩组内向量表示。

## FAISS 示例

下例使用原文的四维向量，用 `IndexFlatL2` 检索最近项。它是精确、逐一比较的基线。FAISS 也支持 HNSW、IVF 等索引。

```python
import faiss
import numpy as np

# Suppose each vector has 4 numbers (dimensions)
dimension = 4

# Create a simple index that uses euclidean distance
index = faiss.IndexFlatL2(dimension)

# Our stored vectors (each row is one item's embedding)
vectors = np.array([
    [0.91, 0.12, 0.55, 0.10],   # apple article
    [0.10, 0.95, 0.03, 0.40],   # banana article
    [0.88, 0.15, 0.58, 0.12],   # doctor and fruit article
], dtype="float32")

# Add the vectors to the index
index.add(vectors)

# The user's search, turned into a vector
query = np.array([[0.90, 0.13, 0.56, 0.11]], dtype="float32")

# Find the 2 nearest neighbours
distances, ids = index.search(query, 2)

print(ids)
print(distances)
```

```text
[[0 2]]

[[0.0004 0.0013]]
```

## 常见场景

- **[检索增强生成](/posts/retrieval-augmented-generation-rag/)。** 将文档[分块](/posts/chunking-strategies-for-rag/)并建索引，把候选作为回答依据。复杂任务可以用[智能体 RAG](/posts/agentic-rag/)发起多次检索。
- **推荐和以图搜图。** 比较商品、用户或[图片的嵌入向量](/posts/how-do-image-embeddings-work/)，还可用于去重和相似交易排查。
- **[语义缓存](https://outcomeschool.com/blog/how-does-semantic-caching-work)。** 为意思相近的请求复用已有答案。
- **组合检索。** 可搭配[混合搜索](/posts/how-does-hybrid-search-work/)、[HyDE](https://outcomeschool.com/blog/how-does-hyde-work)和[重排序](/posts/how-does-a-reranker-work/)。

## 常见问题

- **能用 PostgreSQL 吗？** 可以。根据数据量、延迟、过滤和运维需求比较 pgvector 与专用方案。
- **什么时候过滤？** 预过滤限制候选范围。后过滤先搜再筛，在过滤条件较严格时可能返回过少结果。
- **一定返回精确近邻吗？** 取决于索引和参数。ANN 通常用少量召回换取速度。
- **文本搜索用哪种度量？** 优先按嵌入模型的建议，使用任务样本验证。
- **RAG 一定需要向量库吗？** 还可以采用关键词、结构索引、全文扫描等[无向量检索](/posts/vectorless-rag/)方式。
