---
title: "什么是嵌入向量？"
description: "用水果坐标和密码重置示例说明嵌入向量、余弦相似度、向量检索及更换模型时的注意事项。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-07-31"
readingOrder: 27
tags: ["AI", "嵌入向量", "RAG", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/what-are-embeddings"
draft: false
---

![什么是嵌入向量？的原文封面](/images/posts/what-are-embeddings.png)

电脑擅长比较数字，却无法直接从字符串比较意思。「怎么重置密码」和「忘了登录信息，想修改」用词不同，背后的请求可能相同。嵌入模型把输入变成一组数字，让相近的含义在向量空间里也离得较近。

## 为什么把文本变成数字？

直接按字符匹配容易漏掉同义句。在向量空间中，可以通过计算距离或夹角找到候选：

```text
   Sentence A:  "How do I reset my password?"
   Sentence B:  "I forgot my login details."
```

```text
   Sentence C:  "The bank of the river was muddy."
   Sentence D:  "I need to visit the bank today."
```

**嵌入向量（Embedding）** 是一种学习得到的向量表示。它可以代表一句话、一篇文档或一张照片。

```text
   "How do I reset my password?"   ->   [0.21, -0.48, 0.83, 0.02, ... ]
   "I forgot my login details."    ->   [0.19, -0.44, 0.79, 0.05, ... ]
   "The bank of the river."        ->   [-0.71, 0.33, -0.12, 0.66, ... ]
```

## 用两维坐标理解嵌入

设两个坐标分别表示水果的甜度和大小。甜度和大小都相近的苹果、香蕉会比较接近，柠檬等水果可能离得较远。

```text
   Fruit         Sweetness    Size        Embedding
   -----         ---------    ----        ---------
   Apple             7          5         [7, 5]
   Banana            8          5         [8, 5]
   Lemon             1          3         [1, 3]
   Watermelon        6         10         [6, 10]
```

```text
   Size
    10 |                 W
       |
     8 |
       |
     5 |                    A  B
       |
     3 |  L
       |
     0 +--------------------------------- Sweetness
       0     2     4     6     8     10

   A = Apple [7, 5]        B = Banana [8, 5]
   L = Lemon [1, 3]        W = Watermelon [6, 10]
```

真实模型会使用数百甚至数千个维度。每一维通常没有「甜度」这样可单独解释的含义，向量整体的位置才有用。

```text
   2 dimensions      ->  a flat sheet of paper
   3 dimensions      ->  a room
   768 dimensions    ->  we cannot picture it, and that is fine
```

## 怎样衡量距离？

[余弦相似度](/posts/cosine-similarity/)衡量两个向量方向的接近程度。方向一致时为 1，正交时为 0，方向相反时为 −1。

```text
   Small angle between the arrows  ->  very similar meaning
   Right angle between the arrows  ->  unrelated
   Opposite directions             ->  opposite meaning
```

这些只是数学边界。不同模型和数据集的分数分布不同，不能把某个绝对分数当作通用相关阈值。

## 嵌入向量从哪里来？

嵌入模型从数据学习哪些输入应该靠近。一个典型方法是[对比学习](https://outcomeschool.com/blog/contrastive-learning)，训练时让相关输入的表示靠拢，让无关或较难区分的负例拉远。编码时模型输出学到的向量。

```text
   "I drank a cup of tea in the morning."
   "I drank a cup of coffee in the morning."
   "She poured the tea into a cup."
   "She poured the coffee into a cup."
```

## 词向量的类比运算

某些经典词向量的几何结构可以用下列近似关系演示：

```text
   king  -  man  +  woman   ->  lands very close to  queen
```

```text
   Paris  -  France  +  Italy   ->  lands close to  Rome
```

这种例子展示了向量可能保留关系，效果随模型和词汇而变。

## 嵌入向量能表示什么？

除了词和句子，还可表示完整文档、[图像](/posts/how-do-image-embeddings-work/)、音频、商品和用户。部分[多模态模型](https://outcomeschool.com/blog/multimodal-ai)能将图像和文本映射到同一空间，让文字查询与图片互相匹配。

## 常见应用

- **[语义搜索](/posts/how-does-semantic-search-work/)。** 找到意思相近、措辞不同的内容。
- **[RAG](/posts/retrieval-augmented-generation-rag/)。** 将查询和文档分块向量化，检索证据后交给生成模型。也有使用其他检索形式的[无向量 RAG](/posts/vectorless-rag/)。
- **推荐。** 用[近邻检索](https://outcomeschool.com/blog/how-does-approximate-nearest-neighbor-ann-search-work)寻找相似内容或商品。
- **聚类、去重和分类。** 根据向量接近程度合并重复工单、发现反馈主题，或为消息分配类别。

向量很多时，[向量数据库](/posts/how-does-a-vector-database-work/)可以用索引加快近邻查找。

## 使用时要留意什么？

- 更换嵌入模型后，通常需要重新编码查询和已有索引。不同模型学习到的空间不能直接混用。
- 语义相近只说明内容可能相关。「这种药安全」和「这种药不安全」可能因主题相同而离得很近，仍需核对否定、事实和证据。
- 训练数据的偏差和词汇覆盖会影响表示。内部术语和新词可能需要额外验证。
- 长文压进一个向量会丢细节。可先[分块](/posts/chunking-strategies-for-rag/)，再用[重排序器](/posts/how-does-a-reranker-work/)复核召回内容。

## 常见问题

嵌入向量是向量的一种，由模型学得并用于表示输入。单独的维度通常没有稳定可读的语义。诸如 0.3 的余弦分数要按本地数据和模型解释。更换模型一般需要重建向量索引。对于否定、数值和条件等细节，应通过更精确的比对进一步验证。
