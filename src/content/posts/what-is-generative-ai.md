---
title: "什么是生成式 AI？"
description: "从预测下一个词元讲起，解释生成式 AI 如何学习、如何生成文本和其他内容，以及它的局限。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-08-05"
readingOrder: 22
tags: ["AI", "生成式 AI", "LLM", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/what-is-generative-ai"
draft: false
---

![什么是生成式 AI？的原文封面](/images/posts/what-is-generative-ai.png)

生成式 AI 是能创建新文本、图片、音频、视频和代码的一类人工智能。让它写一首关于雨的诗，它可以根据请求组合出一段文字。

## 「生成」是什么意思？

「生成」指根据学到的规律产出新内容。就像学过很多菜谱的厨师，可以按当前的食材和要求组合一道新菜。生成式模型在训练中学习材料之间的关系，在使用时按输入重新组合它们。

| 典型分类模型 | 生成式模型 |
| --- | --- |
| 在固定选项中选择标签 | 根据请求产生新的内容 |
| 判断图里是猫还是狗 | 画一只骑自行车的猫 |
| 输出是一个类别或决策 | 输出可以是文字、图像、音频或视频 |

```text
   Old AI (decides)                    Generative AI (creates)

   Photo of an animal                  Text: "a cat on the moon"
        |                                     |
        v                                     v
   +-----------+                        +-----------+
   |    AI     |                        |    AI     |
   +-----------+                        +-----------+
        |                                     |
        v                                     v
   "It is a cat"                        A brand new picture
   (a label)                            of a cat on the moon
```

## 模型怎样学习？

语言模型读取大量文本，把文本分成词元，并学习预测接下来可能出现什么。训练时给它看一句话的前半段，让它预测下一个词元，再根据真实词元调整模型。重复之后，模型会逐步学会语法、词语搭配、写作风格和许多概念间的关系。这是[机器学习](https://outcomeschool.com/blog/machine-learning)的一种应用。

训练图像生成模型也需要大量示例，例如图片和对应说明。模型可以分别学到猫、自行车和月球的视觉特征，再按提示合成训练集中未必出现过的画面。

## 模型怎样产生新内容？

许多语言模型使用 [Transformer 解码器](https://outcomeschool.com/blog/encoder-vs-decoder-in-transformers)。它根据已有序列给下一个词元分配概率，选出一个词元后追加到输入，再重复这个步骤。这类逐步生成方式也称为[自回归](https://outcomeschool.com/blog/autoregressive-models)。

```text
   Step 1:  "The sky is"          ->  predict next word  ->  "blue"
   Step 2:  "The sky is blue"     ->  predict next word  ->  "and"
   Step 3:  "The sky is blue and" ->  predict next word  ->  "clear"
   Step 4:  "The sky is blue and clear"  ->  and so on...
```

[温度](https://outcomeschool.com/blog/how-does-temperature-control-llm-output)会改变概率分布的集中程度。[Top-k 和 Top-p](https://outcomeschool.com/blog/how-do-top-k-and-top-p-sampling-work)会限制可供采样的候选词元。即使输入相同，随机采样也可能生成不同的句子。图像、音频和视频模型可以采用其他生成机制。

## 可以生成哪些内容？

- **文本。** 摘要、翻译、邮件、对话和故事。
- **图像。** 插图、产品概念图和照片风格的画面。
- **音频。** 配音、音乐和音效。
- **视频。** 从文本或图像生成短片和动画。
- **代码。** 根据需求生成、补全或解释程序。

## 生成式 AI 中的模型是什么？

模型是训练后用于推理的系统，学到的规律存放在参数里。[大语言模型（LLM）](https://outcomeschool.com/blog/evolution-of-llm-architecture)是用于处理和生成语言的一类模型。生成式 AI 的范围还包括专门生成图像、音频和视频的模型。有关文本生成的细节，可参阅[大语言模型是如何工作的](https://outcomeschool.com/blog/large-language-model-llm)。

## 从训练到使用

```text
   Huge amount of data (text, images, code)
              |
              |  the AI reads and learns the patterns
              v
          Training
              |
              v
        Trained model  (the brain that has learned)
              |
              |  we give a prompt: "Write a poem about rain"
              v
        New content  (a fresh poem, created just now)
```

训练阶段让模型从大量样本中学到规律。使用阶段由用户提供提示词，模型在训练所得参数的基础上生成输出。

## 日常用法与局限

人们可以用生成式 AI 起草文字、解释难懂概念、辅助写程序、做翻译、生成设计原型或为客服提供回答草稿。模型可能产生看起来可信的[幻觉](/posts/why-do-llms-hallucinate-the-token-level-explanation/)，也可能反映训练资料中的偏见。模型掌握的信息有时间边界，输出会受输入方式影响，事实、代码和重要决策仍要核对。

## 常见问题

### 生成式 AI 会复制训练材料吗？

通常根据学到的规律生成内容，不过模型也可能记住并复现训练数据的片段。

### 大语言模型就是生成式 AI 吗？

大语言模型是生成式 AI 的一种，图像和音频生成模型也属于生成式 AI。

### ChatGPT 属于生成式 AI 吗？

ChatGPT 是以生成式模型为基础的应用，能按对话内容生成回答。

### 词元选择的随机性由什么决定？

温度、Top-k、Top-p 等采样设置会改变模型选择高概率词元或较少见词元的机会。

### 生成式 AI 以机器学习为基础吗？

模型利用机器学习从大量样本中学习内容的结构，再用学到的规律生成新内容。
