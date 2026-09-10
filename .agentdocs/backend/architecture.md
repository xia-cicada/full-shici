# 后端架构文档

## 技术栈
- **运行环境**: Electron 35.0.3（主进程）
- **语言**: TypeScript 5.8.2
- **数据库**: better-sqlite3 11.9.1（SQLite）
- **AI 集成**: OpenAI SDK 4.92.1

## 目录结构
```
src/main/
├── index.ts                # Electron 应用入口
├── poetry/                 # 诗词模块
│   ├── types.ts            # 诗词数据类型
│   ├── db.ts               # 诗词数据库操作（只读）
│   └── ipc.ts              # IPC 通信接口
├── ai/                     # AI 赏析模块
│   ├── types.ts            # 模型配置类型
│   ├── ai.ts               # AI 助手实现
│   ├── db.ts               # 模型配置数据库
│   ├── ipc.ts              # IPC 通信接口
│   ├── model.ts            # 模型配置
│   └── prompt.ts           # 提示词模板
├── interaction/            # 用户交互模块
│   ├── types.ts            # 交互数据类型
│   ├── db.ts               # 交互数据库操作
│   ├── ipc.ts              # IPC 通信接口
│   └── interaction.ts      # 交互逻辑
└── userData/               # 用户数据管理
    ├── db.ts               # 用户数据库基类
    └── index.ts            # 导出
```

## 数据库架构

### 诗词数据库（poetry.sqlite - 只读）
位置：`resources/poetry.sqlite`

表结构：
- `categories` - 诗词分类（唐诗、宋词等）
- `poetry` - 诗词内容（主数据）
- `poetry_search` - FTS5 全文搜索虚拟表

特性：
- WAL 模式
- 外键约束启用
- BM25 相关性评分

### 用户数据库（userdata.sqlite - 读写）
位置：`app.getPath('userData')/userdata.sqlite`

表结构：
```sql
-- 版本管理
db_version

-- 交互数据
annotation      # 诗句注解（选中文字注释）
note            # 笔记/评论（整首诗）
bookmark        # 书签/收藏（多种类型）
tag             # 自定义标签
poetry_tag      # 诗词-标签关联表

-- AI 配置
model_config    # 模型配置
```

特性：
- WAL 模式
- 自动 timestamp 更新
- 外键约束
- 唯一性约束防重复

## API 设计规范

### IPC 命名规范
格式：`模块名-操作-对象`

示例：
```
db-get-poetry-by-id
interaction-add-note
ai-analyze-poetry
```

### 交互模块 API

#### Bookmark（书签/收藏）
```typescript
// 设置书签（存在则更新）
setBookmark(poetryId: number, type: string)

// 获取书签
getBookmark(poetryId: number, type: string)

// 获取所有书签
getAllBookmarks(type?: string)

// 移除书签
removeBookmark(poetryId: number, type: string)
```

支持的书签类型：
- `favorite` - 收藏

#### Note（笔记/评论）
```typescript
// 添加笔记
addNote(poetryId: number, title: string, content: string)

// 获取诗词的所有笔记
getNotesByPoetry(poetryId: number)

// 获取单条笔记
getNote(id: number)

// 更新笔记
updateNote(id: number, title: string, content: string)

// 删除笔记
deleteNote(id: number)
```

#### Tag（标签）
```typescript
// 创建标签
createTag(name: string, color?: string)

// 获取所有标签
getAllTags()

// 更新标签
updateTag(id: number, name: string, color?: string)

// 删除标签
deleteTag(id: number)

// 给诗词添加标签
addTagToPoetry(poetryId: number, tagId: number)

// 获取诗词的标签
getTagsByPoetry(poetryId: number)

// 获取标签下的诗词列表
getPoetriesByTag(tagId: number)

// 移除诗词的标签
removeTagFromPoetry(poetryId: number, tagId: number)
```

## 安全架构
- 完全上下文隔离（contextIsolation: true）
- 沙盒模式启用（sandbox: true）
- 预加载脚本仅暴露必要 API
- 所有数据库操作在主进程完成

## 错误处理规范
```typescript
try {
  // 数据库操作
} catch (error) {
  console.error('操作失败:', error)
  throw error // 向渲染进程抛出错误
}
```

## 性能优化

### 数据库优化
- 使用 WAL 模式提高并发性能
- FTS5 全文搜索使用 BM25 评分
- 合理使用索引
- 批量操作使用事务

### API 优化
- 搜索结果支持分页
- 缓存模型配置客户端
- 避免频繁的数据库连接

## 开发约束

### 必须遵循
- 所有 IPC 接口必须有类型定义
- 数据库操作必须有错误处理
- 用户数据变更必须记录 updated_at
- 代码注释使用中文

### 禁止事项
- 不要在主进程操作 poetry.sqlite 写入
- 不要在渲染进程直接访问数据库
- 不要硬编码文件路径
- 不要忽略异步操作的错误
