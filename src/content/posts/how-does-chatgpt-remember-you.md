---
title: "ChatGPT 是如何记住你的？"
description: "从上下文窗口、已保存的记忆和对话历史出发，了解 ChatGPT 怎样把跨会话的信息交给模型，以及用户如何管理记忆。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-10-12"
tags: ["AI", "LLM", "ChatGPT", "记忆", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-chatgpt-remember-you"
readingOrder: 53
draft: false
---

![ChatGPT 是如何记住你的？的原文配图](/images/posts/how-does-chatgpt-remember-you.png)

Riya 是一名教师。星期一，她告诉 ChatGPT 自己吃素，住在班加罗尔。星期六，她新开一个对话，请它推荐一道快捷晚餐。ChatGPT 推荐了一道素食，就像记住了几天前的聊天。

ChatGPT 会把有用的信息保存在模型之外，在需要时取出并提供给模型。模型负责生成回答，应用负责保存和查找记忆。

## 为什么语言模型默认没有跨会话记忆

大语言模型在训练中学会根据前文[预测下一个词元](https://outcomeschool.com/blog/autoregressive-models)。日常对话的推理过程使用已有模型权重，模型在这次推理时能用的是本次请求提供的内容。

[上下文窗口](https://outcomeschool.com/blog/context-window)规定模型一次能处理多少信息。把它想象成桌面，放在桌上的材料模型可以读到，桌外的材料需要应用挑选再放进来。桌面大小有限，怎样挑选材料是[上下文工程](/posts/context-engineering/)的一部分。

## 同一对话中的记忆

在一次聊天里，Riya 先介绍自己的名字，接着问模型她叫什么。

```text
Riya: My name is Riya.
ChatGPT: Nice to meet you, Riya.
Riya: What is my name?
ChatGPT: Your name is Riya.
```

ChatGPT 把当前问题与前文一起交给模型，所以模型可以从上文找到答案。

```text
Riya: My name is Riya.
ChatGPT: Nice to meet you, Riya.
Riya: What is my name?
```

当 Riya 新开对话时，旧对话的内容不会自然出现在新对话里。跨对话使用信息，需要应用额外提供相应的记忆。

## 跨对话记忆

ChatGPT 像有一本独立于模型的记事本。应用在生成回答前找出相关笔记，再把它们放到桌上。这也是[AI 智能体记忆](/posts/ai-agent-memory/)的常见设计。ChatGPT 的个性化信息还可以来自用户自己写的自定义指令。

### 已保存的记忆

用户可以说「记住我是素食者」，也可以在普通聊天中提供信息，例如「我教八年级数学」。ChatGPT 可能判断第二条今后有用并将它保存。保存时，界面可能会提示「记忆已更新」。

```text
- Riya is a vegetarian.
- Riya lives in Bengaluru.
- Riya teaches maths to class 8 students.
```

这些简短的事实便于加入新对话，无须把整段原始聊天一起交给模型。

### 引用聊天记录

Riya 上个月和 ChatGPT 讨论了十二月去果阿旅行，但没有要求它记住。现在她问需要带什么，应用可以从以前的聊天找出旅行地点和时间，让模型推荐轻薄棉衣和防晒霜。应用会筛选与当前问题相关的细节。

| 方面 | 已保存的记忆 | 引用聊天记录 |
| --- | --- | --- |
| 信息形态 | 单独保存的简短事实 | 从旧对话里找出的有用细节 |
| 来源 | 用户要求保存，或 ChatGPT 判断值得保存 | 当前对话需要时参考旧聊天 |
| 是否有固定清单 | 可在设置中查看 | 没有固定清单 |
| 随时间的变化 | 可以在设置中删除 | 会随聊天及其相关性而变化 |

### 自定义指令

用户可以在设置中写明自己的背景和回复偏好。例如，Riya 可以说明自己教八年级数学，希望收到带示例的简明回复。自定义指令由用户维护，ChatGPT 不会自行改写。

```text
About me: I am a school teacher. I teach maths to class 8 students.
How to reply: Keep answers short and use simple examples.
```

## 怎样把记忆放入提示词

提示词是交给模型的完整输入。用户只写了一行，应用仍可以加上系统规则、自定义指令、相关记忆和对话前文。下面是便于理解的示意，ChatGPT 内部提示词的确切格式并未公开。

```text
[Rules from the company that makes ChatGPT]
You are ChatGPT, a helpful assistant.

[Custom Instructions]
I am a school teacher. Keep answers short.

[Saved memories]
- Riya is a vegetarian.
- Riya lives in Bengaluru.

[Useful details from past chats]
- Riya often asks for South Indian dishes.

[Current chat]
Riya: Suggest a quick dinner recipe for tonight.
```

果阿旅行计划与晚餐无关，因此在这个例子里没有放入提示词。

## 从素食偏好到晚餐推荐

1. 星期一，Riya 在对话 A 里要求记住她吃素。
2. ChatGPT 保存一条关于饮食偏好的笔记。
3. 对话 A 结束，笔记留在应用的独立存储中。
4. 星期六，她在对话 B 里请 ChatGPT 推荐快捷晚餐。
5. 应用把「Riya 是素食者」放进新请求。
6. 模型读到这条信息，推荐了蔬菜乌普玛。

## 一个简化的代码示例

```text
memory_store = []  # our notebook, kept outside the model

def save_memory(note):
    memory_store.append(note)

def build_prompt(user_message):
    notes = "\n".join("- " + note for note in memory_store)
    return (
        "You are a helpful assistant.\n"
        "What you know about the user:\n" + notes + "\n\n"
        "User: " + user_message
    )

# Chat A on Monday
save_memory("Riya is a vegetarian.")

# Chat B on Saturday, a brand new chat
prompt = build_prompt("Suggest a quick dinner recipe.")
reply = call_llm(prompt)  # send the full prompt to the LLM
```

这里的 `memory_store` 是应用端记事本，`save_memory` 添加笔记，`build_prompt` 把笔记放到用户问题前。示例假定 `call_llm` 可以调用一个语言模型，打印提示词会看到下面的内容。

```text
You are a helpful assistant.
What you know about the user:
- Riya is a vegetarian.

User: Suggest a quick dinner recipe.
```

真实系统会使用数据库保留笔记，并检索本次需要的信息。代码中的列表用于演示数据怎样流动。

## 查看、更新和删除记忆

可以询问「你记得我的哪些信息？」，也可以在设置的「个性化」部分查看或删除已保存的记忆。可以请 ChatGPT 忘记住址，也可以用「我搬到浦那了」更新它。设置里还可以关闭已保存记忆或引用聊天记录。删除一段聊天后，由这段聊天单独保存的记忆仍需另行处理。

### 临时聊天

临时聊天不会使用已保存的记忆，也不会创建新记忆，且不会出现在聊天历史中。原文用计划惊喜礼物举例，这次谈话里的细节不会作为记忆带进之后的聊天。

## 记忆适合什么场景

饮食、职业、回复方式等偏好可以在多次对话中复用，备考等长期工作也容易接续。如果笔记已经过时，模型可能根据旧住址给出回答。检索也可能漏掉关键细节，应用还可能保存用户无意保留的信息。检查并更新记忆，可以减少这几类问题。

## 常见问题

- **记忆会改变模型权重吗？** 对话时应用从独立存储取出信息，用它构造提示词。
- **ChatGPT 能主动记住信息吗？** 它可能把判断为有用的信息保存起来，界面会给出提示。
- **模型会收到所有过去的聊天吗？** 上下文窗口有限，应用选取与当前任务相关的片段。
- **谁能改自定义指令？** 用户在设置中编写和更新这部分内容。
