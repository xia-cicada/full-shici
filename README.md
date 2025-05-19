# full-shici

[网站](https://xia-cicada.github.io/full-shici/)

全诗词，当前包含全唐诗、全宋诗、宋词、元曲、诗经、楚辞、五代诗词、论语、曹操诗集，如果自己构建数据库，也很方便增加别的数据集。

_诗词数据基于[Chinese-Poetry](https://github.com/chinese-poetry/chinese-poetry)。_

[下载](https://github.com/xia-cicada/full-shici/releases/download/v0.0.1/full-shici-0.0.1-setup.exe)
[下载：备用地址](https://store-1258290249.cos.ap-guangzhou.myqcloud.com/others/full-shici/full-shici-0.0.1-setup.exe)

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
