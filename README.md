# GitStars

GitStars 是一个在浏览器中整理 GitHub Star、标签和备注的工具。账号数据保存在私有 Gist，本机同时保留账号作用域缓存，用于快速启动和网络异常时保护尚未同步的修改。

## 权限与错误恢复

- PAT 需要 `read:user`、`public_repo` 和 `gist` 权限。
- PAT 失效时，应用要求重新认证，但不会立即删除本机仓库、标签或备注。
- 成功通知会自动关闭，警告和错误通知会持续显示，直到用户关闭或执行恢复操作。
- GitHub API 限流、权限不足、网络失败和服务异常会显示不同的恢复提示。
- Gist 写入失败时，修改仍保存在本机并标记为“云端尚未同步”，可从通知中重试。
- 主动退出登录会移除本机账号缓存，不会删除 GitHub Star 或私有 Gist。

## 开发验证

```bash
pnpm test
pnpm lint
pnpm build
```
