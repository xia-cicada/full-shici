# full-shici

[网站](https://xia-cicada.github.io/full-shici/)

全诗词，当前包含全唐诗、全宋诗、宋词、元曲、诗经、楚辞、五代诗词、论语、曹操诗集，如果自己构建数据库，也很方便增加别的数据集。

_诗词数据基于[Chinese-Poetry](https://github.com/chinese-poetry/chinese-poetry)。_

## 功能特性

- **浏览与搜索**：支持分类浏览与关键词搜索。中文关键词可直接搜标题、作者、词牌和**诗词正文**；也支持拼音搜索（如 `libai`、`wang wei`，连续输入会自动按音节切分），覆盖标题、作者、词牌。
- **AI 赏析**：详情页一键生成词汇注释、内容赏析、艺术特色与情感表达，并对正文难词做高亮提示。支持任意 OpenAI 兼容接口（DeepSeek、OpenAI、本地大模型等）。
  - 赏析结果按诗缓存，同一首诗只请求一次，可点击右上角刷新按钮强制重新赏析；
  - API Key 通过系统级加密（Electron safeStorage）保存在本地数据库，不会明文落盘、不会传回界面。
- **笔记与注解**：为每首诗添加评论笔记。
- **收藏与标签**：收藏喜欢的诗词，自定义标签归类整理。
- **主题**：亮色 / 暗色主题切换。
- **单实例运行**：重复启动时自动聚焦已有窗口，避免数据竞争。

## 下载

[下载](https://github.com/xia-cicada/full-shici/releases/download/v0.0.2/full-shici-0.0.2-setup.exe)
[下载：备用地址](https://store-1258290249.cos.ap-guangzhou.myqcloud.com/others/full-shici/full-shici-0.0.2-setup.exe)

## Project Setup

环境要求：[Node.js](https://nodejs.org/) 20+、[pnpm](https://pnpm.io/)。

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Typecheck

```bash
$ pnpm typecheck
```

### Build

> 在打包之前，需要先参考[数据库准备](./docs/build-sql/README.md)来生成 poetry.sqlite 文件，并放置到 `resources/` 目录下。缺失该文件时应用会显示引导页，但无法提供数据。

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```

## AI 赏析配置

1. 点击应用右上角的模型配置按钮，添加一个模型配置；
2. 填写任意 OpenAI 兼容服务的 baseURL、API Key 与模型名称（默认预设为 DeepSeek）；
3. 勾选"设为默认"后即可在详情页使用 AI 赏析。

也可以通过环境变量 `DEEPSEEK_API_KEY` 提供默认的 DeepSeek Key（未添加任何配置时生效）。

## 数据库说明

应用使用两个独立的 SQLite 数据库：

| 数据库 | 位置 | 说明 |
| --- | --- | --- |
| `poetry.sqlite` | 应用 `resources/` 目录 | 只读的诗词数据库（含 FTS5 全文索引），构建方式见 [数据库准备](./docs/build-sql/README.md) |
| `userdata.sqlite` | 系统用户数据目录 | 收藏、笔记、标签、AI 赏析缓存、模型配置等用户数据，带按模块的版本化迁移 |

## 致谢

- [Chinese-Poetry](https://github.com/chinese-poetry/chinese-poetry)
- [electron-vite](https://github.com/alex8088/electron-vite)、[Naive UI](https://www.naiveui.com/)、[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
