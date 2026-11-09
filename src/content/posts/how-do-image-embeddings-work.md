---
title: "图像嵌入是如何工作的？"
description: "从 RGB 像素讲到神经网络输出的向量，用 CLIP 演示图像相似度和跨模态搜索。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-06-26"
readingOrder: 28
tags: ["AI", "嵌入向量", "多模态", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-do-image-embeddings-work"
draft: false
---

![图像嵌入是如何工作的？的原文封面](/images/posts/how-do-image-embeddings-work.png)

[嵌入向量](/posts/what-are-embeddings/)用一组数字表示输入。图像嵌入把照片转换成能够比较的向量，相似内容通常位于相近区域。它可用于找同类图片、用文字搜图、匹配商品或识别重复照片。

## 电脑怎样读取图像？

彩色图像通常由像素网格构成。每个像素有红、绿、蓝三个通道，原始数值表示颜色。照片稍微移动或改变亮度，许多像素就会变化，逐像素比较容易错过本来相似的图片。

```text
        One pixel
           |
           v
      +---------+
      |  pixel  |
      +---------+
       /   |   \
      v    v    v
    Red  Green  Blue
    210   180    90
   (each value goes from 0 to 255)
```

## 图像嵌入怎样生成？

将图像输入[卷积神经网络](https://outcomeschool.com/blog/convolutional-neural-network-cnn)或[视觉 Transformer](https://outcomeschool.com/blog/decoding-vision-transformer-vit)。以逐层提取特征作类比，早期层可以响应边缘和角点，中间层组合局部形状，后续层汇集更复杂的特征，最后输出向量。

```text
   Raw image
 (color numbers)
       |
       v
+-----------------+
|  Early layers   |  finds edges and corners
+-----------------+
       |
       v
+-----------------+
|  Middle layers  |  finds parts (eye, ear, wheel)
+-----------------+
       |
       v
+-----------------+
|  Deep layers    |  finds full objects (cat, car)
+-----------------+
       |
       v
+-----------------+
|  Final layer    |  summarizes everything found
+-----------------+
       |
       v
   Embedding
[0.91, 0.12, 0.77, ...]
```

| 图像表示阶段 | 可以怎样理解 |
| --- | --- |
| 原始像素 | 看到照片里的颜色 |
| 较浅层特征 | 发现边缘、线条和拐角 |
| 局部特征 | 发现耳朵、眼睛或车轮等部分 |
| 更深层特征 | 把零散部分组合成更完整的形状 |
| 输出向量 | 压缩用于匹配的特征 |

## 一个三维例子

假设两张猫的照片分别得到 `[0.90, 0.10, 0.05]` 和 `[0.88, 0.12, 0.07]`，汽车得到 `[0.10, 0.95, 0.85]`。真实向量的维度更多，例子只演示相对位置。

```text
   Number space

   Cat A  Cat B
    (.)   (.)            <-- close together


                          (.) Car C    <-- far away
```

## 怎样比较两张图片？

[余弦相似度](/posts/cosine-similarity/)按方向比较向量。图库很大时，可以把向量放入[向量数据库](/posts/how-does-a-vector-database-work/)，用[近似最近邻](https://outcomeschool.com/blog/how-does-approximate-nearest-neighbor-ann-search-work)加快[按含义检索](/posts/how-does-semantic-search-work/)。

## 代码示例

下面用已训练的 `clip-ViT-B-32` 对本地猫和狗的图片编码：

```python
from sentence_transformers import SentenceTransformer
from PIL import Image

# Load a ready-made model that can create image embeddings
model = SentenceTransformer("clip-ViT-B-32")

# Open two images from our computer
cat_image = Image.open("cat.jpg")
dog_image = Image.open("dog.jpg")

# Convert each image into an embedding (a list of numbers)
cat_embedding = model.encode(cat_image)
dog_embedding = model.encode(dog_image)

print(cat_embedding.shape)
```

```text
(512,)
```

再计算两个向量的余弦相似度：

```python
from sentence_transformers import util

# Measure how similar the two embeddings are
similarity = util.cos_sim(cat_embedding, dog_embedding)

print(similarity)
```

这个模型也能对「beach」之类的文本编码。文本和图片在同一空间中时，就可以直接比较，这是[多模态 AI](https://outcomeschool.com/blog/multimodal-ai)的一种应用。

## 使用场景

- 输入「海滩」「生日」等词搜索图库。
- 上传一张鞋子的照片，查找外观相似的商品。
- 查找近似重复照片，或按人脸特征进行归组。
- 根据用户喜欢的图片和视频推荐相似内容。

## 常见问题

- **为什么不直接比较像素？** 光线、尺寸、裁切和视角变化都会明显改变像素。
- **可以用一句话搜索图片吗？** 可以。使用能把文字和图片编码到同一空间的模型。
- **需要自己训练吗？** 可以从预训练的图像或多模态编码器开始。
- **向量有多少维？** 取决于选用模型，原文示例中的模型输出 512 维。
- **照片需要先加标签吗？** 编码器可以直接为像素生成表示。是否借助标签、文件名和时间等信息，可以按检索需求决定。
