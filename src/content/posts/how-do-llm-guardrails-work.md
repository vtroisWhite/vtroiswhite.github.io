---
title: "大语言模型的安全护栏是如何工作的？"
description: "从输入和输出两侧理解大语言模型的安全护栏，并用 Python 示例演示关键词检查、隐私脱敏和分类模型。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-08-10"
tags: ["AI","LLM","AI 安全","转载","翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-do-llm-guardrails-work"
readingOrder: 2
draft: false
---

![Outcome School 文章封面](/images/posts/how-do-llm-guardrails-work.png)

安全护栏是部署在大语言模型（LLM）外围的检查机制。用户消息先经过输入护栏，模型写好的答案再经过输出护栏。以银行客服为例，“如何重设密码？”可以交给模型回答，而请求入侵他人账户的消息应提前拦截。即使输入正常，答案也可能泄露电话号码，仍需在返回前检查。

## 为什么需要护栏

大语言模型从大量文本中学习，并根据上下文预测接下来的词元。它可能给出有害、错误或偏题的回答。应用可以根据业务风险设置多种检查：

| 类型 | 作用 | 示例 |
| --- | --- | --- |
| 主题 | 约束服务范围 | 银行助手只处理银行相关请求 |
| 安全 | 拦截有害内容 | 拒绝危险操作指导 |
| 隐私 | 保护敏感数据 | 隐藏电话号码、邮箱或卡号 |
| 格式 | 检查约定结构 | 验证列表或结构化字段 |
| 事实 | 识别可疑陈述 | 用依据检查生成的说法 |

## 输入和输出各有一道关

```text
用户消息 → 输入护栏 → 主模型 → 输出护栏 → 用户
               ↓                  ↓
           拦截并拒绝          拦截或脱敏
```

输入护栏可以先匹配禁用词。这个例子将消息转成小写，再检查固定字符串。

```python
banned_words = ["hack", "bomb", "steal password"]

def input_guardrail(user_message):
    text = user_message.lower()
    for word in banned_words:
        if word in text:
            return "blocked"
    return "allowed"

print(input_guardrail("How do I hack a bank account?"))
print(input_guardrail("How do I reset my password?"))
```

两次调用分别返回 `blocked` 和 `allowed`。这能演示控制流，但插入空格或换一种表达就可能绕过字符串匹配。

输出护栏可以通过规则识别某种数据形态。例如，将回答里的连续十位数字替换成占位文本。

```python
import re

def output_guardrail(llm_answer):
    return re.sub(r"\d{10}", "[hidden]", llm_answer)

answer = "You can call our agent at 9876543210 for help."
print(output_guardrail(answer))
```

这段代码只演示一种简单模式。其他电话格式和敏感信息需要各自的识别规则。

## 使用另一个模型进行安全分类

还可以让一个[较小的模型](https://outcomeschool.com/blog/small-language-models-slms)负责判断消息是否安全。检查模型读取消息的含义并返回 `safe` 或 `unsafe`。这种分工与[以大模型为裁判](/posts/llm-as-a-judge/)的评估思路相通。

```python
def handle_request(user_message):
    if classifier_model(user_message) == "unsafe":
        return "无法协助处理该请求。"

    answer = main_llm(user_message)
    if classifier_model(answer) == "unsafe":
        return "该回答无法提供。"
    return answer
```

`classifier_model` 和 `main_llm` 分别代表两次分类和一次生成所调用的服务。原文用 [Jev 一类的 System One 模型](/posts/jev-and-system-one-models-explained/)举例。这类模型可以在固定标签中选择，并返回经过校准的概率，适合需要低延迟的分类环节。

## 两种请求怎样通过护栏

危险请求到达输入护栏后，系统将其判为 `unsafe` 并直接拒绝，主模型不会看到该消息。正常的营业时间查询会先通过输入护栏，由主模型生成答案，再由输出护栏检查隐私和有害内容。只有通过检查的回答才会返回给用户。

## 局限和实践

[越狱攻击](/posts/jailbreaking-in-llms/)可能通过新措辞绕过已知规则。护栏也可能把正常请求判为危险，造成[误报](https://outcomeschool.com/blog/precision-vs-recall)。两侧的检查都会增加一些响应时间，规则和分类器需要根据新样本持续更新。

- 同时检查输入和输出，按风险叠加规则和模型。
- 使用礼貌、清楚的拒绝信息，记录被拦截的请求供分析。
- 上线前覆盖正常请求和攻击样本，持续执行[大语言模型评估](/posts/llm-evaluation/)。
