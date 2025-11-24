# 前端架构文档

## 技术栈
- **框架**: Vue 3.5.13 + TypeScript 5.8.2
- **构建工具**: Electron-Vite 3.1.0
- **UI 组件库**: Naive UI 2.41.0
- **样式**: UnoCSS + SCSS
- **状态管理**: Pinia 3.0.1
- **路由**: Vue Router 4.4.5

## 目录结构
```
src/renderer/src/
├── main.ts                 # Vue 应用入口
├── App.vue                 # 根组件
├── router/                 # 路由配置
├── views/                  # 页面组件
├── components/             # 可复用组件
├── stores/                 # Pinia 状态管理
├── composables/            # 组合式函数
├── utils/                  # 工具函数
├── plugins/                # 插件配置
├── types/                  # 类型定义
└── assets/                 # 静态资源
```

## 路由结构
- `/home` - 诗词列表和搜索（使用 keep-alive 缓存）
- `/detail` - 诗词详情和 AI 赏析
- `/favorites` - 收藏列表页面
- `/tags` - 标签管理页面
- `/model-config` - AI 模型配置
- `/about` - 关于页面

## 组件规范

### 命名规范
- 页面组件：大驼峰命名，如 `Home.vue`、`Detail.vue`
- 可复用组件：大驼峰命名，如 `PoetryAnalysis.vue`
- 使用 `<script setup lang="ts">` 组合式 API

### 样式规范
- 优先使用 UnoCSS 原子类
- 自定义样式使用 scoped
- 支持主题切换，避免硬编码颜色

### 状态管理
- 全局状态使用 Pinia store
- 页面内状态使用 ref/reactive
- 跨组件通信优先使用 props/emit

## IPC 调用规范
所有与主进程的通信通过 `window.electronAPI` 进行，类型定义在 `src/preload/types.ts` 中。

### 常用 API
```typescript
// 诗词数据库
window.electronAPI.db.getPoetryById(id)
window.electronAPI.db.searchPoetry(keyword, options)

// 用户交互
window.electronAPI.interaction.setBookmark(bookmark)
window.electronAPI.interaction.getBookmark(params)
window.electronAPI.interaction.addNote(note)
window.electronAPI.interaction.getNotesByPoetry(poetryId)
window.electronAPI.interaction.createTag(tag)
window.electronAPI.interaction.getAllTags()
```

## UI 组件使用

### Naive UI 组件
项目已全局配置 Naive UI，常用组件：
- 布局：NLayout, NLayoutHeader, NLayoutContent, NScrollbar
- 表单：NInput, NSelect, NButton, NForm
- 数据展示：NDataTable, NCard, NTag, NCollapse
- 反馈：NMessage, NDialog, NNotification, NSpin, NSkeleton
- 导航：NPagination

### 图标
使用 UnoCSS 图标，Tabler Icons 为主：
```html
<div class="i-tabler-heart" />
<div class="i-tabler-heart-filled" />
```

## 性能优化

### 路由缓存
- Home 页面使用 keep-alive 缓存，避免重复加载
- Detail 页面不缓存，确保数据实时性

### 列表渲染
- 使用虚拟滚动处理大量数据（待实现）
- 分页加载，默认每页 10 条

## 开发约束

### 必须遵循
- 所有组件必须有明确的类型定义
- 使用 ESLint 和 Prettier 格式化代码
- 避免直接操作 DOM，使用 Vue 的响应式系统
- 错误处理统一使用 try-catch + message.error 提示
- 代码注释使用中文

### 禁止事项
- 不要在组件中直接操作数据库
- 不要硬编码主题颜色
- 不要使用内联样式（除非动态计算）
- 不要在 setup 外部使用 ref/reactive
