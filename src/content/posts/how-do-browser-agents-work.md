---
title: "浏览器智能体是如何工作的？"
description: "从网页观察方式、浏览器工具和行动循环入手，用一本书的下单流程解释浏览器智能体。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-10-11"
tags: ["AI", "AI 智能体", "浏览器自动化", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-do-browser-agents-work"
readingOrder: 60
draft: false
---

![浏览器智能体是如何工作的？的原文配图](/images/posts/how-do-browser-agents-work.png)

浏览器智能体用浏览器执行任务。它观察页面、选择要点击或输入的内容、执行动作，然后查看页面变化，直到达到用户目标。

## 为什么要让智能体使用浏览器

普通[AI 智能体](/posts/ai-agent/)由模型决定行动，应用负责[运行工具](/posts/how-does-function-calling-work-in-llms/)。网页上有些工作已经能用 API 完成，另一些只能通过按钮、表单和导航操作。浏览器智能体将这些操作作为工具交给模型，用于跨页面完成检索、填写和比较等任务。

## 四个组成部分

1. 浏览器加载页面。
2. 控制器通过 Playwright 或 Puppeteer 等工具打开链接、点击、输入或滚动。
3. 模型接收用户目标和当前页面，提出下一步动作。
4. 循环逻辑负责重复观察、调用模型和执行，直到完成或达到上限。

```text
        +----------------------+
        |     LLM (brain)      |
        +----------------------+
            ↓              ↑
       next action    what is on
         to do         the page
            ↓              ↑
        +----------------------+
        |      Controller      |
        |     (Playwright)     |
        +----------------------+
            ↓              ↑
     clicks, types,      page
       or scrolls       content
            ↓              ↑
        +----------------------+
        |       Browser        |
        |     (web pages)      |
        +----------------------+
```

## 怎样观察页面

**截图。** 控制器把当前画面交给能读图的[多模态模型](https://outcomeschool.com/blog/multimodal-ai)。模型可以观察文本、图标和布局，并按像素坐标点击。

**页面结构。** 浏览器把 HTML 表示为 DOM 树，也可以导出可访问性树。控制器将链接、按钮、输入框等元素整理成带编号的文本列表，模型用编号指出要操作的元素。

```text
[1] link: Home
[2] text box: Search books
[3] button: Search
[4] link: Sign in
[5] button: Add to Cart
```

按编号点击依赖可用的页面结构。按坐标点击则可以覆盖绘制在图片上的内容。这种基于截图和坐标的方式也用于[计算机操作智能体](/posts/how-do-computer-use-agents-work/)。

## 观察、判断、行动循环

每一轮的[智能体循环](/posts/ai-agent-loop/)从页面现状开始。控制器提供截图、元素列表或两者。模型结合用户目标、当前页面和简短的执行历史，给出一个动作。控制器执行后重新观察。可能的动作包括打开链接、点击、输入、滚动和结束。

```text
        +-----------------------------+
   +--> |           Observe           |
   |    | take screenshot or elements |
   |    +-----------------------------+
   |                   ↓
   |    +-----------------------------+
   |    |            Think            |
   |    |  LLM picks the next action  |
   |    +-----------------------------+
   |                   ↓
   |    +-----------------------------+
   +--- |             Act             |
        |    click, type, or scroll   |
        +-----------------------------+
```

## 示例：把书放进购物车

| 轮次 | 当前情况 | 动作 |
| --- | --- | --- |
| 1 | 空浏览器 | 打开书店 |
| 2 | 首页出现搜索框 | 输入书名 Atomic Habits |
| 3 | 搜索词已输入 | 点击搜索按钮 |
| 4 | 页面显示结果 | 打开对应的书 |
| 5 | 有精装与平装两种选择 | 选择平装 |
| 6 | 已选中平装 | 点击加入购物车 |
| 7 | 页面确认已加入 | 停止并报告 |

每次页面变动后，列表里的编号可能重新分配。首页的元素 5 与图书详情页的元素 5 可能完全不同。

## 一个简化的循环示例

```text
from playwright.sync_api import sync_playwright

def run_browser_agent(task):
    with sync_playwright() as p:
        page = p.chromium.launch().new_page()
        history = []
        for _ in range(20):
            elements = list_clickable_elements(page)   # observe
            screenshot = page.screenshot()
            action = llm_decide(task, elements, screenshot, history)  # think
            if action["type"] == "done":
                return action["answer"]
            perform(page, action, elements)            # act
            history.append(action)
        return "Stopped: too many steps."
```

示例用 Playwright 打开浏览器，截图后让模型决定行动，并给循环设置 20 步上限。与模型通信、解析动作以及执行动作的函数在示例中是接口占位。

## 截图与结构的取舍

| 方面 | 截图 | DOM 或可访问性树 |
| --- | --- | --- |
| 模型输入 | 当前页面图像 | 文本和元素列表 |
| 点击方式 | 像素坐标 | 元素编号 |
| 覆盖范围 | 画布和图像等可见区域 | 结构清晰的 HTML 页面 |
| 点击精度 | 坐标可能略有偏差 | 元素选择更准确 |
| 成本 | 图像会占用较多[词元](https://outcomeschool.com/blog/tokenization-in-llms) | 文本通常开销较小 |
| 布局信息 | 与人看到的画面接近 | 主要反映结构 |

一些系统同时提供两种视图，再按任务选择。

## 常见故障与安全边界

- **弹窗或 Cookie 提示。** 先在下一轮识别弹窗，再处理被遮挡的页面。
- **页面尚未加载。** 控制器等待相关内容就绪后再截图或提取结构。
- **登录或 CAPTCHA。** 遇到需要人工处理的环节时，把控制权交回给用户。
- **网页中的恶意指令。** 网页内容可能包含[提示词注入](/posts/prompt-injection-in-llms/)。把页面当作数据，执行付款、发信、删除等敏感操作前请求人工确认。
- **重复点击或迷路。** 用步数上限阻止循环一直运行。

自动化适合访问多个网页、比较资料、填写重复表单。变化频繁的页面、图形化控件、反自动化验证和高风险操作需要更严格的控制。存在可用 API 时，稳定的程序接口通常更快。浏览器也可以在无可见窗口的无头模式下运行。
