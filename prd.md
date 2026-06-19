# GitHub Star 管理工具 · 产品需求文档

> 版本 1.0 · 单人使用 · 纯前端 + Vercel 静态部署

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [整体布局](#3-整体布局)
4. [认证与初始化](#4-认证与初始化)
5. [数据同步](#5-数据同步)
6. [左一：分类导航栏](#6-左一分类导航栏)
7. [左二：仓库列表](#7-左二仓库列表)
8. [右侧：README 内容区](#8-右侧readme-内容区)
9. [标签管理页](#9-标签管理页)
10. [数据存储设计](#10-数据存储设计)
11. [主题与样式](#11-主题与样式)
12. [错误处理与边界情况](#12-错误处理与边界情况)
13. [部署说明](#13-部署说明)
14. [开发阶段规划](#14-开发阶段规划)

---

## 1. 项目概述

### 背景

GitHub Star 功能本质上是一个书签系统，但缺乏分类管理能力。本工具在不改变 GitHub 原有 Star 数据的前提下，为 star 的仓库提供两级标签分类、备注、全文搜索等管理能力，并支持在同一界面渲染 README，免去频繁跳转。

### 核心目标

- 通过 GitHub PAT 拉取 star 数据，本地标签数据存储到私有 GitHub Gist
- 支持手动两级标签分类（大类 / 小类）
- 支持在右侧面板直接渲染 README，不跳转 GitHub
- 跨设备同步（通过 Gist）
- 纯静态部署，无需后端服务器

### 不在 v1 范围内

- AI 自动分类（预留接口，后续版本添加）
- 多人协作
- 移动端适配（桌面优先）

---

## 2. 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 构建工具 | Rsbuild 2.x（最新稳定版） | 替代 Vite，性能更好 |
| 前端框架 | React 19 | 配合 Rsbuild 官方 React 插件 |
| 样式 | Tailwind CSS v4 | 原子化样式 |
| 状态管理 | Zustand | 轻量，适合中等复杂度 |
| 数据请求 | SWR | GitHub API 请求缓存与重新验证 |
| Markdown 解析 | markdown-it + remark-gfm 插件 | 支持 GitHub Flavored Markdown |
| 代码高亮 | Shiki（@shikijs/markdown-it） | 内置 github-light / github-dark 主题 |
| 图表渲染 | mermaid.js（懒加载） | 检测到 mermaid 代码块时才加载（~2MB） |
| 数学公式 | markdown-it-katex | 支持 LaTeX 语法 |
| 虚拟滚动 | TanStack Virtual | 仓库列表渲染 |
| 部署平台 | Vercel（免费套餐） | 纯静态，无需 Functions |

### API 调用说明

- **GitHub API**（Stars、Gist、README）：全部在浏览器端直接调用，CORS 已开放，无需代理
- **PAT**：存储在 `localStorage`，依赖浏览器自动填表，不发送到任何第三方服务器
- **Claude API**：v1 暂不使用；v2 添加 AI 分类时再补充 Vercel Functions 代理

---

## 3. 整体布局

### 默认状态（未选中仓库）

```
┌─────────────┬──────────────────────────────────────────┐
│   左一      │              左二（全宽）                  │
│  分类导航   │           仓库列表（虚拟滚动）             │
│  140px 固定 │              展开占满剩余空间              │
└─────────────┴──────────────────────────────────────────┘
```

### 选中仓库后（右侧展开）

```
┌─────────────┬─────────────────┬────────────────────────┐
│   左一      │     左二        │        右侧             │
│  分类导航   │   仓库列表      │    README 内容区        │
│  140px 固定 │  320px 固定     │    剩余空间自适应       │
└─────────────┴─────────────────┴────────────────────────┘
```

### 布局规则

- 三栏均无独立滚动条干扰，各自内部滚动
- 左一宽度固定 140px，不可拖拽
- 左二默认展开占满，选中仓库后固定为 320px，右侧内容区占剩余空间
- 右侧内容区展开动画：`transition: width 200ms ease`
- 右侧有关闭按钮（×），点击后收起，左二恢复全宽

---

## 4. 认证与初始化

### 4.1 首次使用流程

应用启动时优先读取当前 Gist 对应的完整本地快照。快照有效时直接恢复账号、分类和仓库数据，不发送网络请求；只有首次使用、新设备或缓存无效时才验证账号并查询 GitStars Gist：

```
启动
  ↓
有 PAT、Gist ID 和有效快照？
  ├── 是 → 直接加载本地快照 → 进入
  └── 否 → 有 PAT？
             ├── 否 → 显示 PAT 输入页
             └── 是 → 验证 PAT → 查询 GitStars Gist
                         ├── 无 → 创建 Gist → 首次拉取 Stars → 进入
                         ├── 一个 → 加载 Gist；无账号缓存时拉取 Stars 补全 → 进入
                         └── 多个 → 显示候选列表，用户选择后进入
```

### 4.2 初始化流程

**第一步：填写 PAT**

- 输入框：GitHub Personal Access Token
- 所需权限说明（只读提示，用户自行在 GitHub 生成）：
  - `read:user` — 读取账号基本信息
  - `public_repo` — 读取 star 列表和公开仓库内容
  - `gist` — 读写私有 Gist
- 填写后点击「验证」，调用 `GET /user` 确认 PAT 有效，显示头像和用户名作为确认

**自动配置 Gist**

- 分页调用 GitHub Gist API，查找描述为 `gitstars-data-v1` 的候选
- 以 `meta.json.app === "gitstars"`、`version === 1` 和完整文件结构作为有效性依据
- 没有有效 Gist 时自动创建私有 Gist，并立即拉取全部 Star 数据
- 只有一个有效 Gist 时直接加载；新设备没有账号缓存时拉取 Stars 以补全仓库元信息
- 多个有效 Gist 时显示 ID、更新时间和 Star 数量，由用户选择
- 旧描述 `GitHub Star Manager Data` 且文件结构有效的 Gist 原地升级，不创建副本
- 创建成功但首次同步失败时保留 `initialized: false`，下次检测到后继续同步

### 4.3 PAT 存储

- 存储位置：`localStorage['github_star_manager_pat']`
- Gist ID 同样存 `localStorage['github_star_manager_gist_id']`
- 完整账号快照使用 `localStorage['gsm_account_snapshot:<gist_id>']`，包含仓库、分类、同步时间和云端待写状态
- 用户信息使用 `localStorage['gsm_user_cache:<gist_id>']`，自动标签名使用 `localStorage['gsm_auto_tag_names:<gist_id>']`
- 旧版 `gsm_repo_cache:<gist_id>` 在完整快照建立后删除，避免重复占用空间
- 设置页提供「退出登录」按钮，清除 localStorage 并返回初始化向导

---

## 5. 数据同步

### 5.1 触发方式

**手动触发**，同步按钮位于左一顶部，图标为 ↻，hover 显示「同步 Star 数据」。

### 5.2 同步流程

```
点击同步按钮
  ↓
本地有待上传修改？
  ├── 是 → 保留本地数据，不读取云端
  └── 否 → 通过已知 Gist ID 读取云端分类、备注和回收站并合并
  ↓
分页拉取 GitHub API：GET /user/starred?per_page=100&sort=created&direction=desc
（每页 100 条，循环直到全部拉完）
  ↓
对比本地 tags.json 中的仓库列表：
  ├── 新增的仓库 → 加入列表，标签为空
  └── 已不在 star 列表的仓库 → 移入 trash.json（保留原有标签和备注）
  ↓
更新 meta.json 中的 last_synced 时间戳
  ↓
将变更写回 Gist（PATCH /gists/:gist_id）
  ↓
同步完成，刷新 UI
```

### 5.3 同步进度显示

- 同步按钮变为 loading 旋转状态，不可重复点击
- 左一顶部显示进度文字：`正在拉取第 3 页 / 共 12 页...`
- 完成后短暂显示 `✓ 同步完成` 并消失

### 5.4 增量对比逻辑

以仓库的 `full_name`（如 `owner/repo`）作为唯一标识。本地 Gist 数据（标签、备注）以 `full_name` 为 key 存储，同步时对比 full_name 集合的差集，不依赖仓库 ID（ID 不变，但 full_name 可能因 fork 链变化，已知风险，v1 不处理）。

### 5.5 孤儿数据处理

同步时发现仓库已不在 star 列表（即已取消 star），将该仓库数据（包括标签、备注）整体移入 `trash.json`，并记录移入时间。主列表不再显示，但数据不丢失。

---

## 6. 左一：分类导航栏

### 6.1 结构

```
┌─────────────────┐
│  ↻  [用户头像]  │  ← 同步按钮 + 用户头像（点击进设置）
├─────────────────┤
│  🔍 搜索框      │  ← 全文搜索入口（见 7.3）
├─────────────────┤
│  全部           │  ← 固定入口，显示所有 star 仓库总数
├─────────────────┤
│  未分类         │  ← 固定入口，显示没有任何标签的仓库
├─────────────────┤
│  ▼ 语言         │  ← 大类（可折叠）
│    Python       │  ← 小类标签（显示该标签下仓库数）
│    Rust         │
│    TypeScript   │
├─────────────────┤
│  ▼ 框架         │
│    React        │
│    FastAPI      │
├─────────────────┤
│  （更多大类...）│
├─────────────────┤
│  🗑 回收站      │  ← 固定入口，置底，显示已取消 star 的仓库
└─────────────────┘
```

### 6.2 交互规则

- 点击**大类**名称：展开/折叠小类列表；同时筛选该大类下所有仓库（显示在左二）
- 点击**小类标签**：筛选该标签下的仓库（显示在左二）
- 当前选中项高亮显示
- 每个标签名右侧显示仓库数量（灰色小字）
- 大类默认展开，支持折叠，折叠状态存 `localStorage` 持久化
- 「标签管理」入口：大类名称右侧 hover 出现 ✏️ 图标，点击进入标签管理页

### 6.3 预设大类

初始化 Gist 时写入以下默认分类（用户可在标签管理页全部修改/删除）：

| 大类 | 预设小类（示例） |
|------|----------------|
| 语言 / Language | Python, Rust, Go, TypeScript, Java |
| 框架 / Framework | React, Vue, FastAPI, Spring |
| 工具 / Tooling | CLI, 构建工具, 开发辅助 |
| AI / ML | 模型, 训练框架, 推理, 数据集 |
| 基础设施 / Infra | Docker, K8s, 监控, CI/CD |
| 数据库 / Database | ORM, 迁移工具, 客户端 |
| 学习资源 / Learning | 教程, Awesome 列表, 路线图 |
| 应用 / App | 完整产品, 开源服务 |

---

## 7. 左二：仓库列表

### 7.1 仓库卡片内容

每张卡片显示以下字段（全部展示，不做隐藏）：

```
┌──────────────────────────────────────────────┐
│ owner / repo-name                    ⭐ 取消  │  ← 仓库全名 + 操作区
│ 这里是仓库的描述 description...               │  ← 描述（最多 2 行，超出省略）
│ 🔵 TypeScript  ⭐ 12.3k  🕐 2024-03-15       │  ← 主语言 · GitHub star 数 · 最后更新
│ ⏱ Starred: 2024-06-01                        │  ← 你的 star 时间
│ [Python] [CLI] [+ 添加标签]                  │  ← 已打标签 + 操作入口
│ 📝 这是我的备注内容...                        │  ← 备注（有备注时显示，最多 1 行）
└──────────────────────────────────────────────┘
```

字段说明：

| 字段 | 来源 | 备注 |
|------|------|------|
| owner/repo-name | GitHub API | 点击整张卡片打开右侧 README |
| 描述 | GitHub API | `description` 字段 |
| 主语言 | GitHub API | `language` 字段，无则不显示 |
| GitHub star 数 | GitHub API | `stargazers_count`，超过 1000 显示 `1.2k` |
| 最后更新时间 | GitHub API | `updated_at`，显示为 `YYYY-MM-DD` |
| Star 时间 | GitHub API（starred_at） | 需请求时带 `Accept: application/vnd.github.star+json` |
| 标签 | Gist 本地数据 | 显示小类标签名，胶囊样式 |
| 备注 | Gist 本地数据 | 有内容时才渲染该行 |

### 7.2 卡片常驻操作区

卡片右上角始终显示以下操作图标（不需要 hover 触发）：

| 图标 | 功能 |
|------|------|
| ⭐（实心） | 点击取消 Star，调用 `DELETE /user/starred/:owner/:repo`，确认弹窗后执行，移入回收站 |
| ✏️ | 点击进入编辑模式（见 7.4） |
| 📝 | 点击展开/编辑备注输入框（内联） |

### 7.3 搜索

- 搜索框位于左一顶部（视觉上属于左二的头部区域）
- 搜索范围：仓库名、描述、标签名、备注（不含 README）
- 实时过滤本地数据（不调用 GitHub Search API），防抖 150ms
- 有搜索词时，搜索结果显示在左二列表顶部，其余列表内容在下方灰显或隐藏（可选）
- 清除搜索词后恢复正常列表

### 7.4 标签编辑模式

- 默认状态：标签以胶囊只读显示，卡片右上角有 ✏️ 图标
- 点击 ✏️ 后，卡片进入编辑模式：
  - 现有标签胶囊上出现 × 号，点击移除
  - 出现「+ 添加标签」按钮，点击展开一个两级下拉选择器（先选大类，再选小类）
  - 选中小类后立即添加到该仓库，并写入 Gist
  - 点击卡片外任意位置或再次点击 ✏️，退出编辑模式
- 标签修改即时保存到 Gist（每次变更触发一次 PATCH 请求）

### 7.5 备注编辑

- 点击 📝 图标，当前卡片内联展开一个 `<textarea>`
- 失焦后自动保存到 Gist
- 内容为空时保存，该仓库的备注字段删除（不存空字符串）

### 7.6 排序

列表顶部提供排序选择器（下拉或分段控件），支持以下维度，每种均可正序/倒序切换：

| 排序维度 | 说明 |
|----------|------|
| Star 时间（默认） | 你 star 该仓库的时间 |
| 仓库 Star 数 | `stargazers_count` |
| 仓库名 | 字母序（A-Z） |
| 最后更新时间 | `updated_at` |

排序偏好存 `localStorage` 持久化。

### 7.7 虚拟滚动

使用 TanStack Virtual 实现，仅渲染可视区域内的卡片。卡片高度不固定（有无备注、标签数量不同），使用动态测量模式（`measureElement`）。

### 7.8 回收站

- 左一「回收站」入口，点击后左二展示已取消 star 的仓库列表
- 回收站卡片显示与普通卡片相同字段，但操作区不同：
  - 🔄 重新 Star（调用 `PUT /user/starred/:owner/:repo`，并将该仓库从 trash.json 移回 tags.json）
  - 🗑️ 永久删除（从 Gist 中彻底删除该仓库数据，确认弹窗后执行）
- 回收站中的仓库不参与搜索和标签过滤

---

## 8. 右侧：README 内容区

### 8.1 触发与关闭

- 点击左二任意仓库卡片 → 右侧面板展开，左二收窄至 320px
- 右侧顶部右上角 × 按钮 → 关闭面板，左二恢复全宽
- 切换选中仓库时，右侧内容更新（有 loading 过渡）

### 8.2 顶部信息栏

```
┌──────────────────────────────────────────────────────┐
│ owner / repo-name                    [在 GitHub 打开] │
│ ⭐ 12.3k  🔵 TypeScript  🕐 Updated: 2024-03-15      │
│ 这里是仓库描述...                                     │
└──────────────────────────────────────────────────────┘
```

「在 GitHub 打开」按钮：新标签页打开 `https://github.com/owner/repo`

### 8.3 README 获取

调用 GitHub API：`GET /repos/:owner/:repo/readme`，响应中 `content` 字段为 Base64 编码的 Markdown 内容，解码后渲染。

请求头需带：`Accept: application/vnd.github.raw+json`，可直接获取原始 Markdown 文本（无需手动 Base64 解码）。

无 README 时显示：「该仓库暂无 README」占位文字。

### 8.4 链接修正（渲染前预处理）

对原始 Markdown 内容进行以下替换：

| 链接类型 | 原始格式 | 替换为 |
|----------|----------|--------|
| 相对路径图片 | `![alt](./assets/img.png)` | `![alt](https://raw.githubusercontent.com/owner/repo/HEAD/assets/img.png)` |
| 相对路径图片（无 ./） | `![alt](docs/img.png)` | `![alt](https://raw.githubusercontent.com/owner/repo/HEAD/docs/img.png)` |
| 相对路径链接 | `[text](./other.md)` | `[text](https://github.com/owner/repo/blob/HEAD/other.md)` |
| 锚点链接 | `[text](#section)` | 保持不变（页内跳转） |
| 绝对链接 | `[text](https://...)` | 保持不变 |

处理逻辑：在 markdown-it 的 renderer 中重写 `image` 和 `link_open` 规则实现，不做字符串替换。

### 8.5 渲染功能支持

| 功能 | 实现方式 | 备注 |
|------|----------|------|
| GitHub Flavored Markdown | markdown-it + remark-gfm 插件 | 表格、删除线、任务列表等 |
| 代码块语法高亮 | @shikijs/markdown-it | github-light / github-dark 主题跟随应用主题 |
| Mermaid 图表 | mermaid.js（懒加载） | 仅检测到 mermaid 代码块时加载 |
| 数学公式 | markdown-it-katex | 支持 `$inline$` 和 `$$block$$` |
| HTML 内容 | 允许渲染（GitHub README 常用） | 需过滤 `<script>` 标签（安全） |

### 8.6 loading 状态

点击仓库卡片后，右侧内容区显示骨架屏（标题区 + 多行文字占位），README 加载完成后替换。

---

## 9. 标签管理页

### 9.1 入口

- 左一大类名称 hover 时显示 ✏️，点击进入**该大类的标签管理**
- 或通过设置页入口进入**全局标签管理页**

### 9.2 功能

标签管理页为全屏覆盖或独立路由（`/settings/tags`），包含：

**大类管理：**
- 新增大类（输入名称）
- 重命名大类（内联编辑）
- 删除大类（需确认弹窗，提示「该大类下的所有小类将被删除，已打标签的仓库中该标签会被移除」）
- 拖拽排序大类顺序

**小类管理（选中某大类后）：**
- 新增小类标签（输入名称，归属于当前大类）
- 重命名小类（内联编辑，已打该标签的仓库自动同步新名称）
- 删除小类（需确认弹窗，提示「已打该标签的 N 个仓库将标签移除」）
- 拖拽排序小类顺序

### 9.3 删除标签的处理逻辑

删除某个小类标签时：

1. 从 `categories.json` 中移除该小类定义
2. 遍历 `tags.json`，将所有仓库中该标签移除
3. 若仓库移除后没有任何小类标签（但大类仍存在），该仓库在左一导航的「未分类」下显示

注：不额外创建"未分类小类标签"节点，"未分类"是一个计算状态，不是实体标签。

---

## 10. 数据存储设计

### 10.1 Gist 文件结构

一个私有 Gist，包含以下文件：

```
{gist_id}/
├── meta.json          # 元信息
├── categories.json    # 大类与小类定义
├── tags.json          # 仓库标签映射
├── notes.json         # 仓库备注
└── trash.json         # 回收站
```

### 10.2 各文件 Schema

**meta.json**
```json
{
  "app": "gitstars",
  "version": 1,
  "owner_login": "octocat",
  "initialized": true,
  "last_synced": "2024-06-01T10:00:00Z",
  "total_starred": 342
}
```

**categories.json**
```json
{
  "categories": [
    {
      "id": "cat_language",
      "name": "语言 / Language",
      "order": 0,
      "tags": [
        { "id": "tag_python", "name": "Python", "order": 0 },
        { "id": "tag_rust",   "name": "Rust",   "order": 1 }
      ]
    },
    {
      "id": "cat_framework",
      "name": "框架 / Framework",
      "order": 1,
      "tags": [
        { "id": "tag_react", "name": "React", "order": 0 }
      ]
    }
  ]
}
```

**tags.json**
```json
{
  "owner/repo-name": ["tag_python", "tag_cli"],
  "another/repo":    ["tag_react"]
}
```

存储小类标签 ID（不存名称，名称从 categories.json 解析），重命名标签无需更新 tags.json。

**notes.json**
```json
{
  "owner/repo-name": "这是我的备注，记录为什么 star 这个仓库",
  "another/repo":    "待学习，优先级高"
}
```

**trash.json**
```json
{
  "owner/repo-name": {
    "tags":        ["tag_python"],
    "note":        "备注内容",
    "trashed_at":  "2024-06-01T10:00:00Z"
  }
}
```

### 10.3 写入策略

- 每次用户操作（添加/移除标签、保存备注）触发一次 `PATCH /gists/:gist_id`
- 只更新变更的文件（Gist PATCH 支持部分文件更新）
- 写入失败时在界面顶部 Toast 提示「保存失败，请检查网络或 PAT 权限」，数据在内存中保留，可重试

### 10.4 本地缓存

账号完整状态按 Gist ID 缓存在 `localStorage` 中，key 为 `gsm_account_snapshot:<gist_id>`。快照包含仓库、分类、上次同步时间、保存时间以及 `pendingCloudWrite`，页面刷新优先从该快照恢复，不验证 PAT，也不查询 Gist。

每次写入云端前先保存 `pendingCloudWrite: true` 的本地快照；Gist 写入成功后再标记为 `false`。主动同步时，干净快照先通过已知 Gist ID 读取一次云端数据，以合并其他设备的修改；pending 快照跳过云端读取，避免未上传的本地修改被覆盖。缓存损坏、版本不兼容或用户与快照 owner 不一致时，回退到完整网络初始化。

---

## 11. 主题与样式

### 11.1 主题模式

支持三种模式，通过设置页切换，存 `localStorage` 持久化：

| 模式 | 说明 |
|------|------|
| 跟随系统（默认） | `prefers-color-scheme` 媒体查询自动切换 |
| 浅色 | 强制 Light 模式 |
| 深色 | 强制 Dark 模式 |

### 11.2 代码高亮主题

Shiki 使用双主题配置：

```javascript
{
  themes: {
    light: 'github-light',
    dark:  'github-dark'
  }
}
```

应用主题切换时，对应代码块高亮主题同步切换。

---

## 12. 错误处理与边界情况

| 情况 | 处理方式 |
|------|----------|
| PAT 无效或过期 | 全局 Toast 提示「PAT 已失效，请重新配置」，点击跳转设置页 |
| GitHub API 速率限制（60次/小时无认证，5000次/小时有认证） | 提示「API 请求达到限制，请 X 分钟后重试」，显示重置时间 |
| Gist 写入失败 | Toast 提示，本地数据保留，显示「重试」按钮 |
| 仓库无 README | 右侧显示「该仓库暂无 README」 |
| README 加载超时（>10s） | 显示「加载超时，点击重试」 |
| 仓库已被删除/私有化 | 同步时该仓库从 star 列表消失，正常走移入回收站流程 |
| 网络断开 | 全局网络状态监测，断网时禁用同步和写入操作，提示「当前离线，数据将在恢复连接后同步」 |
| Gist 文件结构不匹配 | 初始化验证时提示「该 Gist 不是有效的 Star Manager 数据文件」 |

---

## 13. 部署说明

### 13.1 Vercel 配置

Rsbuild 产物为纯静态文件，需在项目根目录添加 `vercel.json`：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

`rewrites` 规则确保前端路由（如 `/settings/tags`）刷新后不返回 404。

### 13.2 环境变量

v1 无需任何服务端环境变量，所有敏感信息（PAT）仅存于用户浏览器本地。

### 13.3 注意事项

- GitHub API 的 CORS 已对浏览器开放，无需代理
- 所有 API 请求需带 `Authorization: Bearer <PAT>` 头
- `raw.githubusercontent.com` 的图片跨域加载在浏览器中正常工作，无需代理

---

## 14. 开发阶段规划

### Phase 1：基础框架（必须）

- [ ] Rsbuild + React + Tailwind 项目初始化
- [ ] 三栏布局骨架（含展开/收起动画）
- [ ] 初始化向导（PAT 填写、Gist 新建/关联）
- [ ] GitHub API 封装层（PAT 注入、错误处理、速率限制检测）

### Phase 2：核心数据流

- [ ] Star 列表分页拉取与 localStorage 缓存
- [ ] Gist 读写封装（5 个文件的 CRUD）
- [ ] 手动同步流程（含进度显示、增量对比、回收站写入）
- [ ] 虚拟滚动仓库列表（TanStack Virtual）

### Phase 3：交互功能

- [ ] 左一分类导航（大类折叠、小类筛选、数量徽标）
- [ ] 仓库卡片渲染（全字段）
- [ ] 标签编辑模式（内联两级选择器）
- [ ] 备注内联编辑
- [ ] 取消 Star + 回收站
- [ ] 排序切换
- [ ] 全文搜索（本地过滤）

### Phase 4：README 渲染

- [ ] 右侧面板展开/收起
- [ ] GitHub API 获取 README 内容
- [ ] 链接预处理（相对路径修正）
- [ ] markdown-it 渲染管线（GFM + Shiki + KaTeX + Mermaid 懒加载）
- [ ] 骨架屏 loading 状态

### Phase 5：标签管理页 + 设置

- [ ] 标签管理页（大类/小类 CRUD、拖拽排序）
- [ ] 设置页（主题切换、PAT 更新、退出登录）
- [ ] 预设大类写入

### Phase 6：体验打磨

- [ ] 全局错误处理 Toast
- [ ] 网络状态监测
- [ ] 键盘快捷键（j/k 切换仓库）
- [ ] 深色/浅色/跟随系统主题完整适配
- [ ] Vercel 部署配置与验证
