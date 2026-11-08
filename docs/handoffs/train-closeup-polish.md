# train-closeup-polish — 導軌列車（Blender）

- Owner: cc100053
- Status: IN_PROGRESS — R2 等 owner 睇
- Branch: `feat/train-closeup-polish`（worktree `../city2127-train`）
- Base commit: `2d7c25d`（origin/main）
- Last verified commit: 見 branch tip；`npm test`／`npm run build`／`git diff --check` 通過
- Remote availability: origin/feat/train-closeup-polish

## Session Git state

- Session starting branch and HEAD: `main` `304084d`（落後 origin/main 27 commits，有 owner 未提交改動，全部保留，未 pull）
- Last fetched origin/main commit: `2d7c25d`（2026-11-08）
- Local changes present at session start: docs／artifacts 改動、`.agents/skills/blender-*`、`Dev_QA.md` 等；與本任務無關，保留
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

將 Yurikamome 導軌列車（`mobility.ts` `podParts()`：`guideway-pods` 同 `sweep-pods`，四個 rounded box）換成 Blender GLB，沿用車輛家族嘅 `fleet.rebuild()` 做法，方盒留做 fallback。目標圖由 owner 揀；owner 一人驗收。

點解揀列車（2026-11-08）：hero 鏡頭入面列車離鏡頭約 560 m（每卡約 20 px），同街車距離一樣；水上的士同灣內渡輪約 2 km，空中的士 200–300 m 但機身細。列車係台場代表性交通，亦係近景最粗嘅交通工具。

## 審查鏡頭

`?review=ring&reviewTime=40&cam=100,25,-114&at=106,16,-146`，`hour=12`／`hour=21`，1600×900。鏡頭由 raycast 揀：導軌大部分段落被大廈或導軌上嘅樹遮住，呢個位見到 A 線列車六卡同車頭，下面有街車做比例。

## Baseline 診斷

| 症狀 | 原因 |
| --- | --- |
| 車頭同其他卡一樣，係方盒端面加一條珊瑚色線 | `podParts()` 每卡同一組 parts，冇 lead car |
| 六卡似六個獨立盒 | 卡與卡之間 1 m 空隙，冇 gangway |
| 窗係一條實色深藍帶，睇唔到入面 | `glass` 係不透明深色 MeshStandard，冇室內 |
| 車坐喺導軌面，冇 maglev 特徵 | 冇裙板、冇 under-emitter、冇浮動間隙 |
| 夜晚得薄荷線發光 | 冇室內光、車頭燈、車尾燈 |

Baseline 截圖：`~/city2127-evidence/train-closeup-polish/baseline/`（`train-day.png`、`train-night.png`、`hero-day.png`）。Prompt：[prompts.md](../../artifacts/train-closeup-polish/prompts.md)。

## 目標圖

Gemini 第 1 輪（保守 maglev：尖頭、玻璃帶、裙板）owner 退回：「not 2127 taste, more exaggerate」。第 2 輪兩個方向：A 浮空力場、B 巨型軌道環（要沿導軌加固定環，改 hero）。Owner 2026-11-08 揀 **A 夜景版**（發光環套住每個車廂接駁位、隨車移動；刀鋒車頭；玻璃頂見乘客）；日景按同一設計補生成。[target/](../../artifacts/train-closeup-polish/target/)，prompt [prompts.md](../../artifacts/train-closeup-polish/prompts.md)。

## R1

