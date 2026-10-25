# 原始 patch 保存格式

2026-10-25 batch owner封存時，原patch的context空白被Git whitespace檢查當作新增行尾空白；沒有改寫patch bytes。全部原檔逐byte保存在raw-patches.tar.gz，patch-archive.json記錄每檔SHA256。需要重跑extract.py時先在本目錄解開archive。現有本機原patch仍保留但由.git/info/exclude排除，不刪除工作副本。原source/target/media manifest與provenance內容沒有改變。
