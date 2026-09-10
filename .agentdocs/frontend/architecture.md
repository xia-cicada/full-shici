# 前端架构文档

## 技术栈
- **框架**: Vue 3.5 + TypeScript 5.9
- **构建工具**: Electron-Vite 5（Vite 7）
- **UI 组件库**: Naive UI 2.43（unplugin-vue-components 自动按需引入 + NaiveUiResolver）
- **样式**: UnoCSS（presetWind3，含响应式断点）+ presetIcons（Tabler）+ SCSS
- **状态管理**: Pinia 3
- **路由**: Vue Router 4（hash 模式）
- **自动导入**: vue/vue-router/pinia API 与 Naive UI 组件均无需手动 import

## 目录结构
```
src/renderer/src/
├── main.ts                 # Vue 应用入口
├── App.vue                 # 根组件（主题 Provider + 消息/对话框等 Provider）
├── router/                 # 路由配置
├── views/                  # 页面组件（Home/Detail/Favorites/Tags/ModelConfig/About/404）
│   └── layout/MainLayout.vue  # 布局 + 诗词库缺失检测
├── components/             # 可复用组件（BookmarkButton/PoetryAnalysis/PoetryNotes/
│                           #   PoetryTags/DbMissingTip/CustomAppBar/AppUtils）
├── stores/interaction.ts   # 用户交互全局状态（收藏缓存、标签）
├── composables/useTheme.ts # 亮暗主题
├── utils/index.ts          # toDeepRaw（IPC 传参深拷贝）、parsePoetryNote
├── plugins/naive.ts        # Naive UI 安装
└── assets/                 # 字体（霞鹜文楷 Medium/Regular）与全局样式
```

## 路由结构
- `/home` - 诗词列表和搜索（keep-alive 缓存，组件名 `Home`）
- `/detail` - 诗词详情和 AI 赏析（query 传 id）
- `/favorites` - 收藏列表页面
- `/tags` - 标签管理页面
- `/model-config` - AI 模型配置
- `/about` - 关于页面
- 404 页面组件存在但未注册 catch-all 路由

## 与主进程的契约
- 所有与主进程的通信通过 `window.electronAPI`，类型定义在 `src/preload/types.ts`（权威来源）
- **入参一律驼峰命名**（如 `{ poetryId, type }`）；行数据（created_at 等）保持 snake_case
- 传对象给 IPC 前用 `toDeepRaw()` 深拷贝，避免不可克隆的响应式代理
- 缺失诗词库时 MainLayout 检测 `db.getStatus()`，显示 `DbMissingTip` 引导页替代路由视图

## 关键数据流
- **搜索**：`db.searchPoetry(原文, { categoryId, page, limit })`；收藏/标签视图分别走
  `interaction.searchBookmarkedPoetry(...)` 与 `interaction.searchTaggedPoetry({ tagId, ... })`，
  过滤与分页都在主进程完成，渲染层不要再做全量内存分页
- **收藏状态**：读 `interactionStore.bookmarkCache`（响应式 Map），批量刷新用
  `batchCheckBookmarks(ids)`；切换用 `toggleBookmark`，缓存由 store 内部维护
- **AI 赏析**：`PoetryAnalysis` 组件挂载时自动请求（主进程有按诗缓存），刷新按钮传 `force=true`

## 组件规范

### 命名规范
- 页面组件：大驼峰命名，如 `Home.vue`、`Detail.vue`
- 可复用组件：大驼峰命名，如 `PoetryAnalysis.vue`
- 使用 `<script setup lang="ts">` 组合式 API

### 样式规范
- 优先使用 UnoCSS 原子类（`--at-apply` 可在 SCSS 中使用）
- 自定义样式使用 scoped
- 支持主题切换，颜色用 Naive UI 主题变量（`var(--card-color)` 等），避免硬编码
- 响应式用 Wind 断点（如 Detail 内容区 `grid-cols-1 md:grid-cols-2`）

### 状态管理
- 全局状态使用 Pinia store（目前仅 `stores/interaction.ts`）
- 页面内状态使用 ref/reactive
- 跨组件通信优先使用 props/emit

## UI 组件使用

### Naive UI 组件
- 布局：NLayout, NLayoutHeader, NLayoutContent, NScrollbar
- 表单：NInput, NSelect, NButton, NForm, NSwitch, NInputNumber
- 数据展示：NDataTable, NCard, NTag, NCollapse, NList, NResult
- 反馈：message/dialog/notification/loadingBar 通过 `AppUtils.vue` 挂到 `window.$message` 等使用
- 导航：NPagination（配合服务端分页：@update:page 重新请求）

### 图标
使用 UnoCSS 图标，Tabler Icons 为主：
```html
<div class="i-tabler-heart" />
<div class="i-tabler-heart-filled" />
```

## 性能约定
- Home 页面使用 keep-alive 缓存（onActivated 里刷新收藏状态）；Detail 不缓存
- 列表均为服务端分页（每页默认 10 条），列表结果只含摘要字段（无 notes/tags/extra_info）
- 表格的数组字段（如 paragraphs）必须在 render 中 join 展示，不要直接绑定数组
- 虚拟滚动：数据量大时待实现

## 开发约束

### 必须遵循
- 所有组件必须有明确的类型定义
- 变更后运行 `pnpm typecheck`（vue-tsc 校验渲染层）
- 格式化使用 Prettier：`pnpm format`（项目未配置 ESLint，勿引入）
- 避免直接操作 DOM（例外：`poetry-highlight.ts` 的难词高亮是刻意的 DOM 操作，含清理函数）
- 错误处理统一 try-catch + `message.error` 提示 + console.error
- 代码注释使用中文

### 禁止事项
- 不要在组件中直接操作数据库或绕过 preload API
- 不要硬编码主题颜色
- 不要使用内联样式（除非动态计算）
- 不要在渲染层做全量数据的内存过滤/分页（收藏、标签等集合由主进程处理）
