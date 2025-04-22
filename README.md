# full-shici

全诗词，包含全唐诗、全宋诗和全宋词。

_诗词数据基于[Chinese-Poetry](https://github.com/chinese-poetry/chinese-poetry)。_

[下载](https://github.com/xia-cicada/full-shici/releases/download/v0.0.1/full-shici-0.0.1-setup.exe)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Build

> 在打包之前，需要先参考[数据库准备](./docs/build-sql/README.md)来生成poetry.sqlite文件。

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```
