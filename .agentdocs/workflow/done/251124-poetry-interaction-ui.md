# 任务：实现诗词标记、评论、标签功能的前端界面

**任务日期**: 2025-11-24
**任务状态**: 进行中

## 任务背景

项目后端已完整实现用户交互功能（bookmark、note、tag、annotation），但前端UI尚未实现对应的用户界面。用户需要在前端添加完整的用户交互功能，提升使用体验。

## 功能需求

### 1. 收藏/书签功能
- 详情页显示收藏按钮和收藏状态
- 列表页显示收藏状态和快捷收藏按钮
- 新增独立收藏页面，查看所有收藏的诗词

### 2. 评论/笔记功能
- 详情页显示评论列表
- 支持添加、编辑、删除评论
- 每条评论支持标题和内容

### 3. 自定义标签功能
- 详情页显示和选择标签
- 新增标签管理页面
  - 创建、编辑、删除标签
  - 支持标签颜色
  - 查看该标签下的所有诗词
- 列表页支持按标签筛选

## 技术方案

### 页面结构设计

#### 1. 诗词详情页（Detail.vue）
布局调整为上下结构：
- **顶部**：标题栏 + 操作工具栏（收藏、编辑标签等）
- **中部**：左右两栏
  - 左侧：诗词内容 + 附加信息
  - 右侧：AI 赏析
- **底部**：评论/笔记区域（可折叠）

#### 2. 收藏页面（Favorites.vue）
- 展示所有收藏的诗词列表
- 支持搜索和排序
- 点击跳转到详情页
- 支持快速取消收藏

#### 3. 标签管理页面（Tags.vue）
- 左侧：标签列表（带颜色标识）
  - 创建新标签按钮
  - 每个标签显示关联的诗词数量
  - 支持编辑和删除标签
- 右侧：选中标签下的诗词列表

#### 4. 列表页（Home.vue）
增强功能：
- 每行添加收藏状态图标
- 操作列添加快捷收藏按钮
- 筛选区域增加标签选择器

### 组件设计

#### 1. BookmarkButton.vue（收藏按钮组件）
可复用组件，支持：
- 显示收藏状态（已收藏/未收藏）
- 点击切换收藏状态
- 支持不同尺寸（small、medium、large）
- 支持不同样式（按钮、图标）

```typescript
interface Props {
  poetryId: number
  size?: 'small' | 'medium' | 'large'
  type?: 'button' | 'icon'
}
```

#### 2. PoetryNotes.vue（评论/笔记组件）
显示和管理诗词的评论：
- 评论列表展示
- 添加评论表单（标题 + 内容）
- 编辑和删除功能
- 折叠/展开

```typescript
interface Props {
  poetryId: number
}
```

#### 3. PoetryTags.vue（诗词标签组件）
显示和管理诗词的标签：
- 标签列表展示（带颜色）
- 添加/移除标签
- 弹窗选择标签

```typescript
interface Props {
  poetryId: number
  editable?: boolean
}
```

#### 4. TagManager.vue（标签管理组件）
管理所有标签：
- 创建新标签（名称 + 颜色选择器）
- 编辑标签
- 删除标签（需确认）

### 状态管理

创建 `stores/interaction.ts` 管理用户交互数据：

```typescript
export const useInteractionStore = defineStore('interaction', () => {
  // 收藏状态缓存
  const bookmarks = ref<Map<number, boolean>>(new Map())

  // 标签列表缓存
  const tags = ref<Tag[]>([])

  // 获取收藏状态
  const isBookmarked = async (poetryId: number) => {
    // 实现逻辑
  }

  // 切换收藏
  const toggleBookmark = async (poetryId: number) => {
    // 实现逻辑
  }

  // 加载所有标签
  const loadTags = async () => {
    // 实现逻辑
  }

  return {
    bookmarks,
    tags,
    isBookmarked,
    toggleBookmark,
    loadTags
  }
})
```

### 路由配置

在 `router/index.ts` 中添加新路由：

```typescript
{
  path: '/favorites',
  name: 'Favorites',
  component: () => import('@/views/Favorites.vue')
},
{
  path: '/tags',
  name: 'Tags',
  component: () => import('@/views/Tags.vue')
}
```

