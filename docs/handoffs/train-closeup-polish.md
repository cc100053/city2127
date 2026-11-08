# train-closeup-polish — 導軌列車（Blender）

- Owner: cc100053
- Status: IN_PROGRESS — R1 等 owner 睇
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

## Next

Owner 睇 R1 → R2 針對上面五項 → FPS（`fps.sh`）→ merge。
