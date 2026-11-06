# 企劃組資料

企劃組草稿。使用者喺 2026-11-06 提供，整理做 Markdown，只改格式，內容冇改。**呢度只係參考資料，唔係產品 authority。** 現行展覽嘅題目、Meter、文案同視覺，仍然以 [EXHIBITION_SPEC](../EXHIBITION_SPEC.md)、[RESIDENT_COPY](../RESIDENT_COPY.md)、`survey/src/survey/questions.exhibition.json` 同 [CITY MASTER TASTE](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) 為準。採用入面任何內容都屬於產品決策，要寫入 SPEC。

| 文件 | 內容 |
| --- | --- |
| [SURVEY_V2.md](SURVEY_V2.md) | 「仮説連動型アンケート Ver.2」：Q01–Q09 共 9 題。每題有 P（心理テスト系）同 U（都市企画系）兩個版本，包括 A/B/C 選項、解釋理由、都市嘅具體變化 |
| [HYPOTHESES_MOBILITY.md](HYPOTHESES_MOBILITY.md) | 交通・物流仮説 ①–⑧（改變、原因、都市影響、反論、都市分岐）、仮説之間嘅關係、歷史資料、同其他領域嘅關係、適合 3D 展示嘅變化、最終議論 |
| [HYPOTHESES_SOCIETY_ENERGY.md](HYPOTHESES_SOCIETY_ENERGY.md) | 社會・生活仮説 ①–⑧（工時、共享、購物、AI 夥伴、職住、體驗娛樂、交流、銷售同儲存分離），加 4 個能源 brainstorm |
| [IMAGE_PROMPTS.md](IMAGE_PROMPTS.md) | 27 案圖像生成 prompt（未來感がないバージョン）：用法、製作前提、範圍同尺寸、27 案一覽、第一次試做檢查 |
| [IMAGE_PROMPTS_Q01-Q03.md](IMAGE_PROMPTS_Q01-Q03.md)／[Q04-Q06](IMAGE_PROMPTS_Q04-Q06.md)／[Q07-Q09](IMAGE_PROMPTS_Q07-Q09.md) | Prompt 全文：每案一個區画画像、一個三面図，每個 code block 可以直接貼上使用 |

## 文件之間嘅關係

- SURVEY_V2 嘅 9 個參數，同現行展覽用緊嘅 4 個 Meter（`automation`、`publicSharing`、`environmentalPriority`、`urbanConcentration`）係唔同嘅系統，未接入程式碼；唔需要一一對應。
- IMAGE_PROMPTS 每個案 Q0n-A/B/C，對應 SURVEY_V2 Un 題嘅選項 A/B/C 同埋「都市の具体的な変化」。
- 兩份 HYPOTHESES 嘅仮説，就係 SURVEY_V2 每題「関連仮説」嘅來源。
- 舊提案 [PROPOSAL_JA](../PROPOSAL_JA.md)（同 [PDF](../PROPOSAL_JA.pdf)）描述現行 4 問／4 Meter 嘅展覽。呢個資料夾係新提案，兩者可能有矛盾；同時放入 repo 係為咗對比，唔係將任何一方定為已採用。

## Owner 判斷（2026-11-06）

1. 超高層：只禁止冇意義嘅超高層；有都市意義就冇問題（U06-A 已加註）。
2. Ver.2 嘅 9 個參數唔需要對應現行 4 個 Meter。
3. IMAGE_PROMPTS（未来感がないバージョン）係同 city-taste-v2 唔同方向嘅未來感發展，當做另一個版本對比，唔當矛盾。
4. エネルギーメモ：②④ 原樣保留做原始 idea，修正同發展喺 SURVEY_V2（U02）／IMAGE_PROMPTS（Q02）做；③ 不採用，已刪除。
5. Q09 嘅 B（交流）保持獨立價值，唔係 A 同 C 嘅中間值。

## TODO

- [ ] 27 案 prompt 嘅「未來感有」版本：而家 [IMAGE_PROMPTS](IMAGE_PROMPTS.md) 係「未来感がないバージョン」，要另外諗一套有未來感嘅版本，同現版本並列對比。