- 模型：`asset/models/train-2127/build_train.py`（`train_lead` 刀鋒車頭＋擋風玻璃＋暖白頭燈帶；`train_mid`；`train_tail` 紅尾帶）。lead 3,426、mid 2,878、tail 2,306 tris，GLB 388 KB。車身離導軌頂 .62 m 浮起；接駁位有發光環（R 1.66 m）同力場 coupler；車底一塊 field 光片。
- 物料角色：`train_body`、`train_interior`（colour attribute）、`train_glass`、`train_seam`、`train_ring`、`train_head`、`train_tail`、`train_field`。Runtime 新增 `trainGlass`、`trainRing`、`trainField`、`trainInterior`（夜間暖光比車輛強）；seam／頭燈／尾燈沿用車輛物料。
- Runtime：`mobility.ts` `trainFleet()` 將每列車拆成 lead／mid／tail 三個 fleet（mid fleet 喺車頭車尾 slot 畫 scale 0），GLB 載入後 `rebuild`；方盒 fallback 保留（已驗：footprint 超出時保持方盒）。`guideway-pods` 同 `sweep-pods` 都換。`districtMeters` 測試改為三個 fleet 加埋計可見車廂數。
- Bug：第一版 shell winding 反咗（面朝內），runtime 睇落成架車透明；已修。

對比圖 [r1/vs-target.jpg](../../artifacts/train-closeup-polish/r1/vs-target.jpg)（左 baseline、中 R1、右目標；上日下夜）。Opus 目測，未跑 judge／rubric。已知低於目標：

- 車頭刀鋒太長太幼，擋風玻璃同暖白頭燈帶喺鏡頭入面讀唔到。
- 腰線冷光（seam）日夜都幾乎睇唔到；目標係明顯一條。
- 車底力場光（field）唔明顯；目標有藍白光托住車。
- 環比目標細同幼。
- 日景玻璃偏乳白，乘客唔夠清；夜景室內暖光 OK 但乘客細節弱。

FPS：NOT RUN（24+4 車廂，每卡約 3k tris，draw calls 由 8 增至約 39）。Hero 截圖 `~/city2127-evidence/train-closeup-polish/r1/hero-day.png`。

## R2

針對 R1 五項。對比圖 [r2/vs-target.jpg](../../artifacts/train-closeup-polish/r2/vs-target.jpg)（左 R1、中 R2、右目標；上日下夜）。Opus 目測，未跑 judge。

- 環：車身升到離導軌頂 1.02 m（`FLOAT`），環半徑 1.66 → 2.0、管 .12 → .15，腳仍然離導軌頂 .06。
- 力場：車底光片之外加兩幅由車腹邊斜落導軌兩側嘅光簾（頂亮底暗，additive）；日間強度 .55 → .9。
- 腰線：由車身中間移到窗台下（s −.04….04），呢個高鏡頭先睇得到；新 `trainSeam` 物料（日 1.3／夜 3.5）。
- 車頭：刀鋒 6.2 → 4.6 m、闊身啲；擋風玻璃伸到刀鋒一半；頭燈帶加粗、凸出車殼面 4 cm（之前沉咗喺刀鋒面下面）；新 `trainHead`（日 1.2／夜 4.2）。
- 乘客：窗台降到 s .1，座艙再升 .15 m，坐住嘅乘客頭同膊頭喺玻璃後面見到（R1 中間卡個頭喺窗台下面）。玻璃改深色、少反光（`#4f6f86`、opacity .34、envMap .6）。

仍低於目標：

- 車頭仍然似一支長刺；目標係闊啲、有明顯深色擋風玻璃同白框嘅車頭。
- 日景玻璃仍然偏白，乘客細節弱。
- 夜景室內係平嘅橙色剪影，目標係暖白室內加清楚嘅人。
- 夜景腰線有，但唔夠目標咁亮咁清楚。

FPS（`fps.sh` headed Chrome，hero `se:high`，1920×1080，同一部機同一時段）：GLB 第一次 日 12.8–13.3／夜 14.6–14.7；方盒 fallback 日 12.7–13.6／夜 12.9。兩者一樣，即係列車冇明顯成本；但絕對值只有 13 左右，今日部機好慢（車輛 handoff 記錄係 26），未有 60 FPS 結論。

## Next

Owner 睇 R2 → 接受就 sync PROJECT／VALIDATION 再 merge；或者 R3 針對車頭同室內。FPS 要喺機況正常時再量。
