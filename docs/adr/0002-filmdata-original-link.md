# `parseFilmData` 投影补 `originalLink` 与详情页管线失败契约

## 1. `FilmData` 投影保留 `originalLink`

`src/core/parser.ts:141` 的 `parseFilmData(metadata, link)` 此前从 `Metadata`
投影到 `FilmData` 时丢弃了 `gid`、`img`、原始详情页 `link`。CSV 输出需要稳定
的"详情页可点击"字段，因此扩展投影保留 `originalLink`。`gid` 与 `img` 仍不
进入 `FilmData`（番号信息已包含在 `title` 中；`img` 由图片下载流程独立处理）。

字段命名与代码内现有驼峰约定一致（`magnetLinks` / `category` / `actress`）；
CSV 列名另作 `original_link` 走 CSV 自身的 snake_case 列序。

## 2. 详情页管线的硬失败 / 软失败契约

`src/core/pipelines/detailPage.ts` 的 `process(link)` 统一了"详情页处理"
的所有失败模式：

| 来源 | 失败形态 | 管线返回 |
|---|---|---|
| `requestHandler.getPage` | 返回 `null` / body 为空 | **`null`**（硬失败） |
| `parseMetadata` | 抛错 | **`null`**（硬失败） |
| `requestHandler.fetchMagnet` | 返回 `null` | `{ filmData, metadata }` 但 `magnetLinks` 为空 |
| `requestHandler.fetchMagnet` | 抛错（koonjs 瞬断等） | `{ filmData, metadata }` 但 `magnetLinks` 为空 |

设计意图：已经成功解析的元数据不应被磁链 I/O 抖动所连带丢弃；koonjs 抛错
被规范化成软失败，与 `extractMagnetLinks` 返回 `null` 走同一路径。

`process()` 不抛——调用方（队列 worker）写 `if (!result) 跳过` 即可。

追溯于 issue #72 的字段范围决策，以及"详情页管线"作为可独立测试模块的
架构评审（候选 A）。
