---
title: "大语言模型为什么会产生幻觉？从词元层面解释"
description: "从下一个词元的概率分布出发，理解模型为什么会给出看似可信的错误，并了解降低幻觉的方法。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-10-14"
tags: ["AI","LLM","模型评估","转载","翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/why-do-llms-hallucinate-the-token-level-explanation"
readingOrder: 9
draft: false
---

![Outcome School 文章封面](/images/posts/why-do-llms-hallucinate-the-token-level-explanation.png)

幻觉是 [大语言模型](https://outcomeschool.com/blog/large-language-model-llm)给出的看似可信、实际错误或虚构的内容。例如，模型不了解一位鲜为人知的作家 Meera Joshi，却写出了具体的出生年份。要理解这种错误，可以看模型写出年份时发生了什么。

## 模型怎样选择词元

[词元](https://outcomeschool.com/blog/tokenization-in-llms)是模型读写文本的单位，可能是一个词、一部分词、数字或带空格的词片段。例如 `Meera Joshi was born in 1962` 可能被拆成 `Me`、`era`、` Joshi`、` was`、` born`、` in`、` 19`、`62`。具体切法取决于模型。下面为了便于说明，把一年当作一个词元。

模型根据已有文本为每个候选词元计算分数，将分数变成概率，再选一个词元拼到末尾。例如，在 `The capital of France is` 后面，假设 ` Paris` 的概率是 92%，` a` 为 3%，` the` 为 2%，` located` 为 1%，其余总计 2%。选好后，模型会用新的文本继续预测下一步。

```text
读已有文本 → 计算候选词元概率 → 选择一个词元 → 加入文本 → 重复
```

语法和常见搭配通常好预测。年份、人名和引用编号等承载事实的词元，要求模型掌握特定信息。熟悉的事实往往有一个明显领先的候选，例如爱因斯坦出生年份 1879。模型缺少信息时，多个候选年份可能只有一点点概率差异。

```python
import random

sharp_guess = {"1879": 0.95, "1878": 0.02, "1880": 0.01, "other": 0.02}
flat_guess = {
    "1962": 0.14, "1958": 0.13, "1971": 0.13, "1965": 0.12,
    "1960": 0.12, "1968": 0.12, "1955": 0.12, "1974": 0.12,
}

def pick_next_token(guesses):
    return random.choices(list(guesses), weights=list(guesses.values()))[0]

print(pick_next_token(sharp_guess))
print(pick_next_token(flat_guess))
```

多运行几次，第一行大多是 `1879`，第二行却经常变化。最终句子都能读得很顺，概率分布的差异不会自动出现在答案里。

## 幻觉是怎样累积的

1. **每步都要选一个词元。** “我不知道”也是一串词元，只有在当前上下文和训练偏好让它有足够概率时才会生成。
2. **采样可以选中不确定的候选。** [温度](https://outcomeschool.com/blog/how-does-temperature-control-llm-output)影响概率分布与随机性。平坦的分布可以产生不同年份，降低温度也只会让某个猜测更稳定。
3. **已经输出的词元进入后续上下文。** 如果一开头选了“是”，后面就可能顺着这个方向写，即使稍后才看到错误。判断 3,827 是不是质数时，先尝试分解可发现 `43 × 89 = 3,827`。
4. **一个错误会推动更多错误。** 错选年份之后，模型可能继续围绕这个年份编写地点和经历，形成内部连贯的错误叙述。
5. **合理词元可以拼出不存在的组合。** 常见姓氏、年份、标题和刊名各自都像真的，组合在一起却可能是一条虚构引文。
6. **答案隐藏了原来的不确定性。** 生成的自然语言并不显示某个年份是以高概率选出，还是从一组相近的候选中碰巧抽到。

## 怎样减少幻觉

- 通过[检索增强生成（RAG）](/posts/retrieval-augmented-generation-rag/)把可信文档和问题一起送入模型，让关键事实在上下文中可见。
- 在训练、评分或提示中鼓励模型在证据不足时承认不确定，并据此测试拒答表现。
- 结合[词元对数概率](https://outcomeschool.com/blog/logprobs-in-llms)和多次作答的差异，定位值得人工复核的名字、年份和数字。
- 用[思维链提示](/posts/how-does-chain-of-thought-prompting-work/)把关键结论放到推导之后。事实问答可降低温度，再独立核查答案、引用和原始材料。

这些方法针对不同的错误来源。把验证集中在承载事实的词元上，更容易发现一段流畅回答中的猜测。
