---
title: "Transformer 架构是如何工作的？"
description: "用英译法示例串起 Transformer 的完整流程，逐步理解词元、位置编码、注意力、前馈网络，以及编码器和解码器的分工。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-04-07"
tags: ["AI", "LLM", "Transformer", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/decoding-transformer-architecture"
draft: false
---

![Outcome School 的 Transformer 架构文章封面](/images/posts/decoding-transformer-architecture.png)

Transformer 是现代[大语言模型（LLM）](https://outcomeschool.com/blog/large-language-model-llm)常用的架构。它接收一串词元（token），通过注意力机制处理词元之间的关系，再产生任务所需的输出。把架构拆开来看，每个组件负责的工作都很明确。本文会沿着数据的流向，逐步说明这些组件怎样配合。

## 先看全貌

从输入和输出来看，Transformer 处理的都是词元序列。文本可以拆成词元，输出的词元也可以还原成文本，因此我们可以先把它理解成一个「输入文本，输出文本」的系统。

比如，输入 `Translate: I love learning`，模型可能输出法语 `J'adore apprendre`。输入 `What is the capital of France?`，模型可能回答 `The capital of France is Paris.`。下面以翻译为例，看看这个过程如何完成。

## 为什么需要 Transformer

在 Transformer 出现前，循环神经网络（RNN）通常按顺序处理输入，就像从左到右逐词读句子。[RNN 与 Transformer 的对比](https://outcomeschool.com/blog/how-do-rnns-and-transformers-differ)

这种方式有两个问题。

1. **较早的信息容易被淡化。** 句子越长，前面的信息就要经过越多次状态更新。读到第 50 个词时，第 1 个词的信息可能已经很弱。
2. **训练难以并行。** 第 2 步要等第 1 步的结果，第 3 步又要等第 2 步。序列越长，需要依次执行的步骤就越多。

Transformer 用注意力让序列中相隔很远的词元直接交换信息，也让训练时多个位置可以并行计算。2017 年，谷歌研究人员在论文《Attention Is All You Need》中提出了这种架构。

## 编码器和解码器

原始 Transformer 由两部分组成。

- **编码器（Encoder）** 读取输入，为每个位置生成结合上下文的表示。
- **解码器（Decoder）** 利用这些表示和已有的输出，逐步生成结果。

可以把两者想成读者和作者。读者通读材料并整理笔记，作者参考笔记写出新的文本。[编码器与解码器的区别](https://outcomeschool.com/blog/encoder-vs-decoder-in-transformers)

## 第一步　把文本变成向量

模型接收的是数值。文本进入 Transformer 之前，先经过两个步骤。

**词元化（Tokenization）** 将文本切成词元。一个词元可以是一个词、词的一部分，也可以是一个字符。为了便于说明，下面把 `I love learning` 简化成 `I`、`love`、`learning` 三个词元。[大语言模型的词元化](https://outcomeschool.com/blog/tokenization-in-llms) · [词元化视频](https://www.youtube.com/watch?v=sK2s9I84EVI)

**嵌入（Embedding）** 将词元映射为数值向量。可以把向量看成词元的数字指纹。例如，`happy` 和 `joyful` 含义接近，它们的向量可能也比较接近。`happy` 和 `car` 的向量则可能相差较远。[嵌入视频](https://www.youtube.com/watch?v=LedXW6xl21s)

## 第二步　加入位置信息

编码器可以同时处理各个位置。仅凭词元及其嵌入，模型无法区分 `I love AI` 和 `AI love I` 的排列顺序。

原始 Transformer 给各个位置分配不同的**位置编码（Positional Encoding）**，再把位置向量加到相应的词元嵌入上。就像剧院里的观众可以同时入场，但每个人的座位号不同。相加后，每个输入向量同时携带词元和位置的信息。

## 第三步　用注意力汇集上下文

注意力机制让每个位置根据当前上下文，从其他位置获取信息。以 `The cat sat on the mat because it was tired.` 为例。模型处理 `it` 时，可以给 `cat` 更高的权重、给 `mat` 更低的权重，从而把代词和更可能指代的对象联系起来。

### 注意力如何计算

每个词元的当前表示会被投影为三个向量。[Q、K、V 的计算过程](https://outcomeschool.com/blog/math-behind-attention-qkv)

- **查询（Query，Q）** 表示当前位置在找什么。
- **键（Key，K）** 用于衡量一个位置与查询的匹配程度。
- **值（Value，V）** 携带一个位置可供汇集的信息。

计算某个位置的注意力时，先用它的 Q 与可见位置的 K 做点积，得到匹配分数。然后将分数除以键向量维度的平方根 `√dₖ`，以免点积随维度增大而过大。接着用 softmax 把分数转成总和为 1 的权重，最后按这些权重对各位置的 V 求加权和。[缩放点积注意力](https://outcomeschool.com/blog/scaling-dot-product-attention) · [softmax 函数](https://outcomeschool.com/blog/softmax-function)

得到的新向量同时包含当前位置的信息和与它相关的上下文。比如，`it` 的表示可以吸收更多来自 `cat` 的信息，再交给下一层处理。

### 多头注意力

[多头注意力](https://outcomeschool.com/blog/multi-head-attention-in-transformers)会使用多组独立的投影，对同一输入并行计算多次注意力，再合并结果。就像几位编辑读同一篇稿件，有人关注语法，有人核对事实，有人检查行文是否连贯。

不同的头可以学到不同类型的关系。例如，一个头可能更关注主语和动词，另一个头可能更关注形容词及其修饰的名词。

```text
                 输入
                  │
       ┌──────────┼──────────┐
       ↓          ↓          ↓
     Head 1     Head 2  …  Head N
       │          │          │
       └──────────┼──────────┘
                  ↓
               合并输出
```

## 第四步　用前馈网络变换表示

注意力汇集上下文之后，[前馈网络](https://outcomeschool.com/blog/feed-forward-networks-in-llms)会进一步变换每个位置的表示。一层里的所有位置共用同一套前馈网络参数，并各自完成计算。位置之间的信息交换已在注意力子层完成。

## 第五步　加入残差连接和层归一化

原始 Transformer 在注意力和前馈等子层中都使用了残差连接和层归一化。

- **残差连接（Residual Connection）** 将子层的输入加回子层输出，可写成 `子层输出 = 子层变换(输入) + 输入`。就像上课记笔记时，把新内容补到已有笔记里，原来的信息仍有路径向后传递。
- **层归一化（Layer Normalization）** 在原始架构中对相加后的表示做归一化，帮助维持数值和训练过程的稳定。[层归一化与批归一化的区别](https://outcomeschool.com/blog/batch-normalization-vs-layer-normalization)

## 第六步　堆叠多层 Transformer 块

多头自注意力和前馈网络连同残差连接、层归一化，构成一个基本的 Transformer 块。多个块依次堆叠，前一层的输出成为下一层的输入。原始 Transformer 的解码器块还包含交叉注意力，后面会单独说明。

```text
输入
  ↓
第 1 层（多头注意力 + 前馈网络）
  ↓
第 2 层（多头注意力 + 前馈网络）
  ↓
 …
  ↓
第 N 层（多头注意力 + 前馈网络）
  ↓
输出
```

多头注意力的并行发生在一个子层内部，层堆叠则沿着数据流顺序执行。原始 Transformer 的编码器和解码器各有 6 层，1750 亿参数版 GPT-3 有 96 层。

这个过程有点像重读一本书。第一次掌握大意，接下来能逐渐发现先前忽略的联系。每一层都在上一层的表示上继续加工。

## 第七步　看编码器怎样读取输入

编码器的每一层包括两个子层，后面分别接残差连接和层归一化。

1. [**自注意力（Self-Attention）**](https://outcomeschool.com/blog/self-attention-in-transformers)让各个位置从同一输入序列汇集信息。
2. **前馈网络**分别变换每个位置的表示。

还是以 `I love learning` 为例。第一层中，`love` 可以通过注意力关联主语 `I` 和宾语 `learning`，然后经过前馈网络处理。后续层继续利用已经融入上下文的向量。走完整个编码器后，`learning` 的表示既包含这个词的信息，也反映了它在这句话中的角色。

编码器将所有输入位置的最终表示交给解码器。

## 第八步　看解码器怎样生成输出

原始 Transformer 的每个解码器块有三个子层，各自配有残差连接和层归一化。

1. **带掩码的自注意力。** 每个位置只能看到当前及更早的解码器输入位置。预测后续词元时，模型只能利用已经给定或生成的内容。这个限制由[因果掩码](https://outcomeschool.com/blog/causal-masking-in-attention)实现。
2. [**交叉注意力（Cross-Attention）**](https://outcomeschool.com/blog/cross-attention-in-transformers)。Q 来自解码器，K 和 V 取自编码器输出。这样，解码器可以在生成当前位置的结果时查找相关的源文本信息。
3. **前馈网络。** 与编码器一样，在每个位置独立变换表示。

### 如何选出下一个词元

解码器最后一层输出的仍然是向量。线性层把当前向量映射为词表中每个词元的分数。如果词表有 5 万个词元，就有 5 万个分数。softmax 可以把这些分数转成概率分布。实际生成时可通过[温度](https://outcomeschool.com/blog/how-does-temperature-control-llm-output)调节分布，也可使用 [top-k 或 top-p 采样](https://outcomeschool.com/blog/how-do-top-k-and-top-p-sampling-work)筛选候选词元。

假设英译法时已经生成了 `J'`，下一步的概率可能如下。数值仅用于示意。

| 候选词元 | 概率 |
| --- | ---: |
| `adore` | 0.72 |
| `aime` | 0.15 |
| `mange` | 0.01 |
| 其他词元合计 | 0.12 |

如果每一步都选概率最高的词元，模型这一步就会输出 `adore`。

## 第九步　走一遍完整的英译法流程

下面把各个组件串起来，将 `I love learning` 译为 `J'adore apprendre`。例子里的词元划分是简化示意。

### 编码阶段

1. 把英文拆成 `I`、`love` 和 `learning`。
2. 为各个词元查找嵌入，并加上对应位置的编码。
3. 让序列依次经过 6 层编码器。每层的自注意力汇集上下文，前馈网络进一步处理各位置的表示。
4. 把编码器输出交给解码器，供交叉注意力读取。

### 解码阶段

1. **生成 `J'`。** 解码器从开始词元出发。自注意力只能看到开始词元，交叉注意力读取英文输入的表示。解码器根据最后的分数选出 `J'`。
2. **生成 `adore`。** 此时解码器已有开始词元和 `J'`，可以结合这两项和英文输入继续预测。
3. **生成 `apprendre`。** 解码器利用前面生成的 `J'`、`adore`，以及编码器提供的信息，预测下一个词元。
4. **生成结束词元。** 解码器输出专用的结束词元，译文生成完成。

## Transformer 的三种变体

| 变体 | 常见模型 | 适用任务 |
| --- | --- | --- |
| 仅编码器 | BERT | 从输入提取信息，如邮件分类、情感分析、在给定文本中定位答案 |
| 仅解码器 | GPT | 按因果顺序生成文本，如问答、写代码和对话 |
| 编码器与解码器 | 原始 Transformer、T5 | 将一个序列转换成另一个序列，如翻译和摘要 |

仅解码器模型使用因果自注意力处理输入和已有输出。由于没有独立的编码器，这类模型也省去了用于连接编码器的交叉注意力。

## Transformer 为什么有效

- **训练可并行。** 编码器可同时处理输入中的所有位置，解码器训练时也可以用已知的目标序列和掩码并行计算。推理时，自回归解码仍要逐步生成。
- **远距离位置可以直接交互。** 在不受掩码限制的自注意力中，第 1 个位置和第 1000 个位置能够直接建立联系，无需经过中间所有位置的状态传递。
- **架构容易扩展。** 层数、模型宽度和训练数据规模都可以增加，发展出拥有数十亿乃至更多参数的模型。[大语言模型架构的演进](https://outcomeschool.com/blog/evolution-of-llm-architecture)
- **可以适配多种任务。** 同一套基本组件能用于翻译、问答、文本生成、代码编写和摘要等场景。

## 小结

词元化、嵌入和位置编码把文本变成带有位置信息的向量。注意力负责跨位置汇集信息，前馈网络分别变换各个位置的表示，残差连接和层归一化帮助稳定训练。编码器通过堆叠这些组件处理输入，原始 Transformer 的解码器再通过交叉注意力读取编码器结果，逐步生成输出。

## 常见问题

### GPT 使用完整的编码器和解码器吗？

GPT 使用仅解码器架构。生成时，每一步利用已经给定或生成的词元预测下一个词元。

### 多头注意力和多层堆叠有什么区别？

多个注意力头在一个子层中并行运行。多层堆叠让多个完整的 Transformer 块依次处理数据，每个块有自己的注意力和前馈网络。

### Transformer 通常有多少层？

层数由模型设计决定。原始 Transformer 的编码器和解码器各有 6 层，1750 亿参数版 GPT-3 堆叠了 96 个 Transformer 块。

### 解码器总是选择概率最高的词元吗？

选择概率最高的候选是一种生成策略。实际应用也会调节温度，或用 top-k、top-p 等采样策略控制输出的多样性。

### 为什么解码器看不到后续词元？

生成时，后续词元还未产生。因果掩码使解码器在训练中也遵守相同的可见范围，避免模型提前利用正在预测的后续内容。
