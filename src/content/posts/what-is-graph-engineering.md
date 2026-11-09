---
title: "什么是图工程？"
description: "用退款政策问答示例解释节点、边、状态、条件路由、并行、检查点和人工审批。"
publishedAt: "2026-11-09"
readingOrder: 44
originalPublishedAt: "2026-08-21"
tags: ["AI", "AI 智能体", "工程实践", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/what-is-graph-engineering"
draft: false
---

![Outcome School 原文封面](/images/posts/what-is-graph-engineering.png)

图工程把 AI 系统设计成一张图，常用于组织[智能体](/posts/ai-agent/)的多步任务。节点负责工作，边指定下一步，状态在节点间传递。可以把它比作地铁图：车站是节点，连接两个站点的轨道是边，乘客随身携带的行李相当于状态，进站和出站分别对应系统入口与出口。

## 为什么需要图

以查找公司政策、回答用户问题为例。一条长提示词可以让模型同时理解、检索、写答案和核验，但难以检查中间过程。[提示词链](/posts/how-does-prompt-chaining-work/)把工作拆开，每步有自己的输入输出，流程仍然只能依次前进。[智能体循环](/posts/ai-agent-loop/)允许模型反复决定下一步，但路径随每次调用变化。图在拆分任务的基础上，把返回、分支和结束条件写进代码。先查资料、写答案、再决定要不要补查，也是[Agentic RAG](/posts/agentic-rag/)的一个例子。

```text
understand  ->  search  ->  write  ->  check
check       ->  send        (when the answer is good)
check       ->  search      (when the sources are missing)
check       ->  write       (when the answer is weak)
```

## 节点、边与状态

**节点**是一项小工作，例如理解问题、调用[工具](/posts/how-does-function-calling-work-in-llms/)、检索资料、草拟答案或验证引用。**边**可以是固定的，也可以根据状态选择一个目的地。**状态**记着用户问题、意图、找到的材料、答案、评分和尝试次数。

```python
state = {
    "question": "What is our refund policy?",
    "intent": None,
    "documents": [],
    "answer": None,
    "score": None,
    "attempts": 0,
}
```

每个节点读写事先定义的字段。结构清晰的状态既方便排查和测试，也方便在组装模型输入时做[上下文工程](/posts/context-engineering/)。

## 先搭一条直线

先实现理解、检索和起草三个节点。每个函数只改自己的状态字段。

```python
def understand(state):
    state["intent"] = model.find_intent(state["question"])
    return state

def search(state):
    state["documents"] = db.search(state["intent"])
    return state

def write(state):
    state["answer"] = model.write_answer(state["question"], state["documents"])
    return state
```

然后连接节点，指定入口与出口，最后从运行结果取出答案。

```python
graph = Graph(state)

graph.add_node("understand", understand)
graph.add_node("search", search)
graph.add_node("write", write)

graph.add_edge("understand", "search")
graph.add_edge("search", "write")

graph.set_entry("understand")
graph.set_finish("write")
```

```python
final_state = graph.run(state)
print(final_state["answer"])
```

这里的 `Graph` 是为了说明思路而简化的接口。[LangGraph](/posts/how-does-langgraph-work/)等实现提供状态图及其执行机制。

## 条件边怎样选择下一步

让 `check` 节点根据文档给答案打分，这是[用大模型当评审](/posts/llm-as-a-judge/)的例子。分数写入状态，尝试次数加一。程序读取状态来选择下一步。

```python
def check(state):
    state["score"] = model.rate_answer(state["answer"], state["documents"])
    state["attempts"] = state["attempts"] + 1
    return state
```

```python
def route_after_check(state):
    if state["score"] >= 8:
        return "send"
    if not state["documents"]:
        return "search"
    return "write"
```

```python
graph.add_node("check", check)
graph.add_node("send", send)

graph.add_edge("write", "check")
graph.add_conditional_edge("check", route_after_check)

graph.set_finish("send")
```

评分至少 8 分就进入 `send`。没有文档时回到 `search`，其余情况退回 `write`。审核节点使用模型的判断，分支本身由程序路由。

## 给循环加上退出条件

`write` 指向 `check`，`check` 又可能回到 `write`。这样的回路能改进答案，也可能在评分永远不到 8 分时耗尽预算。[反思智能体](/posts/reflection-agent/)同样需要限制修订次数。这里规定三次后转人工，再由人工审核后的出口交付。

```python
def route_after_check(state):
    if state["score"] >= 8:
        return "send"
    if state["attempts"] >= 3:
        return "ask_human"
    if not state["documents"]:
        return "search"
    return "write"
```

```python
graph.add_node("ask_human", ask_human)
graph.add_edge("ask_human", "send")
```

```text
understand  ->  search  ->  write  ->  check
check       ->  send        (the score is good)
check       ->  ask_human   (three attempts are over)
check       ->  search      (there are no documents)
check       ->  write       (the answer is weak)
ask_human   ->  send
```

例如用户问退款政策。系统理解意图，找到 `policy-v3.pdf` 和 `faq-refunds.md`。首稿说可以在 30 天内退款，因缺少来源只得 5 分。路由退回写作节点，下一稿注明从购买起算并引用 `policy-v3.pdf`。第二次评分为 9，进入交付节点。

## 并行分支与检查点

内部资料和网页检索彼此独立，可以同时启动。一个节点分出两个并行分支叫扇出，两个分支到齐后合并叫扇入。

```python
graph.add_edge("understand", "search_docs")
graph.add_edge("understand", "search_web")

graph.add_edge("search_docs", "merge")
graph.add_edge("search_web", "merge")
```

```python
def merge(state):
    state["documents"] = state["doc_results"] + state["web_results"]
    return state
```

并行节点应写入各自的字段，或由框架通过明确的合并规则处理同一字段。这些是常见的[AI 编排模式](/posts/ai-orchestration/)。

检查点在执行中持久化状态。系统重启后，用同一运行 ID 找到检查点并从已完成步骤之后恢复。

```python
graph = Graph(state, checkpointer=Database())

final_state = graph.run(state, thread_id="user-123")
```

## 人工审批与错误分支

发送邮件、发起退款、删除记录或发布代码前，图可以先暂停。人工可以批准执行，也可以修正草稿后再恢复。

```python
graph.add_node("send_email", send_email, interrupt_before=True)
```

```python
if human_says_yes:
    graph.resume(thread_id="user-123")
else:
    graph.update_state(thread_id="user-123", changes={"answer": edited_answer})
    graph.resume(thread_id="user-123")
```

网络错误也可以写进状态。比如内部检索不可用时转到网页检索，两条路径都没有材料时转人工。

```python
def search(state):
    try:
        state["documents"] = db.search(state["intent"])
        state["error"] = None
    except Exception:
        state["error"] = "search service is down"
    return state
```

```python
def route_after_search(state):
    if state["error"]:
        return "search_web"
    if not state["documents"]:
        return "ask_human"
    return "write"
```

```python
graph.add_conditional_edge("search", route_after_search)
```

## 图工程与循环工程

| 方面 | 循环工程 | 图工程 |
| --- | --- | --- |
| 下一步由谁决定 | 模型按当前观察选择动作 | 程序按边和状态选择节点 |
| 路径 | 随每轮决策改变 | 允许的路径可预先列举 |
| 测试 | 重点观察端到端轨迹 | 可单独测试各节点与路由 |
| 适合的任务 | 需要探索、阶段不确定 | 阶段明确、可验证或需审批 |

[循环工程](/posts/what-is-loop-engineering/)可以出现在图的某个节点里。一个已知的审核流程可以用图表达，图中调查未知问题的节点再使用循环。

## 适用场景与工程做法

工单、退款、文档审阅和报告等有明确阶段的工作适合图。检查点能支持长任务，清晰的路由让系统可解释。简单任务加一张图会增加开销，阶段尚未明确的任务也难以提前画出路径。

先写清状态字段和每个节点的责任，再从一条能运行的路径开始。每个回路设置硬上限，每条分支都能到达出口。将异常变成可追踪的分支，记录节点输入输出以获得[可观测性](/posts/ai-agent-observability/)。对每个节点和条件边分别测试，再验证完整流程。
