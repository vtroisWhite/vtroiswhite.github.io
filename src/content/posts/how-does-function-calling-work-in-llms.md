---
title: "大语言模型中的函数调用是如何工作的？"
description: "通过天气查询演示模型怎样请求外部工具，应用怎样执行，以及多步和并行调用如何组织。"
publishedAt: "2026-11-09"
readingOrder: 49
originalPublishedAt: "2026-06-13"
tags: ["AI", "LLM", "AI 智能体", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-function-calling-work-in-llms"
draft: false
---

![Outcome School 原文封面](/images/posts/how-does-function-calling-work-in-llms.png)

函数调用（Function Calling，也叫工具调用）让大语言模型通过应用使用 API、数据库或其他程序。模型返回要使用的工具和参数。真正执行函数、处理权限以及回传结果的是应用。

## 为什么需要函数调用

模型的训练数据不能告诉它巴黎现在的气温。如果直接回答，它可能凭过去的信息猜测，产生[幻觉](/posts/why-do-llms-hallucinate-the-token-level-explanation/)。同样，读取内部数据库、发邮件、修改日历等操作，也需要应用接入相应工具。模型处理自然语言与决策，应用负责对外执行。

```text
LLM (the brain)                  Our Application (the hands)
-----------------                ---------------------------
Reads the question
Decides a tool is needed
Outputs JSON request       -->   Reads the JSON request
  (name + arguments)             Runs the real function
                                 Gets the real result
Writes the final answer    <--   Sends the result back
in plain English
```

## 从问题到结果

1. 应用在调用模型时传入工具定义，通常包括名称、描述和参数结构。
2. 用户提问。模型依据问题和工具定义，决定是否发出调用请求。
3. 模型返回工具名和参数，通常由接口提供结构化字段。
4. 应用验证权限和参数，执行函数。
5. 应用把结果写回对话，模型据此回答，或者继续请求别的工具。

## 巴黎天气查询

应用注册 `get_weather`，要求传入字符串参数 `city`。示例中的工具定义为：

```json
{
  "name": "get_weather",
  "description": "Get the current weather for a given city.",
  "parameters": {
    "type": "object",
    "properties": {
      "city": {
        "type": "string",
        "description": "The name of the city, for example Paris."
      }
    },
    "required": ["city"]
  }
}
```

用户问巴黎现在的天气，模型返回以下请求。它只生成调用意图，气象数据由程序获取。

```json
{
  "name": "get_weather",
  "arguments": {
    "city": "Paris"
  }
}
```

```python
result = get_weather(city="Paris")
# result = { "temperature": 18, "condition": "sunny" }
```

应用回传示例气温 18 度和晴天，模型据此给出自然语言回答。整个对话包含用户消息、模型的工具调用、工具结果和模型的最终回复。实际接口通常用调用 ID 把工具结果和对应请求配对。这一来一回构成了[智能体循环](/posts/ai-agent-loop/)的基础。

```text
Message 1 (user)      : "What is the weather in Paris?"
Message 2 (model)     : function call -> get_weather(city="Paris")
Message 3 (tool)      : result -> { "temperature": 18, "condition": "sunny" }
Message 4 (model)     : "The weather in Paris is 18 degrees and sunny."
```

## 多步和并行

如果第二步要根据第一步返回的内容决定参数，先执行第一步并把结果交回模型，再发起第二次调用。这是 [ReAct 智能体](/posts/react-agent/)常用的方式。如果用户同时问巴黎和伦敦的天气，两次查询互不依赖，模型可在一轮返回两个请求，应用并行执行。

```json
[
  { "name": "get_weather", "arguments": { "city": "Paris" } },
  { "name": "get_weather", "arguments": { "city": "London" } }
]
```

## 结构化输出、JSON 模式和函数调用

| 功能 | 约束或表达的内容 | 应用是否执行外部动作 |
| --- | --- | --- |
| 结构化输出 | 答案符合给定字段和类型 | 仅凭该输出不会执行 |
| JSON 模式 | 答案可解析为 JSON | 仅凭该输出不会执行 |
| 函数调用 | 模型请求执行某个函数及参数 | 由应用审核和执行 |

[AI 智能体](/posts/ai-agent/)能用工具把决策转化为行动。[模型上下文协议](/posts/what-is-mcp-model-context-protocol/)则给不同应用提供发现并接入工具和数据的标准方式。即使模型因[提示词注入](/posts/prompt-injection-in-llms/)请求危险操作，执行权限仍由应用掌握。工具授权、参数校验和敏感动作审批都应落在执行端。
