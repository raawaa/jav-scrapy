# CSV 作为 JSON 视图

CSV 输出 (`filmData.csv`) 不维护独立的存储与去重逻辑，而是从 JSON 存储 (`filmData.json`) 派生。`--format csv` 也会静默写入 JSON 作为视图后端；这样设计避免了去重逻辑双份维护，代价是用户指定 csv 时磁盘上始终存在一份 JSON。

追溯于 issue #72 的 CSV 输出设计讨论。