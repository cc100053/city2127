# NW focal — デックス西 AUTO HUB 接駁

- Owner：cc100053
- 狀態：已隨住宅街道修訂合併至 `main`（`4440da51`）。
- 分支：`codex/nw-focal-connections`。
- Base：`52aa690fcd162d0a27b5bfa45f92325f989d5ca7`。2026-11-17 fetch 後本地 main 與 origin/main 同步。起始分支 `codex/sw-focal-connections` 在 `bb802daa449e2aaac18f2f6fb5ce8a2bfa87014b` 與遠端候選一致。原有未追蹤 `Dev_QA.md` 原檔保留。

[Gemini 對話](https://gemini.google.com/u/3/app/8f46458565966525) 的附件是動工前的 change review 日景 `nw-focal__0__h12.jpg`。[Gemini 目標](../../artifacts/nw-focal-connections/target.jpg) 示範了陶瓷車道、藍色導線和步道分流。

實裝沿 ① 海濱大道 d 940 接出 3.8 m 陶瓷支路及藍色導線。3.1 m 人行鋪面接到既有海濱鋪面，分支斜路通至入口。中、高態平台向東到 x=57.1，低態到 x=64。上端平台以同一標高接兩組前緣，低態地台覆蓋平台末段。斜路約 10.6% 坡度，是展覽場景的地形通行設計，未按實體無障礙規格驗證。保留既有車流和行人模擬路線。新道屬靜態場景幾何。

[目標與實裝對照](../../artifacts/nw-focal-connections/target-vs-build.jpg)｜[接駁斜俯視](../../artifacts/nw-focal-connections/plan.jpg)｜[NW 三態日夜](../../artifacts/change-review/index.html#Q01)

## 驗證與接續

- 2026-11-17，Mac headless Chrome 1600 × 900，DPR 1，以固定 `reviewTime=20` 擷取 `nw:focal` 和 `nw:focal-low` 的日夜畫面，各含兩個對應狀態，共八張。另拍一張日景斜俯視。擷取無 page error。斜俯視可看到整段接駁，原近鏡主要看到地台入口和部分鋪面。
- 本候選提交的程式內容在 Node 26.0.0 通過根目錄 `npm test`、`npm run build` 及 `git diff --check`。首次測試受沙盒 loopback 監聽限制，按相同指令重跑完整套件通過。
- 幾何實測核對五處接點的表面高差（少於 2.5 cm）及兩種地台前緣。Odaiba 的車道淨空掃描亦通過。展覽機 FPS 和 live 問卷轉場未測。
- 業主指示合併 `codex/nw-focal-connections` 至 `main`。合併後以 Chrome 1600 × 900／DPR 1 核對 NW 高態近鏡，無 page error。原圖與側錄在 `~/city2127-evidence/q03-a/main/`。
