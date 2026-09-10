# 全诗词项目文档索引

## 项目概述
全诗词是一个基于 Electron + Vue 3 的桌面应用，提供全唐诗、全宋诗、全宋词等经典诗词的阅读、搜索、AI赏析和用户交互功能。

## 技术架构文档

### 前端架构
`frontend/architecture.md` - 前端技术架构与开发约束，修改任何前端代码时必读

### 后端架构
`backend/architecture.md` - 后端（Electron 主进程）架构与 API 设计，修改后端代码时必读

## 当前任务文档
暂无进行中的任务

## 全局重要记忆

### 代码质量
- 单个代码文件不超过1000行
- 保持代码简单直观，不过度设计
- 变更后运行 `pnpm typecheck`（node + web 两套 tsconfig）验证；格式化用 `pnpm format`（Prettier）
- 使用中文进行代码注释和文档编写

### 项目特点
- 诗词数据库（poetry.sqlite）是只读的，基于 chinese-poetry 项目，缺失时主进程以空库兜底并展示引导页
- 用户数据（userdata.sqlite）存储在用户数据目录，收藏、笔记、标签、AI 模型配置、赏析缓存都在其中
- 用户库迁移按模块命名空间执行（`UserData.migrateNs(ns, version, script)`），脚本必须幂等（IF NOT EXISTS），严禁 DROP 重建
- 搜索：渲染层传中文原文，主进程统一转拼音走 FTS5（标题/作者/词牌），未命中且含中文时回退正文子串搜索；FTS 关键词在 `pinyin-search.ts` 统一转义
- 跨库查询（收藏/标签视图）先在用户库取 ID 集合，再让诗词库经临时表 `_search_ids` 在集合内过滤分页，各一次 IPC
- AI 赏析结果按诗 ID 缓存在用户库 `ai_analysis` 表；模型 API Key 用 safeStorage 加密存 `apiKeyEnc` 列，IPC 返回一律脱敏
- 应用使用单实例锁（`requestSingleInstanceLock`），二次启动聚焦已有窗口

### 用户交互功能（2025-09 重构）
- 收藏、评论/笔记、标签功能完整；收藏状态走 `filterBookmarkedIds` 批量查询 + store 缓存
- 标签诗词计数走 `getTagPoetryCounts` 单条 GROUP BY，禁止逐标签拉取全量诗词
- 所有用户交互数据通过 `stores/interaction.ts` 统一管理，写入参数一律驼峰命名
