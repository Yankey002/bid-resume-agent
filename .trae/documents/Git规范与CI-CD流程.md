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
- 永远不要直接改 `main`
- 发布通过 GitHub 上的 PR：`dev` → `main`
- 发布后把 `dev` 快进到 `main`

## 1. 日常开发（本地 dev）

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
```

3) 推送到 GitHub，自动触发 CI：

```powershell
git push origin dev
```

4) 在 GitHub → Actions 查看 `resume-ci-cd` 是否通过：

- 必须看到 `ci` job 通过（Install/Lint/Build 全绿）

## 2. 发布上线（GitHub 上 PR 合并 dev → main）

1) 在 GitHub 仓库创建 PR：

- base：`main`
- compare：`dev`

2) 确认 PR 的检查项通过后再合并：

- Checks 需要是绿色

3) 合并 PR 后的预期：

- `main` 更新
- 自动触发 CD（部署 job）

## 3. 发布后对齐 dev（关键，避免下次冲突）

当 `main` 已经合并并部署成功后，让 `dev` 站在最新 `main` 上：

```powershell
git switch dev
git fetch origin
git merge --ff-only origin/main
git push origin dev
```

说明：

- `--ff-only` 确保只是快进，不产生“莫名其妙的合并提交”
- 如果快进失败，说明 `dev` 已经偏离，需要先处理分支历史（见“故障排查”）

## 4. CI/CD 触发规则（本仓库约定）

CI：

- `push dev` 触发：`frontend` 下执行 `npm ci`、`npm run lint`、`npm run build`

CD：

- `push main` 触发：将 `frontend/dist` 打包并部署到服务器 `/srv/www/resume`

## 5. 部署前必备 Secrets（否则 CD 会失败）

在 GitHub → Settings → Secrets and variables → Actions 配置：

- `SSH_HOST`：`82.156.100.175`
- `SSH_USER`：`root`（或你的部署用户）
- `SSH_PRIVATE_KEY`：用于登录服务器的私钥内容（多行原样粘贴）
- `SSH_PORT`：可选，不填默认 `22`

## 6. 常见故障排查（只处理现象，不扩大损失）

### 6.1 发现处于 MERGING（合并未完成）

判断：

```powershell
git status -sb
```

处理原则：先恢复工作区，再决定继续合并或放弃。

放弃这次合并（在没有重要未提交改动时）：

```powershell
git merge --abort
```

如果 `merge --abort` 报 “not uptodate”：

- 先把改动提交到临时分支，或先 `git stash push -u`
- 再尝试 `git merge --abort`

### 6.2 dev 与 main 同步失败（`--ff-only` 失败）

现象：

- `git merge --ff-only origin/main` 报错：`fatal: Not possible to fast-forward`

做法（优先 rebase，保持线性历史）：

```powershell
git switch dev
git fetch origin
git rebase origin/main
git push --force-with-lease origin dev
```

注意：

- `--force-with-lease` 只在你确认“dev 就是你一个人在用”时使用

### 6.3 需要临时保存当前改动

```powershell
git stash push -u -m "wip"
```

恢复：

```powershell
git stash pop
```

## 7. 分支清理建议（保持简洁）

远端只保留：

- `dev`
- `main`

本地只保留：

- `dev`
- `main`

删除本地分支（确保不在该分支上）：

```powershell
git branch -d <branch>
```

删除远端分支：

```powershell
git push origin --delete <branch>
```