### UI/UX 设计

#### 颜色方案
- 收藏图标：
  - 未收藏：灰色心形（i-tabler-heart）
  - 已收藏：红色填充心形（i-tabler-heart-filled）
- 标签颜色：支持预设颜色（红、橙、黄、绿、蓝、紫、粉）

#### 交互反馈
- 收藏操作：点击后立即更新图标，显示 message 提示
- 添加评论：成功后刷新列表，显示成功提示
- 删除操作：需要二次确认（NDialog）

## 实施计划

### 阶段 1：基础组件开发（已完成）
- [x] 创建项目文档结构
- [x] 编写架构文档
- [x] 编写任务文档

### 阶段 2：状态管理和工具函数（已完成）
- [x] 创建 `stores/interaction.ts` 状态管理
- [x] 封装常用的交互 API 调用

### 阶段 3：收藏功能实现（已完成）
- [x] 创建 `BookmarkButton.vue` 组件
- [x] Detail.vue 中添加收藏按钮
- [x] Home.vue 中显示收藏状态和快捷操作
- [x] 创建 `Favorites.vue` 收藏列表页

### 阶段 4：评论/笔记功能实现（已完成）
- [x] 创建 `PoetryNotes.vue` 组件
- [x] Detail.vue 中集成评论区域
- [x] 实现添加、编辑、删除评论功能

### 阶段 5：标签功能实现（已完成）
- [x] 创建 `PoetryTags.vue` 组件
- [x] 创建 `TagManager.vue` 标签管理组件
- [x] Detail.vue 中集成标签选择
- [x] 创建 `Tags.vue` 标签管理页
- [x] Home.vue 中添加标签筛选

### 阶段 6：测试和优化（已完成）
- [x] 整体功能测试
- [x] UI/UX 优化调整
- [x] 路由配置更新
- [x] 文档更新

## 技术要点

### 1. 数据缓存策略
- 收藏状态：使用 Pinia store 缓存，避免重复查询
- 标签列表：应用启动时加载，增删改后更新缓存
- 评论列表：按需加载，不缓存（确保实时性）

### 2. 性能优化
- 列表页收藏状态批量查询（一次性获取当前页所有诗词的收藏状态）
- 防抖处理用户输入（搜索、筛选）
- 虚拟滚动处理大量数据（如收藏列表）

### 3. 错误处理
- 所有 API 调用使用 try-catch
- 失败时显示友好的错误提示
- 网络错误时提供重试选项

### 4. 用户体验
- 操作即时反馈（乐观更新）
- 加载状态提示（loading、skeleton）
- 平滑的动画过渡
- 响应式布局适配

## 验收标准

### 功能完整性
- [x] 收藏功能完整可用（详情页、列表页、收藏页）
- [x] 评论功能完整可用（查看、添加、编辑、删除）
- [x] 标签功能完整可用（显示、添加、移除、管理页）

### 代码质量
- [x] 所有组件有明确的类型定义
- [x] 代码有适当的中文注释
- [x] 遵循项目架构规范

### 用户体验
- [x] 操作流畅，响应及时
- [x] 错误提示友好清晰
- [x] 支持深色/浅色主题（使用 Naive UI 默认主题）
- [x] 响应式布局正常

## 实施总结

### 完成的功能

#### 1. 收藏功能
- **BookmarkButton 组件** (`src/renderer/src/components/BookmarkButton.vue`)
  - 支持按钮和图标两种模式
  - 实时显示收藏状态（心形图标，已收藏为红色填充）
  - 点击切换收藏状态，带操作反馈

- **详情页收藏** (`src/renderer/src/views/Detail.vue`)
  - 顶部标题栏右侧显示收藏按钮
  - 收藏状态实时更新

- **列表页收藏** (`src/renderer/src/views/Home.vue`)
  - 表格第一列显示收藏状态图标
  - 操作列增加快捷收藏按钮
  - 批量加载收藏状态，优化性能

- **收藏页面** (`src/renderer/src/views/Favorites.vue`)
  - 独立页面展示所有收藏的诗词
  - 支持分页浏览
  - 可直接取消收藏或跳转详情

