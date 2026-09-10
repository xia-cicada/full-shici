# 数据库准备

打包后的数据库比较大，本仓库不包含 `poetry.sqlite`，需要自己下载[中国诗词数据](https://github.com/chinese-poetry/chinese-poetry)并打包生成，然后放到 `resources/` 目录下。

## 构建步骤

脚本使用 [Bun](https://bun.sh/) 运行（依赖 `bun:sqlite` / `Bun.glob` / `Bun.file`）。

1. 下载 [Chinese-Poetry](https://github.com/chinese-poetry/chinese-poetry) 数据集，把用到的子集目录放到 `docs/` 目录下（与 `build-sql` 平级）：

   ```
   docs/
   ├── build-sql/
   │   ├── sqlite-init.sql   # 建表、索引、FTS5 与触发器、分类种子数据
   │   └── sqlite3.ts        # 数据清洗 + 拼音生成 + 批量插入
   ├── 全唐诗/
   ├── 宋词/
   ├── 元曲/
   ├── 诗经/
   ├── 楚辞/
   ├── 五代诗词/
   ├── 论语/
   └── 曹操诗集/
   ```

2. 安装依赖并执行脚本（根目录下）：

   ```bash
   $ pnpm install
   $ bun docs/build-sql/sqlite3.ts
   ```

3. 脚本会在 `docs/build-sql/` 下生成 `poetry.sqlite`，把它复制到 `resources/` 目录：

   ```bash
   $ cp docs/build-sql/poetry.sqlite resources/poetry.sqlite
   ```

## 技术说明

- **全文搜索**：`poetry_search` 是 FTS5 外部内容表（`content=poetry`），通过触发器与主表保持同步，索引列为标题/作者/词牌及其拼音、首字母。
- **拼音列**：`*_pinyin` 为按音节空格分隔的无声调拼音，`*_initials` 为首字母，由 [pinyin-pro](https://github.com/zh-lx/pinyin-pro) 在构建时生成，应用内据此实现拼音搜索。
- **扩展数据集**：在 `sqlite3.ts` 中仿照现有 glob 逻辑新增一个数据源并分配新的 `category_id`，同时在 `sqlite-init.sql` 的分类种子数据中补充对应分类即可。
- 应用启动时若 `resources/poetry.sqlite` 缺失，会以空库兜底并展示引导页，不会崩溃。
