# 🀄 Chinese Learning Agent

> Your AI Mandarin tutor: pick a topic, learn the vocabulary, then practice a real conversation by voice — and get a graded report at the end.

**English | [中文](#中文)**

[![Last commit](https://img.shields.io/github/last-commit/shengdabai/Chinese-Learning)](https://github.com/shengdabai/Chinese-Learning/commits)
[![Stars](https://img.shields.io/github/stars/shengdabai/Chinese-Learning?style=social)](https://github.com/shengdabai/Chinese-Learning/stargazers)
[![Follow @shengdabai](https://img.shields.io/github/followers/shengdabai?style=social)](https://github.com/shengdabai)

---

## Why

Most beginners can memorize Chinese words but freeze the moment they have to actually *speak*. Chinese Learning Agent closes that gap: it turns any topic you care about into a short, guided learning loop — study the words, then immediately use them in a spoken conversation with an AI teacher who corrects you gently and tells you exactly what to work on next.

Built by [Tony (Sheng)](https://github.com/shengdabai), a Chinese-language teacher with 6,000+ students, as part of an ongoing effort to build AI + Chinese-teaching tools in public.

## What

A full-stack web app with a single, focused learning flow:

1. **Choose your native language** (24 supported — translations and explanations come back in *your* language).
2. **Enter any topic** — "ordering food at a restaurant", "introducing yourself", "talking about hobbies".
3. **Review AI-generated vocabulary** — 8 essential words, each with pinyin, translation, an example sentence, and a reusable sentence pattern.
4. **Practice the conversation** — chat with an AI Chinese teacher by typing or by speaking; the teacher replies in Chinese (with pinyin + translation), reads its answers aloud, and flags your mistakes.
5. **Get a learning report** — strengths, areas to improve, error analysis with corrections, a skill-by-skill progress visualization, and an overall score.

## ✨ Features

- **Topic-driven vocabulary generation** — 8 words per topic with pinyin, translation, example sentence, and an applicable sentence pattern + explanation.
- **Conversational practice** — context-aware dialogue with an AI teacher that stays at a beginner–intermediate level, encourages, and corrects.
- **Voice in and voice out** — browser speech recognition for Mandarin input (`zh-CN`) and text-to-speech with smart selection of high-quality Chinese voices.
- **24 native languages** — English, Spanish, French, German, Japanese, Korean, Arabic, Hindi, and more; every translation and explanation is localized.
- **End-of-session learning report** — strengths, improvement areas, per-error corrections, pronunciation/grammar insights, a 5-dimension progress chart, and a 0–100 score.
- **Native-language persistence** — your language choice is remembered in the browser, so returning learners jump straight to a new topic.
- **Graceful degradation** — the backend automatically falls back to in-memory storage if the database is unavailable, so the app keeps working.

## 🧱 Tech stack

| Layer    | Technology                                                        |
| -------- | ----------------------------------------------------------------- |
| Frontend | React 19, Tailwind CSS 3, Web Speech API (recognition + synthesis) |
| Backend  | FastAPI, Uvicorn, Pydantic                                        |
| AI       | OpenAI Chat Completions (`gpt-3.5-turbo`)                          |
| Data     | MongoDB (via Motor async driver), with in-memory fallback         |
| Pinyin   | `pinyin` Python package                                           |
| Deploy   | Docker (multi-stage) + nginx reverse proxy                        |

## 🚀 Quick start

### Prerequisites

- Python 3.11+
- Node.js 20+ and Yarn
- An OpenAI API key
- (Optional) A MongoDB instance — the backend falls back to in-memory storage without one

### Backend

```bash
cd backend
pip install -r requirements.txt

# Provide configuration via environment variables:
#   OPENAI_API_KEY   (required)
#   MONGO_URL        (optional, defaults to mongodb://localhost:27017)
#   DB_NAME          (optional, defaults to test_database)
export OPENAI_API_KEY=YOUR_KEY_HERE

uvicorn server:app --host 0.0.0.0 --port 8001
```

The API is now live at `http://localhost:8001` — check `GET /api/health`.

### Frontend

```bash
cd frontend
yarn install

# Point the frontend at your backend (defaults to http://localhost:8001):
export REACT_APP_BACKEND_URL=http://localhost:8001

yarn start
```

Open the printed local URL in a modern browser (Chrome, Edge, or Safari recommended for speech support).

### Docker (all-in-one)

A multi-stage `Dockerfile` builds the React app, installs the FastAPI backend, and serves both behind nginx:

```bash
docker build -t chinese-learning .
docker run -p 80:80 chinese-learning
```

## 📖 Usage

Once both services are running:

1. Open the app and pick your **native language** (remembered for next time).
2. Type a **conversation topic** and generate vocabulary.
3. Study the 8 words, then click **Start Conversation Practice**.
4. **Type or speak** in Chinese; tap 🔊 to hear any teacher reply.
5. Click **结束对话 (End)** to generate your **learning report**, then **Continue Learning** with a new topic.

### Key API endpoints

| Method | Endpoint                          | Purpose                                  |
| ------ | --------------------------------- | ---------------------------------------- |
| GET    | `/api/health`                     | Service + storage status                 |
| GET    | `/api/languages`                  | List supported native languages          |
| POST   | `/api/generate-vocabulary`        | Generate topic vocabulary, start session |
| POST   | `/api/start-dialogue`             | Send a turn, get the teacher's reply     |
| POST   | `/api/get-dialogue-translation`   | Translate the full dialogue              |
| POST   | `/api/end-session`                | Generate the learning report             |
| GET    | `/api/session/{session_id}`       | Retrieve a session                       |

## 🗺️ Status

Working prototype. The core loop — language selection, vocabulary generation, voice/text dialogue practice, and learning reports — is implemented end-to-end. Configuration is environment-variable driven; MongoDB is optional thanks to the in-memory fallback. Contributions, ideas, and bug reports are welcome.

## 🤝 Connect / About

Built by **[Tony (Sheng)](https://github.com/shengdabai)** — a Chinese-language teacher (6,000+ students) building AI + Chinese-teaching tools in public.

If this project is useful to you, please **⭐ Star** the repo and **Follow [@shengdabai](https://github.com/shengdabai)** to keep up with what's next.

Related work in the same ecosystem: `chinese-learning-app`, `chinese-mission`, and `LinguaLens`.

## License

No license yet — all rights reserved. If you'd like to reuse this code, please open an issue or reach out.

---

<a name="中文"></a>

# 🀄 Chinese Learning Agent（中文)

> 你的 AI 中文老师：选一个话题，先学词，再用语音练一段真实对话，结束后还能拿到一份学习报告。

**[English](#-chinese-learning-agent) | 中文**

[![Last commit](https://img.shields.io/github/last-commit/shengdabai/Chinese-Learning)](https://github.com/shengdabai/Chinese-Learning/commits)
[![Stars](https://img.shields.io/github/stars/shengdabai/Chinese-Learning?style=social)](https://github.com/shengdabai/Chinese-Learning/stargazers)
[![Follow @shengdabai](https://img.shields.io/github/followers/shengdabai?style=social)](https://github.com/shengdabai)

---

## 为什么做这个

很多初学者能背下汉字，却在真正要"开口说"时卡住。Chinese Learning Agent 就是为了填补这道鸿沟：它把你关心的任何话题变成一个短小、有引导的学习闭环——先学词，再立刻在一段口语对话里用上这些词。AI 老师会温和地纠错，并明确告诉你下一步该练什么。

由[盛大白 (Tony)](https://github.com/shengdabai)开发——一位拥有 6000+ 学员的中文老师，持续以 build in public 的方式打造「AI + 中文教学」工具。

## 它是什么

一个全栈 Web 应用，只专注一条清晰的学习流程：

1. **选择你的母语**（支持 24 种——翻译和讲解都会用*你的*语言返回）。
2. **输入任意话题**——「在餐厅点餐」「自我介绍」「聊聊兴趣爱好」。
3. **复习 AI 生成的词汇**——8 个核心词，每个都带拼音、翻译、例句，以及一个可复用的句型。
4. **练习对话**——用打字或语音和 AI 中文老师聊天；老师用中文回复（附拼音 + 翻译），会朗读答案，并指出你的错误。
5. **获得学习报告**——优势、待改进点、带纠正的错误分析、分技能的进度可视化，以及一个综合评分。

## ✨ 功能

- **话题驱动的词汇生成**——每个话题 8 个词，含拼音、翻译、例句，以及可套用的句型 + 讲解。
- **对话练习**——具备上下文记忆的 AI 老师，保持在初–中级水平，多鼓励、勤纠错。
- **语音输入 + 语音输出**——浏览器普通话语音识别（`zh-CN`），以及优先挑选高质量中文音色的文字转语音。
- **24 种母语**——英语、西班牙语、法语、德语、日语、韩语、阿拉伯语、印地语等；所有翻译与讲解都会本地化。
- **结课学习报告**——优势、待改进点、逐条错误纠正、发音/语法洞察、5 维进度图，以及 0–100 分。
- **母语记忆**——浏览器会记住你的语言选择，老用户回来可直接进入新话题。
- **优雅降级**——数据库不可用时后端自动回退到内存存储，应用照常运行。

## 🧱 技术栈

| 层级   | 技术                                                       |
| ------ | -------------------------------------------------------- |
| 前端   | React 19、Tailwind CSS 3、Web Speech API（识别 + 合成)     |
| 后端   | FastAPI、Uvicorn、Pydantic                               |
| AI     | OpenAI Chat Completions（`gpt-3.5-turbo`)                |
| 数据   | MongoDB（通过 Motor 异步驱动），并带内存回退               |
| 拼音   | `pinyin` Python 包                                       |
| 部署   | Docker（多阶段构建)+ nginx 反向代理                       |

## 🚀 快速开始

### 前置条件

- Python 3.11+
- Node.js 20+ 与 Yarn
- 一个 OpenAI API key
- （可选)一个 MongoDB 实例——没有时后端会回退到内存存储

### 后端

```bash
cd backend
pip install -r requirements.txt

# 通过环境变量提供配置：
#   OPENAI_API_KEY   （必填）
#   MONGO_URL        （可选，默认 mongodb://localhost:27017）
#   DB_NAME          （可选，默认 test_database）
export OPENAI_API_KEY=YOUR_KEY_HERE

uvicorn server:app --host 0.0.0.0 --port 8001
```

API 现已运行在 `http://localhost:8001`——可访问 `GET /api/health` 验证。

### 前端

```bash
cd frontend
yarn install

# 让前端指向你的后端（默认 http://localhost:8001）：
export REACT_APP_BACKEND_URL=http://localhost:8001

yarn start
```

在现代浏览器中打开终端输出的本地地址（推荐 Chrome、Edge 或 Safari 以获得语音支持）。

### Docker（一体化)

多阶段 `Dockerfile` 会构建 React 应用、安装 FastAPI 后端，并由 nginx 同时对外提供服务：

```bash
docker build -t chinese-learning .
docker run -p 80:80 chinese-learning
```

## 📖 使用方法

两个服务都运行后：

1. 打开应用，选择你的**母语**（会被记住）。
2. 输入一个**对话话题**并生成词汇。
3. 学完 8 个词，点击 **Start Conversation Practice（开始对话练习）**。
4. 用中文**打字或说话**；点 🔊 收听任意一句老师的回复。
5. 点击 **结束对话** 生成你的**学习报告**，再用 **Continue Learning（继续学习）** 换个新话题。

### 主要 API 接口

| 方法 | 接口                              | 用途                       |
| ---- | --------------------------------- | -------------------------- |
| GET  | `/api/health`                     | 服务与存储状态             |
| GET  | `/api/languages`                  | 列出支持的母语             |
| POST | `/api/generate-vocabulary`        | 生成话题词汇并开启会话     |
| POST | `/api/start-dialogue`             | 发送一轮对话，获取老师回复 |
| POST | `/api/get-dialogue-translation`   | 翻译完整对话               |
| POST | `/api/end-session`                | 生成学习报告               |
| GET  | `/api/session/{session_id}`       | 获取某次会话               |

## 🗺️ 状态

可用的原型。核心闭环——母语选择、词汇生成、语音/文字对话练习、学习报告——已端到端实现。配置全部走环境变量；得益于内存回退，MongoDB 为可选项。欢迎贡献代码、提想法、报 bug。

## 🤝 联系 / 关于

由 **[盛大白 (Tony)](https://github.com/shengdabai)** 开发——一位拥有 6000+ 学员的中文老师，以 build in public 的方式打造「AI + 中文教学」工具。

如果这个项目对你有帮助，欢迎给仓库点 **⭐ Star**，并 **关注 [@shengdabai](https://github.com/shengdabai)** 了解后续进展。

同一生态中的相关项目：`chinese-learning-app`、`chinese-mission`、`LinguaLens`。

## 许可证

暂无许可证——保留所有权利。如需复用本代码，请提一个 issue 或与作者联系。
