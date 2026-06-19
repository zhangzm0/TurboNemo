# 问题追踪：GitHub

本仓库的 Issue 和 PRD 都存放在 GitHub Issues 中。使用 `gh` CLI 进行所有操作。

## 约定

- **创建 Issue**：`gh issue create --title "..." --body "..."`。多行内容使用 heredoc。
- **读取 Issue**：`gh issue view <number> --comments`，用 `jq` 过滤评论并获取标签。
- **列出 Issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合 `--label` 和 `--state` 过滤。
- **评论 Issue**：`gh issue comment <number> --body "..."`。
- **添加/移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`。
- **关闭 Issue**：`gh issue close <number> --comment "..."`。

从 `git remote -v` 推断仓库地址——`gh` 在克隆目录内自动处理此操作。

## PR 作为处理入口

**PR 不作为处理入口：否。** 本仓库为单人维护，PR 不被视为功能请求。

## 当技能说"发布到问题追踪器"

创建一个 GitHub Issue。

## 当技能说"获取相关工单"

运行 `gh issue view <number> --comments`。
