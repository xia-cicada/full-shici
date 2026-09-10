# 后端架构文档

## 技术栈
- **运行环境**: Electron 37.x（主进程）
- **语言**: TypeScript 5.9
- **数据库**: better-sqlite3 12.x（SQLite，FTS5 可用）
- **AI 集成**: OpenAI SDK 6.x（任意 OpenAI 兼容接口）
- **拼音**: pinyin-pro（运行时依赖，用于搜索转拼音与音节切分）

## 目录结构
```
src/main/
├── index.ts                # 应用入口：单实例锁、窗口创建、窗口控制 IPC、退出时关闭数据库
├── poetry/                 # 诗词模块（只读库）
│   ├── types.ts            # 类型：Poetry / PoetrySummary / PaginatedSearchResult
│   ├── db.ts               # 搜索（FTS5 + LIKE 回退 + ids 集合过滤）、缺库兜底
│   ├── pinyin-search.ts    # FTS 关键词转义、拼音转换、连续拼音音节切分、LIKE 转义
│   └── ipc.ts              # IPC：db-get-status、分类/诗词/搜索
├── ai/                     # AI 赏析模块
│   ├── types.ts            # ModelConfig（含 apiKeyEnc）
│   ├── ai.ts               # 赏析实现（缓存读写、force 刷新、JSON 输出模式）
│   ├── db.ts               # 模型配置（Key 加密）+ 赏析缓存表
│   ├── ipc.ts              # IPC：ai-analyze-poetry（含 force）、模型配置 CRUD
│   ├── model.ts            # 默认模型配置（DEEPSEEK_API_KEY 环境变量）
│   └── prompt.ts           # 提示词模板
├── interaction/            # 用户交互模块
│   ├── types.ts            # 行结构（snake_case）+ IPC 输入类型（驼峰 XInput）
│   ├── db.ts               # 注解/笔记/收藏/标签 + 批量查询（ID 集合、标签计数）
│   └── ipc.ts              # IPC + 跨库组合查询（收藏/标签视图搜索）
└── userData/               # 用户数据管理
    ├── db.ts               # UserData：连接、migrateNs 按模块迁移、close
    └── index.ts            # 导出
```

## 数据库架构

### 诗词数据库（poetry.sqlite - 只读）
位置：`resources/poetry.sqlite`（经 `?asset&asarUnpack` 引入，构建方式见 `docs/build-sql/README.md`）

表结构：
- `categories` - 诗词分类（唐诗、宋词等）
- `poetry` - 诗词内容（主数据，paragraphs/notes/tags/extra_info 为 JSON 文本列）
- `poetry_search` - FTS5 外部内容表（`content=poetry`），索引标题/作者/词牌及其拼音、首字母，由触发器同步

特性：
- WAL 模式、外键约束、BM25 相关性评分
- **缺库兜底**：文件不存在时以空的内存库兜底（建空 categories/poetry 表），`ready=false`，查询返回空而不崩溃；`db-get-status` IPC 向渲染层提供状态与路径

### 用户数据库（userdata.sqlite - 读写）
位置：`app.getPath('userData')/userdata.sqlite`

表结构：
```sql
-- 版本管理（旧的全局 db_version 保留但不再使用）
db_version
db_version_ns      -- 按模块命名空间的迁移版本（ns, version）

-- 交互数据
annotation      # 诗句注解（verse_index + start/end_pos 定位）
note            # 笔记/评论（整首诗）
bookmark        # 书签/收藏（type='favorite'，UNIQUE(poetry_id,type)）
tag             # 自定义标签
poetry_tag      # 诗词-标签关联表

-- AI 模块
model_config    # 模型配置（apiKeyEnc 为 safeStorage 加密后的 Key，apiKey 列恒为空串）
ai_analysis     # 赏析缓存（poetry_id 主键，content 为 PoetryAnalysis JSON）
```

### 迁移规范（重要）
- 一律使用 `userData.migrateNs(ns, version, script)`，如 `migrateNs('ai', 1, ...)`、`migrateNs('interaction', 1, ...)`
- **脚本必须幂等**（CREATE TABLE/INDEX IF NOT EXISTS）。历史版本曾用 DROP+重建 + 全局版本号，既会漏执行迁移也会误清用户数据，已废弃
- ALTER TABLE 等无法 IF NOT EXISTS 的操作，先用 `PRAGMA table_info` 判断再执行（参考 `AiDB.ensureApiKeyEncColumn`）

