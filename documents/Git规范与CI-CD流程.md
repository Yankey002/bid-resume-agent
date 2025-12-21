# Git 规范与 CI/CD 流程（dev → main）

适用范围：

- 仓库：`bid-resume-agent`
- 开发机：Windows
- 分支：`dev`（开发与 CI），`main`（发布与 CD）
- 工作流：`.github/workflows/resume-ci-cd.yml`

目标：

- 所有日常提交都在 `dev`
- `dev` 通过 CI 后再合并到 `main`
- `main` 触发自动部署（CD）
- 发布后让 `dev` 对齐 `main`，避免下次冲突

## 0. 一句话规则

- 只在 `dev` 写代码、提交、推送
- 提交前确保 `pre-commit` 检查通过
- 发布通过“本地合并”或“GitHub PR”将 `dev` 合并到 `main`
- 发布后把 `dev` 快进到 `main`

## 1. 日常开发（本地 dev）

### 1.1 本地质量红线 (Pre-commit)

在提交代码前，必须确保通过本地的自动化检查（Lint/Format）：

1.  **安装**: `pip install pre-commit`
2.  **启用**: `pre-commit install`
3.  **运行**: `pre-commit run --all-files` (提交时会自动触发，也可手动跑)

*如果 pre-commit 报错，必须修复后才能提交。*

### 1.2 [关键] 本地全量模拟 CI 检查 (避免 CI 反复挂红)

由于 Pre-commit 通常只检查有变动的文件，而 CI 会检查所有文件且依赖环境可能更严格（如 Mypy 版本差异），强烈建议在 Push 前手动运行以下“三板斧”：

```powershell
# 进入后端目录
cd backend

# 1. 格式化检查 (Black)
python -m black . --check

# 2. 代码风格检查 (Flake8)
python -m flake8 .

# 3. 类型检查 (Mypy) - 最容易在 CI 挂掉的项目
python -m mypy .

# 回到根目录
cd ..
```

> **经验之谈**：CI 环境的 `mypy` 往往比本地更严格（涉及依赖包版本差异），本地跑通 `python -m mypy .` 能拦截 90% 的 CI 报错。

### 1.3 开发流程

1) 切到 `dev` 并同步远端（禁止产生多余合并提交）：

```powershell
conda activate base
git switch dev
git pull --ff-only origin dev
```

2) 开发完成后提交：

```powershell
git add -A
git commit -m "feat: xxx"
# 此时会自动触发 pre-commit 检查
```

3) 推送到 GitHub，自动触发 CI：

```powershell
git push origin dev
```

4) 在 GitHub → Actions 查看 `resume-ci-cd` 是否通过：

- 必须看到 `ci` (Frontend) 和 `ci_python` (Backend) 全绿

## 2. 发布上线（dev → main）

### 2.1 快速发布（单人开发推荐）

直接在本地将 `dev` 合并进 `main` 并推送，绕过 GitHub 网页操作：

```powershell
# 1. 确保 dev 是最新的
git switch dev
git pull --ff-only origin dev

# 2. 切到 main 并同步
git switch main
git pull --ff-only origin main

# 3. 合并 dev（快进模式）
git merge --ff-only dev

# 4. 推送触发部署
git push origin main

# 5. 切回 dev 继续开发
git switch dev
```

### 2.2 标准发布（GitHub PR）

1) 在 GitHub 仓库创建 PR：
   - base：`main`
   - compare：`dev`

2) 确认 PR 的检查项通过后再合并：
   - Checks 需要是绿色

3) 合并 PR 后的预期：
   - `main` 更新
   - 自动触发 CD（部署 job）

### 2.3 紧急回滚

如果发布后发现严重 Bug，需立即回滚代码：

```powershell
git switch main
git pull origin main
git revert HEAD  # 撤销最近一次提交
git push origin main # 推送触发自动部署回滚版本
git switch dev
git merge origin/main # 让 dev 也同步回滚
```

## 3. 发布后对齐 dev（关键，避免下次冲突）

当 `main` 已经合并并部署成功后，让 `dev` 站在最新 `main` 上（如果是本地快速发布，这一步通常已经完成）：

```powershell
git switch dev
git fetch origin
git merge --ff-only origin/main
git push origin dev
```

## 4. CI/CD 触发规则（本仓库约定）

CI (Dev & Main):

- `push dev/main`:
  - **Frontend**: `npm ci`, `npm run lint`, `npm run build`
  - **Backend**: `pip install`, `black`, `isort`, `flake8`, `mypy`, `pytest`

CD (Main Only):

- `push main` 触发：
  - **Frontend**: 将 `frontend/dist` 打包并部署到服务器 `/srv/www/resume`
  - **Backend**: *目前需手动更新（SSH 到服务器拉取代码并重启服务），后续将接入自动化部署。*

## 5. 部署前必备 Secrets（否则 CD 会失败）

在 GitHub → Settings → Secrets and variables → Actions 配置：

- `SSH_HOST`：`82.156.100.175`
- `SSH_USER`：`root`
- `SSH_PRIVATE_KEY`：用于登录服务器的私钥内容
- `SSH_PORT`：可选，默认 `22`

*注意：如果后端涉及敏感环境变量（如 `SECRET_KEY`），也建议在此处配置并注入 CI/CD 流程。*

## 6. 常见故障排查（只处理现象，不扩大损失）

### 6.1 发现处于 MERGING（合并未完成）

判断：`git status -sb`

处理原则：先恢复工作区，再决定继续合并或放弃。

放弃这次合并：
```powershell
git merge --abort
```

### 6.2 dev 与 main 同步失败（`--ff-only` 失败）

现象：`git merge --ff-only origin/main` 报错：`fatal: Not possible to fast-forward`

做法（优先 rebase，保持线性历史）：

```powershell
git switch dev
git fetch origin
git rebase origin/main
git push --force-with-lease origin dev
```

### 6.3 需要临时保存当前改动

```powershell
git stash push -u -m "wip"
```

恢复：

```powershell
git stash pop
```

## 7. 分支清理建议（保持简洁）

远端和本地只保留：
- `dev`
- `main`
