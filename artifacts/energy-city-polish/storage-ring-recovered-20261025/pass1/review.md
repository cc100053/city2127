# 第一輪恢復版 — 本次實測 PASS

2026-10-25；base db772bb + source5255520，test provenance沿用recovery限制。root test/build/diff PASS；48 batches、108權威組合、324 district／170424 exact checks；全周掃掠／固定軸承／21595船體、22m航空、泊位、公共／四站視線均沿用未放寬test。

macOS Google Chrome156.0.8078.47 headless／WebGL2，1920×1080 DPR1 default quality。DEV27張新原始PNG：hero/detail×日12／暮18.5／夜22×mixed/B/baseline，10/30/50固定phase、native static兩時點、live兩時點及live→static。固定static兩張PNG逐byte一致；live環帶角度可見變化，固定承托分離；劇場／工作翼／斜街可見。原target仍待最終人類review，不宣稱pixel-perfect或工程完成。

正式原runner重跑PASS：schema7→8、舊原文／舊ID／obsolete草稿、Q3/review、同ID pre/post commit retry、無變化／一庭結果、Undo、16票混合snapshot、日暮夜、TCP重連、reduced motion角度固定、resize及reset。只有預期favicon404、obsolete409及兩個刻意abort；page exceptions0。

首次attempt失敗及新runner等待修正見attempts.md，未冒充PASS。全部圖/log/metadata均係本次，並非session-media縮圖。GPU實值見dev/browser.json；沒有量測新FPS、其他平台／展覽硬件。
