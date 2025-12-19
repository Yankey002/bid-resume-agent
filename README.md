# AI Dev Practice (简历解析与管理系统)

[![CI/CD](https://github.com/用户名/仓库名/actions/workflows/resume-ci-cd.yml/badge.svg)](https://github.com/用户名/仓库名/actions)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)
[![Code Style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

基于大模型（LLM）驱动的智能简历解析与管理系统。包含 Python 后端解析引擎与 React 前端展示界面，支持 DOCX 文档解析、结构化数据提取及 AI 语义质检。

## ✨ 核心功能

- **智能简历解析**：
  - 基于 `python-docx` 解析 DOCX 格式简历。
  - 提取工作经历、技能、项目经验等关键信息。
  - 支持工作经历时间线冲突检测等规则校验。
- **AI 语义增强**：
  - 集成 DeepSeek / OpenAI / 智谱清言等大模型。
  - 提供简历质量评分、逻辑一致性检查及改写建议。
  - 支持本地 Ollama 模型调用。
- **现代化前端**：
  - 基于 React 19 + TypeScript + Vite 构建。
  - 使用 Ant Design 组件库，提供清晰的简历库管理界面。

## 🛠 技术架构

- **后端/算法 (Python)**：
  - 核心库：`python-docx`, `openai`
  - 代码质量：`black`, `isort`, `flake8`, `mypy`, `pytest`
  - 配置文件：`pyproject.toml`
- **前端 (Frontend)**：
  - 框架：React 19, TypeScript
  - 构建工具：Vite
  - UI 库：Ant Design, Sass
- **CI/CD**：
  - GitHub Actions 实现自动化测试与部署。

## 🚀 快速开始

### 环境要求

- Python 3.11+
- Node.js 20+
- Git

### 1. 克隆仓库

```bash
git clone https://github.com/你的用户名/ai-dev-practice.git
cd ai-dev-practice
```

### 2. 后端设置

创建虚拟环境并安装依赖：

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/macOS
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

配置环境变量：

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 LLM API Key
```

运行简历解析示例（CLI）：

```bash
# 查看帮助
python -m resume_parser.docx_parser --help

# 解析单个简历并输出 JSON
python -m resume_parser.docx_parser input/resume.docx -o output/resume.json --pretty

# 启用 LLM 生成语义质检报告
python -m resume_parser.docx_parser input/resume.docx --llm-work-experience-report --human-report-output report.txt
```

### 3. 前端设置

```bash
cd frontend

# 安装依赖
npm ci

# 启动开发服务器
npm run dev
```

访问 `http://localhost:5173` 查看前端界面。

## 🤝 开发指南

### Git 工作流

本项目遵循 Git Flow 规范：
- `main`: 主分支，用于生产环境部署。
- `dev`: 开发分支，日常开发合并至此。
- `feature/*`: 功能分支。

### 代码规范

**Python**:
```bash
# 格式化代码
black .
isort .

# 代码检查
flake8 .
mypy .
```

**Frontend**:
```bash
# Lint 检查
npm run lint
```

## 🔄 CI/CD

项目包含完整的 CI/CD 流程 (`.github/workflows/resume-ci-cd.yml`)：
1. **CI (持续集成)**：
   - 前端：Install -> Lint -> Build
   - 后端：Install -> Black -> Isort -> Flake8 -> Mypy -> Pytest
2. **CD (持续部署)**：
   - 仅当 `main` 分支有推送且 CI 通过时触发。
   - 自动部署前端构建产物 (`dist/`) 到服务器。

## 📄 许可证

MIT License