#### 2. 评论/笔记功能
- **PoetryNotes 组件** (`src/renderer/src/components/PoetryNotes.vue`)
  - 显示诗词的所有评论列表
  - 支持添加新评论（标题 + 内容）
  - 支持编辑已有评论
  - 支持删除评论（带二次确认）
  - 显示创建和更新时间（智能时间格式）

- **详情页集成** (`src/renderer/src/views/Detail.vue`)
  - 页面底部显示评论区域
  - 自动折叠/展开评论列表

#### 3. 标签功能
- **PoetryTags 组件** (`src/renderer/src/components/PoetryTags.vue`)
  - 显示诗词已有的用户标签
  - 支持添加标签（选择已有或创建新标签）
  - 支持移除标签
  - 标签带颜色显示

- **标签管理页** (`src/renderer/src/views/Tags.vue`)
  - 左侧显示所有标签列表（带诗词数量统计）
  - 右侧显示选中标签下的诗词列表
  - 支持创建、编辑、删除标签
  - 标签颜色选择器（8 种预设颜色）

- **详情页集成** (`src/renderer/src/views/Detail.vue`)
  - 附加信息区域分为"原始标签"和"我的标签"
  - 我的标签区域使用 PoetryTags 组件

- **列表页筛选** (`src/renderer/src/views/Home.vue`)
  - 搜索栏增加标签选择器
  - 支持按标签筛选诗词
  - 标签筛选结果支持分页

#### 4. 状态管理
- **interaction store** (`src/renderer/src/stores/interaction.ts`)
  - 统一管理收藏、标签等用户交互数据
  - 收藏状态缓存，减少重复查询
  - 标签列表缓存，优化加载性能
  - 批量查询收藏状态，提升列表页性能

#### 5. 路由配置
- 新增 `/favorites` 收藏页面路由
- 新增 `/tags` 标签管理页面路由

### 技术亮点

1. **性能优化**
   - 收藏状态使用 Map 缓存，避免重复查询
   - 列表页批量查询收藏状态，一次性获取整页数据
   - 标签列表全局缓存，只在需要时更新

2. **用户体验**
   - 操作即时反馈（loading 状态、message 提示）
   - 智能时间显示（刚刚、X分钟前、X小时前、昨天等）
   - 删除操作二次确认，避免误操作
   - 收藏按钮动画效果（hover 放大、active 缩小）

3. **代码组织**
   - 组件化设计，可复用性强
   - 类型定义完整，TypeScript 类型安全
   - 中文注释清晰，易于维护

### 新增文件清单

#### 文档
- `.agentdocs/index.md` - 项目文档索引
- `.agentdocs/frontend/architecture.md` - 前端架构文档
- `.agentdocs/backend/architecture.md` - 后端架构文档
- `.agentdocs/workflow/251124-poetry-interaction-ui.md` - 本任务文档

#### 状态管理
- `src/renderer/src/stores/interaction.ts` - 用户交互状态管理

#### 组件
- `src/renderer/src/components/BookmarkButton.vue` - 收藏按钮组件
- `src/renderer/src/components/PoetryNotes.vue` - 评论/笔记组件
- `src/renderer/src/components/PoetryTags.vue` - 诗词标签组件

#### 页面
- `src/renderer/src/views/Favorites.vue` - 收藏列表页
- `src/renderer/src/views/Tags.vue` - 标签管理页

#### 修改文件
- `src/renderer/src/router/index.ts` - 路由配置（新增两个路由）
- `src/renderer/src/views/Home.vue` - 列表页（收藏功能、标签筛选）
- `src/renderer/src/views/Detail.vue` - 详情页（收藏、评论、标签）

## 风险和注意事项

1. **数据一致性**：收藏状态缓存需要及时更新，避免显示不一致
2. **性能问题**：大量收藏或标签时可能影响性能，需要分页或虚拟滚动
3. **用户体验**：操作步骤不宜过多，尽量简化流程
4. **主题适配**：所有新增UI需要适配深色主题

## 后续优化建议

1. 支持更多书签类型（点赞、想读等）
2. 评论支持 Markdown 格式
3. 标签支持层级分类
4. 添加诗词分享功能
5. 数据导出功能