## API 设计规范

### IPC 命名规范
格式：`模块名-操作-对象`，如 `db-get-poetry-by-id`、`interaction-add-note`、`ai-analyze-poetry`

### 参数命名规范
- **渲染层入参一律驼峰**，类型定义为各模块的 `XInput`（如 `BookmarkInput { poetryId, type }`、`NoteInput { poetryId, title?, content }`、`AnnotationInput { poetryId, verseIndex, startPos, endPos, content }`）
- **数据库行结构保留 snake_case**（对应列名），转换在主进程 DB 层内完成
- 权威类型定义：`src/preload/types.ts`（ExposedApi）；改动任何 IPC 必须三处同步：main 的 ipc.ts、preload/index.ts、preload/types.ts

### 搜索 API
```typescript
// keyword 传中文原文，主进程内部转拼音并转义
// FTS（标题/作者/词牌拼音）未命中且关键词含中文时，回退正文 LIKE 子串搜索
// options.ids 提供时仅在集合内搜索（经临时表 _search_ids）；limit<=0 表示不限条数
searchPoetry(keyword, { ids?, categoryId?, page?, limit? }): PaginatedSearchResult

// 跨库组合查询（interaction 模块）：先取用户库 ID 集合，再在诗词库内过滤分页，各一次 IPC
searchBookmarkedPoetry({ keyword?, categoryId?, page?, limit? })
searchTaggedPoetry({ tagId, keyword?, categoryId?, page?, limit? })
```

### 交互模块 API（节选，完整见 preload/types.ts）
```typescript
// 收藏：批量检查代替全表拉取
filterBookmarkedIds(poetryIds: number[], type?): number[]

// 标签：单条 GROUP BY 计数，禁止逐标签拉全量
getTagPoetryCounts(tagIds?): Array<{ tagId, count }>
```

### AI 模块 API
```typescript
// force=true 忽略缓存重新请求并覆盖缓存
analyzePoetry(poetry, force?): Promise<PoetryAnalysis>
```

## 安全架构
- 上下文隔离（contextIsolation: true）+ 沙盒（sandbox: true）+ CSP（index.html）
- 预加载脚本仅暴露类型化 API，数据库操作全部在主进程
- 模型 API Key：safeStorage 加密存 `apiKeyEnc`；加密不可用时退回明文并打日志；**所有返回给渲染层的配置必须经过 `sanitize`（apiKey 置空、剔除 apiKeyEnc）**，主进程内部读取用 `getDefaultModelConfigRaw()`
- 编辑模型配置时 apiKey 留空表示保留原值（DB 层处理）
- 单实例锁：`app.requestSingleInstanceLock()`，二次实例退出并聚焦已有窗口，避免并发写用户库

## 错误处理规范
```typescript
try {
  // 数据库操作
} catch (error) {
  log.error('操作失败:', error)   // electron-log
  throw error // 向渲染进程抛出，附上下文信息；不要吞成无意义文案
}
```

## 性能优化（已实现）
- FTS5 + BM25 相关性排序；转义后的 MATCH 表达式杜绝语法错误
- 收藏/标签/普通搜索均支持 ID 集合过滤（临时表，无参数数量限制）与 SQL 分页
- 列表/搜索返回 `PoetrySummary`（不取 notes/tags/extra_info，少 3 次 JSON.parse）；详情用 `getPoetryById` 取全量
- 收藏状态按页批量 IN 查询（500 一批）+ 渲染层缓存；标签计数单条 GROUP BY
- 赏析按诗缓存，AI 只请求一次
- 随机诗词用 id 随机落点，避免 `ORDER BY RANDOM()` 全表扫描

## 开发约束

### 必须遵循
- 所有 IPC 接口必须有类型定义，三处（main ipc / preload / preload types）同步修改
- 数据库 schema 变更走 `migrateNs` 新版本号，脚本幂等
- 用户数据表变更必须记录 updated_at（毫秒时间戳，number 类型）
- 代码注释使用中文

### 禁止事项
- 不要写 poetry.sqlite 的业务表（搜索用的临时表 `_search_ids` 除外）
- 不要在渲染进程直接访问数据库
- 不要硬编码文件路径
- 不要忽略异步操作的错误
- 不要让 IPC 返回值携带 apiKey / apiKeyEnc
