---
title: "LangGraph 是如何工作的？"
description: "用一个客服路由示例解释 LangGraph 的状态、节点和条件边，并介绍工具循环、检查点和人工审核。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-07-02"
tags: ["AI", "LLM", "LangGraph", "工作流", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-langgraph-work"
readingOrder: 59
draft: false
---

![LangGraph 是如何工作的？的原文配图](/images/posts/how-does-langgraph-work.png)

LangGraph 用图来组织大语言模型应用中的步骤。节点执行工作，边规定下一步，共享状态在节点之间传递。它延续了[LangChain](/posts/how-does-langchain-work/)的组件组合方式，适合有条件分支、循环或暂停的流程。

## 为什么用图

单次问答可以直接调用模型。客服系统可能要先判定用户需要账单协助还是技术支持，再分别查询数据、调用工具和生成回复，部分请求还要等人工审批。将这些步骤表示成图，可以明确各步怎样衔接和何时结束。

```text
   +-----+        +-----+        +-----+
   |  A  | -----> |  B  | -----> |  C  |
   +-----+        +-----+        +-----+
    node           node           node
            edge           edge
```

一个点代表一个节点，连接这些点的有向边描述执行方向。图可以分叉，也可以回到前面的节点。设计这种结构是[图工程](/posts/what-is-graph-engineering/)的一部分。

## 共享状态

状态是随流程传递的工作记录，包含用户消息、分类、已查资料、回复或其他字段。可以用 `TypedDict` 表示它的结构。

```python
from typing import TypedDict

class State(TypedDict):
    message: str
    reply: str
```

## 节点、边和条件边

节点是一个接收当前状态并返回更新的函数。

```python
def write_reply(state: State):
    user_message = state["message"]
    answer = "Thanks for your message: " + user_message
    return {"reply": answer}
```

图框架合并节点返回的更新，再按边的定义调度下一步。普通边指向固定节点，条件边根据当前状态选择路径。比如按分类把客服消息转到技术或账单节点。

```text
                              +------------+
                       bill   |  billing   |
                     -------> |    node    |
   +---------+      /         +------------+
   |  route  | ----+
   | message |      \         +------------+
   +---------+       -------> | technical  |
                    not bill  |    node    |
                              +------------+
```

```python
def route_message(state: State):
    if "bill" in state["message"]:
        return "billing"
    return "technical"
```

## 完整示例：客服消息路由

先定义状态、分类节点和两个处理节点。

```python
from typing import TypedDict
from langgraph.graph import StateGraph, START, END

class State(TypedDict):
    message: str
    reply: str

def billing(state: State):
    return {"reply": "This is the billing team. We will help you with your payment."}

def technical(state: State):
    return {"reply": "This is the technical team. We will help you fix the issue."}
```

路由函数读取分类结果，再返回下一节点名称。

```python
def route_message(state: State):
    if "bill" in state["message"]:
        return "billing"
    return "technical"
```

用 `StateGraph` 注册节点和边。从 `START` 到分类节点，分类后进入对应分支，最后到 `END`。编译后可以用输入状态运行图。

```python
builder = StateGraph(State)
builder.add_node("billing", billing)
builder.add_node("technical", technical)

builder.add_conditional_edges(START, route_message)
builder.add_edge("billing", END)
builder.add_edge("technical", END)

graph = builder.compile()
```

账单问题走账单节点。

```python
result = graph.invoke({"message": "I have a question about my bill"})
print(result["reply"])
```

```text
This is the billing team. We will help you with your payment.
```

应用故障走技术节点。

```python
result = graph.invoke({"message": "My app is not working"})
print(result["reply"])
```

```text
This is the technical team. We will help you fix the issue.
```

```text
                              +------------+
                       bill   |  billing   | ---> END
                     -------> |    node    |
   +-------+        /         +------------+
   | START | ----->+
   +-------+        \         +------------+
                     -------> | technical  | ---> END
                    not bill  |    node    |
                              +------------+
```

## 工具由谁调用

工具可以搜索网页、查询数据库或执行其他操作。模型输出工具名称与参数，实际调用由应用中的[智能体](/posts/ai-agent/)运行。[函数调用](/posts/how-does-function-calling-work-in-llms/)介绍了这个接口。

```text
tool:  search
input: weather in Delhi
```

有了工具结果，流程可以回到模型节点，让模型决定继续使用工具还是生成答案。条件边负责在工具节点与结束节点之间选择。

```text
   user question
        |
        v
   +-----------+
   | LLM node  |   recommends a tool (but does not call it)
   +-----------+
        |
        v
   +-----------+
   |   agent   |   reads the recommendation
   +-----------+
        |
        v
   +-----------+
   | tool node |   actually calls the tool, gets the result
   +-----------+
        |
        v   the result goes back to the LLM node
   +-----------+
   | LLM node  |   reads the result and writes the final answer
   +-----------+
```

## 持久化和人工审核

LangGraph 的检查点机制可以保存各步状态。后续请求沿同一个线程 ID 恢复运行时，图可以读回保存的状态。它也能在有实际影响的步骤之前暂停，例如发送邮件前先让人检查内容，审批后从暂停处继续。要跨请求恢复，就需要保留对应的检查点。

## 何时使用 LangGraph

| 场景 | 合适的起点 |
| --- | --- |
| 一个问题和一次模型调用 | 直接调用模型 |
| 固定顺序的组件组合 | 简单的链 |
| 条件分支与回环 | 图和条件边 |
| 需要执行工具 | 图中的工具节点或智能体控制逻辑 |
| 保存和恢复状态 | 检查点 |
| 等待人工审批 | 在图中设置暂停点 |

## 常见问题

- **LangGraph 与 LangChain 有什么区别？** LangChain 提供模型、提示词等组件及组合方式，LangGraph 负责调度带状态的图。
- **节点彼此直接调用吗？** 节点返回状态更新，图的调度器根据边选择下一节点。
- **能回到前面的节点吗？** 可以。常见例子是运行工具后回到模型节点，让它读取结果。
- **人工审核为什么要保存检查点？** 审核前的状态需要持久化，应用之后才能从同一位置继续。
