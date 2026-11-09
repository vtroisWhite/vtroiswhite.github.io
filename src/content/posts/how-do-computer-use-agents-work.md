---
title: "操控计算机的智能体是如何工作的？"
description: "用查天气的示例说明计算机操作智能体如何看屏幕、判断动作、点击和输入，以及系统怎样控制操作权限。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-06-24"
tags: ["AI", "AI 智能体", "桌面自动化", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-do-computer-use-agents-work"
readingOrder: 61
draft: false
---

![计算机操作智能体是如何工作的？的原文配图](/images/posts/how-do-computer-use-agents-work.png)

计算机操作智能体（Computer-Use Agent）能像人一样观察屏幕，通过鼠标和键盘操作应用。用户给出目标，例如在浏览器查伦敦天气，系统逐步决定如何达到目标。

## 为什么用计算机操作智能体

[AI 智能体](/posts/ai-agent/)的工具可以是搜索接口，也可以是屏幕截图、点击和键盘输入。预先写好的点击脚本依赖固定步骤，界面变化后就容易失效。API 的输入和输出通常更稳定，但有些旧软件没有可用接口。应用提供 API 时，可以用[模型上下文协议（MCP）](/posts/what-is-mcp-model-context-protocol/)等方式连接工具。只能访问图形界面时，智能体可以像操作者一样根据当前画面采取行动。

## 感知、判断和行动

每一轮[智能体循环](/posts/ai-agent-loop/)先截图，再由模型结合当前画面和目标决定下一步。控制器执行动作后重新截图，循环到完成或停止条件。

```text
        +-----------------------------+
        |                             |
        v                             |
   +----------+   +---------+   +----------+
   | Perceive |-->|  Think  |-->|   Act    |
   | (see the |   | (decide |   | (click,  |
   |  screen) |   |  next   |   |  type,   |
   |          |   | action) |   |  scroll) |
   +----------+   +---------+   +----------+
        ^                             |
        |     screen changes,         |
        +-----so look again ----------+

   The loop repeats until the goal is reached.
```

| 阶段 | 人 | 智能体 |
| --- | --- | --- |
| 感知 | 看屏幕 | 截屏并交给模型 |
| 判断 | 决定下一步 | 模型生成动作描述 |
| 行动 | 按键或移动鼠标 | 控制器发送对应的系统输入 |

## 怎样看屏幕

[视觉模型](https://outcomeschool.com/blog/multimodal-ai)从截图识别文字、按钮和布局。要点击一个按钮时，模型给出坐标。屏幕通常以左上为原点，横坐标向右增加，纵坐标向下增加。

```text
   Screen (measured in pixels)

   (0,0)                              (1280,0)
     +------------------------------------+
     |                                    |
     |          +-------------+           |
     |          |   Search    | <-- button at (640, 400)
     |          +-------------+           |
     |                                    |
     |  [browser]                         |
     |   icon at (50, 760)                |
     +------------------------------------+
   (0,800)                          (1280,800)

   x grows to the right -->
   y grows downward     v
```

## 怎样决定和执行动作

模型收到当前截图、用户目标和前面几步的记录，选择一个下一步动作。系统可允许点击、双击、滚动、输入文字、按键、拖动和停止。模型用结构化数据描述动作，由控制器转成操作系统的鼠标或键盘事件。

```text
{
  "reasoning": "The browser is closed. I will open it first.",
  "action": "click",
  "x": 50,
  "y": 760
}
```

界面可能因上一步产生变化，重新观察能让下一步的判断依据最新画面。

## 示例：查询伦敦天气

| 步骤 | 当前画面 | 动作 |
| --- | --- | --- |
| 1 | 桌面有浏览器图标 | 点击图标 |
| 2 | 浏览器显示地址栏 | 点击地址栏 |
| 3 | 地址栏已激活 | 输入 `weather in London` |
| 4 | 搜索词已经输入 | 按 `Enter` |
| 5 | 结果显示天气 | 结束任务 |

## 系统提示词与工具

提示词规定目标、行为约束和何时结束，[工具定义](/posts/how-does-function-calling-work-in-llms/)描述允许的动作及参数。模型建议行动，控制器检查并执行。

```text
You are a computer-use agent.
You can see the screen through screenshots.
You can perform these actions: click, type, scroll, key, screenshot.
Always return one action at a time in JSON format.
Explain your reasoning before each action.
Stop when the goal is complete.
```

## 安全护栏

系统可以用[护栏](/posts/how-do-llm-guardrails-work/)限制允许打开的应用和操作，并在沙箱里运行。涉及付款、发送消息或删除数据时，让人审核后再执行。动作日志便于事后排查，步数和超时限制能避免长时间失控。

## 局限

图像分析和多次往返带来延迟及成本。模型可能误认控件，位置估算也可能出错。任务全部在网页内时，[浏览器智能体](/posts/how-do-browser-agents-work/)还可以读取 DOM 或可访问性树，按编号操作元素。对于接口明确的工作，可以直接用 API。

## 常见问题

- **会预先制定全部操作步骤吗？** 可以有大致计划，但每一步取决于最新观察。
- **界面改变后还能运行吗？** 它会读取新的画面再判断，相比固定坐标脚本更容易适应。
- **只能看截图吗？** 有的系统也使用可访问性树等结构化信息。
- **能直接按下危险按钮吗？** 系统可以要求先完成人工确认。
