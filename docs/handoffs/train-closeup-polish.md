# train-closeup-polish — 導軌列車（Blender）

- Owner: cc100053
- Status: IN_PROGRESS — 目標圖生成中，等 owner 揀
- Branch: `feat/train-closeup-polish`（worktree `../city2127-train`）
- Base commit: `2d7c25d`（origin/main）
- Last verified commit: NONE（未改 code）
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

## Next

Owner 揀目標圖 → rubric → Blender `asset/models/train-2127/build_train.py` → R1。
