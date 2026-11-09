---
title: "余弦相似度是如何工作的？"
description: "通过两个水果向量逐步计算点积和模长，比较余弦相似度与欧氏距离。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-10-31"
readingOrder: 29
tags: ["AI", "嵌入向量", "检索", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/cosine-similarity"
draft: false
---

![余弦相似度是如何工作的？的原文封面](/images/posts/cosine-similarity.png)

余弦相似度衡量两个非零向量的方向有多接近。方向相同为 1，夹角 90° 为 0，方向完全相反为 −1。这个指标常用于[语义搜索](/posts/how-does-semantic-search-work/)和推荐。

## 从向量和夹角开始

向量是一组有顺序的数。用甜度和圆润程度表示水果，苹果可以记作 `[8, 9]`，柠檬可以记作 `[3, 8]`。在平面上，它们是从原点出发的两支箭头。夹角越小，方向越相近。

```text
roundness
   ^
 9 |                * apple [8, 9]
 8 |      * lemon [3, 8]
   |
   |
   |
   +-------------------------> sweetness
   0      3         8
```

余弦把夹角映射到 −1 到 1：

```text
angle 0 degrees         angle 90 degrees        angle 180 degrees

  A B                     A
  | |                     |                     B <--- ---> A
  ↓ ↓                     |
                          +----> B

cosine = 1              cosine = 0              cosine = -1
most similar            unrelated               most opposite
```

## 余弦相似度公式

对非零向量 A、B，余弦相似度为 `(A · B) / (‖A‖ × ‖B‖)`。点积将对应分量相乘后相加。模长是所有分量的平方和开平方。除以两者模长的乘积，相当于只比较方向。

## 手算示例

取 `A = [8, 9]` 和 `B = [3, 8]`。先求点积：

```text
A dot B = (8 x 3) + (9 x 8)
        = 24 + 72
        = 96
```

接着分别计算两个模长：

```text
|A| = square root of (8^2 + 9^2)
    = square root of (64 + 81)
    = square root of 145
    = 12.04
```

```text
|B| = square root of (3^2 + 8^2)
    = square root of (9 + 64)
    = square root of 73
    = 8.54
```

代回公式：

```text
Cosine Similarity = 96 / (12.04 x 8.54)
                  = 96 / 102.82
                  = 0.93
```

## 用 Python 计算

```python
import math

def cosine_similarity(a, b):
    dot_product = 0
    for i in range(len(a)):
        dot_product += a[i] * b[i]

    magnitude_a = math.sqrt(sum(x * x for x in a))
    magnitude_b = math.sqrt(sum(y * y for y in b))

    return dot_product / (magnitude_a * magnitude_b)

vector_a = [8, 9]
vector_b = [3, 8]

result = cosine_similarity(vector_a, vector_b)
print(result)
```

```text
0.9330948702273482
```

代码里的两个数组应是同维非零向量。零向量没有可用来计算夹角的方向。

## 为什么比较夹角？

短文中 car 和 engine 各出现一次，长文中各出现十次，向量可写成 `[1, 1]` 和 `[10, 10]`。两篇文章的词频规模不同，构成比例相同，所以余弦相似度是 1。

```text
engine
   ^
10 |                   * B [10, 10]
   |                 .
   |               .
   |             .
   |           .
   |         .
   |       .
   |     .
   |   .
 1 | * A [1, 1]
   +----------------------> car
   0 1                 10
```

## 和欧氏距离有什么区别？

| 比较项 | 余弦相似度 | 欧氏距离 |
| --- | --- | --- |
| 测量对象 | 向量方向的接近程度 | 两个点之间的直线距离 |
| 大小是否影响 | 对正比例缩放不敏感 | 会受向量长度影响 |
| 范围 | −1 到 1 | 0 到无穷大 |
| 如何理解结果 | 分数越高，方向越相似 | 距离越大，位置越远 |

搜索引擎可以用它比较[嵌入向量](/posts/what-are-embeddings/)，[向量数据库](/posts/how-does-a-vector-database-work/)可据此寻找相似文档。推荐、语义去重和问答检索也可以使用这种度量。

## 常见问题

- **会是负数吗？** 当两个向量夹角大于 90° 时会是负数。
- **0 代表什么？** 数学上代表正交。实际语义相关性仍取决于模型和数据。
- **点积和余弦相似度有什么关系？** 用模长归一化后的向量求点积，就等于余弦相似度。
- **几千维也能算吗？** 可以。同样计算各维乘积和平方和，维数越多，计算量相应增加。
