---
title: "什么是大语言模型中的越狱攻击？"
description: "了解大语言模型为什么会绕过安全训练、常见越狱方式，以及如何用输入、输出和权限控制分层防护。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-11-05"
tags: ["AI","LLM","AI 安全","转载","翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/jailbreaking-in-llms"
readingOrder: 3
draft: false
---

![Outcome School 文章封面](/images/posts/jailbreaking-in-llms.png)

越狱攻击是指用户通过设计消息，诱导大语言模型违反原本会遵守的安全规则。直接索取有害内容可能被拒绝，攻击者却可能把同样的请求包装进角色扮演、虚构故事或多轮对话。“越狱”这个比喻来自手机领域，指绕过系统原先设定的限制。

## 模型是如何学会拒绝的

[大语言模型](https://outcomeschool.com/blog/large-language-model-llm)从大量文本中学到知识，也会接触到有害信息。模型训练者会在后续训练中提供安全问答示例，教模型何时回答、何时拒绝。也可以请人对候选回答打分，通过[基于人类反馈的强化学习（RLHF）](https://outcomeschool.com/blog/reinforcement-learning-from-human-feedback-rlhf)提高安全、有用回答的偏好。应用还会在运行时提供系统指令，规定角色和允许处理的范围。

## 越狱为什么有效

一方面，训练要求模型既要遵循用户指令，又要安全地拒绝。在特意构造的请求里，这两个目标会发生冲突。例如，用户让模型以“当然，做法如下”开头。模型一旦按要求写出开头，已经生成的文字又会影响[接下来的词元](https://outcomeschool.com/blog/logprobs-in-llms)，让模型更容易接着给出本应拒绝的回答。

另一方面，模型在预训练中能理解许多语言和文本格式，安全训练覆盖的形式却有限。对于罕见表达、编码或异形文本，模型可能理解了请求，却没有将其识别为应当拒绝的内容。越狱会利用这个覆盖差距。

## 常见越狱方式

| 方式 | 如何施加影响 |
| --- | --- |
| 角色扮演 | 让模型扮成没有限制的角色，例如早期的 DAN |
| 虚构故事 | 将有害请求藏在电影场景或假设问题里 |
| 编码和变形 | 用编码、罕见语言、反序或字符替换包装请求 |
| 大量示例 | 在[长上下文](https://outcomeschool.com/blog/context-window)中填入大量虚构的有害问答，让模型接着模仿 |
| 多轮渐进 | 从无害问题逐轮推进到目标，例如研究中所说的 Crescendo |
| 异常后缀 | 在请求后附加算法搜索出的异常词串，改变模型的续写倾向 |

一些旧方式在更新的模型上已经被针对性处理，类似的变体仍可能出现。

## 越狱与提示词注入

越狱关注怎样让模型突破行为限制，常见形式是用户直接把攻击写进消息。[提示词注入](/posts/prompt-injection-in-llms/)关注模型是否把不可信内容误当成了指令。例如，用户让助手总结网页，网页里的隐藏指令却要求模型发出数据。这两类攻击可能同时出现。

风险包括有害输出、数据泄露、违反业务规则，以及用户对系统失去信任。拥有工具权限的 [AI 智能体](/posts/ai-agent/)还可能发邮件、执行代码或发起支付，后果会从错误的文本扩展到外部操作。

## 分层防御

- 在系统指令中明确角色、限制和拒绝条件，把用户输入当作待处理数据。
- 用独立分类器检查输入，阻止可疑请求进入主模型。生成后继续检查输出。[安全护栏的工作原理](/posts/how-do-llm-guardrails-work/)
- 只开放完成任务所需的数据和[工具](/posts/how-does-function-calling-work-in-llms/)，为高影响操作设置人工审批。
- 用角色扮演、编码和多轮样本定期测试，记录异常并更新防护。

下面是演示三层控制流的 Python 示例。调用方需要提供 `call_llm` 和 `is_harmful`。实际系统可使用训练好的分类器识别固定字符串之外的攻击。

```python
BLOCKED_PATTERNS = ["you are dan", "ignore your rules", "no restrictions"]

def looks_like_jailbreak(text):
    return any(pattern in text.lower() for pattern in BLOCKED_PATTERNS)

def safe_chat(user_message):
    if looks_like_jailbreak(user_message):
        return "无法协助处理该请求。"

    answer = call_llm(
        system="你是银行助手，请遵守服务范围和安全规则。",
        user=user_message,
    )
    if is_harmful(answer):
        return "该回答无法提供。"
    return answer
```

安全训练、运行时检查和权限控制分别覆盖不同的失效点。把它们叠加起来，即使某次检查失手，也能限制攻击造成的影响。
