# Sector A — S0 / final r3 review

三輪實作及量測完成，**未通過全部美術門檻，未經owner接受／未merge main**。原始S0不覆寫，A3的7/9、A4的6%/12%、A5的95%/+10%均保持。[完整逐項JSON](report.json)、[final原圖與量度](r3/capture.json)、[A4](r3/comparison.json)、[效能](r3/performance.json)、[逐圖V理由](visual-review.json)、[驗證](checks.json)。

Source: `b7d5861bebeef1bbe4a17e526c07410cde4f616d`。24個final第二take原圖已逐張以original detail檢視；S0欄引用已接受基準，沒有宣稱本批重新驗收所有S0圖。r1/r2完整自動矩陣保留，V採樣問題另見[r2 notes](r2/review-notes.md)。

## Gates

```json
{
  "finalStates": 24,
  "allMeasuredStates": 72,
  "rawStaticImages": 144,
  "originalFinalImagesReviewed": 24,
  "roundsUsed": 3,
  "A1": {
    "PASS": 20,
    "N/A": 4
  },
  "A2": {
    "PASS": 20,
    "N/A": 4
  },
  "A3": {
    "FAIL": 20,
    "N/A": 4
  },
  "A4": {
    "pairs": 22,
    "pass": 1
  },
  "A5": {
    "PASS": 24
  },
  "A6": {
    "PASS": 24
  },
  "reproducibility": {
    "FAIL": 10,
    "PASS": 14
  },
  "V": {
    "V1": {
      "FAIL": 12,
      "PASS": 10,
      "N/A": 2
    },
    "V2": {
      "PASS": 24
    },
    "V3": {
      "FAIL": 22,
      "N/A": 2
    },
    "V4": {
      "PASS": 22,
      "N/A": 2
    },
    "V5": {
      "PASS": 14,
      "FAIL": 8,
      "N/A": 2
    },
    "V6": {
      "STATIC PASS": 22,
      "N/A": 2
    }
  }
}
```

## 每狀態原圖並排與理由

### ne:focal · -2 · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-focal__-2__h12.jpg)](../S0/baseline/ne-focal__-2__h12.jpg) | [![Final](r3/ne-focal__-2__h12.jpg)](r3/ne-focal__-2__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（2/9，距門檻5條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 819/817 S0）；A6 PASS。

- **V1 FAIL**：低配置可讀成機械植栽平台，但兩秒內公園用途仍含混。
- **V2 PASS**：恢復S0 focal pose後，下方有清楚海面與岸線定位。
- **V3 FAIL**：疊葉較原尖角PV冠飽滿，植栽屏不再是稀疏格仔；主體長幹及鄰近單球樹仍在，未達嚴格無棒棒糖標準。
- **V4 PASS**：有支承氣候膜環、格柵冷卻片及工程枝架構成完整主動冷卻／混合方案；數量不代表新舊年代。
- **V5 PASS**：已檢視相應低配置夜圖，冠層、環、冷卻片輪廓及水邊仍可讀。
- **V6 STATIC PASS**：本張原圖未見主體z-fighting、浮空支承或明顯尖角樹冠；靜態檢查不能證明全時段無閃爍。

### ne:focal · -2 · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-focal__-2__h22.jpg)](../S0/baseline/ne-focal__-2__h22.jpg) | [![Final](r3/ne-focal__-2__h22.jpg)](r3/ne-focal__-2__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（2/9，距門檻5條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 1189/1186 S0）；A6 PASS。

- **V1 FAIL**：低配置可讀成機械植栽平台，但兩秒內公園用途仍含混。
- **V2 PASS**：恢復S0 focal pose後，下方有清楚海面與岸線定位。
- **V3 FAIL**：疊葉較原尖角PV冠飽滿，植栽屏不再是稀疏格仔；主體長幹及鄰近單球樹仍在，未達嚴格無棒棒糖標準。
- **V4 PASS**：有支承氣候膜環、格柵冷卻片及工程枝架構成完整主動冷卻／混合方案；數量不代表新舊年代。
- **V5 PASS**：已檢視相應低配置夜圖，冠層、環、冷卻片輪廓及水邊仍可讀。
- **V6 STATIC PASS**：本張原圖未見主體z-fighting、浮空支承或明顯尖角樹冠；靜態檢查不能證明全時段無閃爍。

### ne:focal · 0 · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-focal__0__h12.jpg)](../S0/baseline/ne-focal__0__h12.jpg) | [![Final](r3/ne-focal__0__h12.jpg)](r3/ne-focal__0__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（2/9，距門檻5條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 819/817 S0）；A6 PASS。

- **V1 PASS**：八棵枝狀樹、中央水面與完整環形園地可讀為氣候公園；屬session判斷。
- **V2 PASS**：恢復S0 focal pose後，下方有清楚海面與岸線定位。
- **V3 FAIL**：疊葉較原尖角PV冠飽滿，植栽屏不再是稀疏格仔；主體長幹及鄰近單球樹仍在，未達嚴格無棒棒糖標準。
- **V4 PASS**：有支承氣候膜環、格柵冷卻片及工程枝架構成完整主動冷卻／混合方案；數量不代表新舊年代。
- **V5 PASS**：已檢視r3中性夜圖，八棵冠層、三片冷卻格柵與膜環輪廓可辨。
- **V6 STATIC PASS**：本張原圖未見主體z-fighting、浮空支承或明顯尖角樹冠；靜態檢查不能證明全時段無閃爍。

### ne:focal · 0 · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-focal__0__h22.jpg)](../S0/baseline/ne-focal__0__h22.jpg) | [![Final](r3/ne-focal__0__h22.jpg)](r3/ne-focal__0__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（2/9，距門檻5條）；A4 0/2相關pair通過；A5 PASS（vsync 60.2 FPS；instant calls 819/817 S0）；A6 PASS。

- **V1 PASS**：八棵枝狀樹、中央水面與完整環形園地可讀為氣候公園；屬session判斷。
- **V2 PASS**：恢復S0 focal pose後，下方有清楚海面與岸線定位。
- **V3 FAIL**：疊葉較原尖角PV冠飽滿，植栽屏不再是稀疏格仔；主體長幹及鄰近單球樹仍在，未達嚴格無棒棒糖標準。
- **V4 PASS**：有支承氣候膜環、格柵冷卻片及工程枝架構成完整主動冷卻／混合方案；數量不代表新舊年代。
- **V5 PASS**：已檢視r3中性夜圖，八棵冠層、三片冷卻格柵與膜環輪廓可辨。
- **V6 STATIC PASS**：本張原圖未見主體z-fighting、浮空支承或明顯尖角樹冠；靜態檢查不能證明全時段無閃爍。

### ne:focal · 2 · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-focal__2__h12.jpg)](../S0/baseline/ne-focal__2__h12.jpg) | [![Final](r3/ne-focal__2__h12.jpg)](r3/ne-focal__2__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（2/9，距門檻5條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 819/817 S0）；A6 PASS。

- **V1 PASS**：十二棵冠層形成較完整的環形林蔭園地，可與海浜公園故事對應；屬session判斷。
- **V2 PASS**：恢復S0 focal pose後，下方有清楚海面與岸線定位。
- **V3 FAIL**：疊葉較原尖角PV冠飽滿，植栽屏不再是稀疏格仔；主體長幹及鄰近單球樹仍在，未達嚴格無棒棒糖標準。
- **V4 PASS**：完整植物遮陰方案保留支承環、中央水面與工程枝架；零主動冷卻片不等於落後／空地。
- **V5 PASS**：已檢視高配置夜圖，密集冠層與環邊仍可辨，零主動冷卻片的差異可讀；葉面細部仍偏暗。
- **V6 STATIC PASS**：本張原圖未見主體z-fighting、浮空支承或明顯尖角樹冠；靜態檢查不能證明全時段無閃爍。

### ne:focal · 2 · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-focal__2__h22.jpg)](../S0/baseline/ne-focal__2__h22.jpg) | [![Final](r3/ne-focal__2__h22.jpg)](r3/ne-focal__2__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（2/9，距門檻5條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 819/817 S0）；A6 PASS。

- **V1 PASS**：十二棵冠層形成較完整的環形林蔭園地，可與海浜公園故事對應；屬session判斷。
- **V2 PASS**：恢復S0 focal pose後，下方有清楚海面與岸線定位。
- **V3 FAIL**：疊葉較原尖角PV冠飽滿，植栽屏不再是稀疏格仔；主體長幹及鄰近單球樹仍在，未達嚴格無棒棒糖標準。
- **V4 PASS**：完整植物遮陰方案保留支承環、中央水面與工程枝架；零主動冷卻片不等於落後／空地。
- **V5 PASS**：已檢視高配置夜圖，密集冠層與環邊仍可辨，零主動冷卻片的差異可讀；葉面細部仍偏暗。
- **V6 STATIC PASS**：本張原圖未見主體z-fighting、浮空支承或明顯尖角樹冠；靜態檢查不能證明全時段無閃爍。

### ne:district · -8 · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-district__-8__h12.jpg)](../S0/baseline/ne-district__-8__h12.jpg) | [![Final](r3/ne-district__-8__h12.jpg)](r3/ne-district__-8__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 744/908 S0）；A6 PASS。

- **V1 FAIL**：海濱位置清楚，但前景water rooms／航道比細小climate bays搶眼；僅看圖仍難在兩秒辨認完整遮陰網絡。
- **V2 PASS**：大幅海面與連續岸線保留明確海濱定位。
- **V3 FAIL**：本狀態主打完整白帆／主動冷卻；背景冠層仍有長幹單球樹，未達整張圖的綠化標準。
- **V4 PASS**：完整沿岸遮棚、屋頂低設計與冷卻設備構成成熟替代配置；低值不表達舊年代。
- **V5 PASS**：低配置夜圖的白色遮棚輪廓及明亮步道仍可讀，屋頂與岸邊保持完整配置。
- **V6 STATIC PASS**：本張未見主體遮棚穿模或漂浮支承；局部尺寸太小及靜態取樣仍有限制。

### ne:district · -8 · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-district__-8__h22.jpg)](../S0/baseline/ne-district__-8__h22.jpg) | [![Final](r3/ne-district__-8__h22.jpg)](r3/ne-district__-8__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 59.9 FPS；instant calls 744/908 S0）；A6 PASS。

- **V1 FAIL**：海濱位置清楚，但前景water rooms／航道比細小climate bays搶眼；僅看圖仍難在兩秒辨認完整遮陰網絡。
- **V2 PASS**：大幅海面與連續岸線保留明確海濱定位。
- **V3 FAIL**：本狀態主打完整白帆／主動冷卻；背景冠層仍有長幹單球樹，未達整張圖的綠化標準。
- **V4 PASS**：完整沿岸遮棚、屋頂低設計與冷卻設備構成成熟替代配置；低值不表達舊年代。
- **V5 PASS**：低配置夜圖的白色遮棚輪廓及明亮步道仍可讀，屋頂與岸邊保持完整配置。
- **V6 STATIC PASS**：本張未見主體遮棚穿模或漂浮支承；局部尺寸太小及靜態取樣仍有限制。

### ne:district · -5 · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-district__-5__h12.jpg)](../S0/baseline/ne-district__-5__h12.jpg) | [![Final](r3/ne-district__-5__h12.jpg)](r3/ne-district__-5__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 744/908 S0）；A6 PASS。

- **V1 FAIL**：海濱位置清楚，但前景water rooms／航道比細小climate bays搶眼；僅看圖仍難在兩秒辨認完整遮陰網絡。
- **V2 PASS**：大幅海面與連續岸線保留明確海濱定位。
- **V3 FAIL**：本地植栽屏已疊合、冠層較厚；背景單球樹及遠處稀疏屋頂綠地仍未達整張圖的標準。
- **V4 PASS**：主動遮陰為主、自然冷卻局部加入的完整替代配置。權威slot／hybrid數量保持，並非新舊年代切換。
- **V5 FAIL**：夜圖可見白色遮棚，但綠化screen／pergola較暗且投影小，分段變化不夠清楚；鄰樓及航道燈更搶眼。
- **V6 STATIC PASS**：本張未見主體遮棚穿模或漂浮支承；局部尺寸太小及靜態取樣仍有限制。

### ne:district · -5 · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-district__-5__h22.jpg)](../S0/baseline/ne-district__-5__h22.jpg) | [![Final](r3/ne-district__-5__h22.jpg)](r3/ne-district__-5__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 744/908 S0）；A6 PASS。

- **V1 FAIL**：海濱位置清楚，但前景water rooms／航道比細小climate bays搶眼；僅看圖仍難在兩秒辨認完整遮陰網絡。
- **V2 PASS**：大幅海面與連續岸線保留明確海濱定位。
- **V3 FAIL**：本地植栽屏已疊合、冠層較厚；背景單球樹及遠處稀疏屋頂綠地仍未達整張圖的標準。
- **V4 PASS**：主動遮陰為主、自然冷卻局部加入的完整替代配置。權威slot／hybrid數量保持，並非新舊年代切換。
- **V5 FAIL**：夜圖可見白色遮棚，但綠化screen／pergola較暗且投影小，分段變化不夠清楚；鄰樓及航道燈更搶眼。
- **V6 STATIC PASS**：本張未見主體遮棚穿模或漂浮支承；局部尺寸太小及靜態取樣仍有限制。

### ne:district · 0 · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-district__0__h12.jpg)](../S0/baseline/ne-district__0__h12.jpg) | [![Final](r3/ne-district__0__h12.jpg)](r3/ne-district__0__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 744/908 S0）；A6 PASS。

- **V1 FAIL**：海濱位置清楚，但前景water rooms／航道比細小climate bays搶眼；僅看圖仍難在兩秒辨認完整遮陰網絡。
- **V2 PASS**：大幅海面與連續岸線保留明確海濱定位。
- **V3 FAIL**：本地植栽屏已疊合、冠層較厚；背景單球樹及遠處稀疏屋頂綠地仍未達整張圖的標準。
- **V4 PASS**：混合冠層、白帆與立面植栽保留完整hybrid配置。權威slot／hybrid數量保持，並非新舊年代切換。
- **V5 FAIL**：夜圖可見白色遮棚，但綠化screen／pergola較暗且投影小，分段變化不夠清楚；鄰樓及航道燈更搶眼。
- **V6 STATIC PASS**：本張未見主體遮棚穿模或漂浮支承；局部尺寸太小及靜態取樣仍有限制。

### ne:district · 0 · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-district__0__h22.jpg)](../S0/baseline/ne-district__0__h22.jpg) | [![Final](r3/ne-district__0__h22.jpg)](r3/ne-district__0__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 744/908 S0）；A6 PASS。

- **V1 FAIL**：海濱位置清楚，但前景water rooms／航道比細小climate bays搶眼；僅看圖仍難在兩秒辨認完整遮陰網絡。
- **V2 PASS**：大幅海面與連續岸線保留明確海濱定位。
- **V3 FAIL**：本地植栽屏已疊合、冠層較厚；背景單球樹及遠處稀疏屋頂綠地仍未達整張圖的標準。
- **V4 PASS**：混合冠層、白帆與立面植栽保留完整hybrid配置。權威slot／hybrid數量保持，並非新舊年代切換。
- **V5 FAIL**：夜圖可見白色遮棚，但綠化screen／pergola較暗且投影小，分段變化不夠清楚；鄰樓及航道燈更搶眼。
- **V6 STATIC PASS**：本張未見主體遮棚穿模或漂浮支承；局部尺寸太小及靜態取樣仍有限制。

### ne:district · 5 · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-district__5__h12.jpg)](../S0/baseline/ne-district__5__h12.jpg) | [![Final](r3/ne-district__5__h12.jpg)](r3/ne-district__5__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 744/1275 S0）；A6 PASS。

- **V1 FAIL**：海濱位置清楚，但前景water rooms／航道比細小climate bays搶眼；僅看圖仍難在兩秒辨認完整遮陰網絡。
- **V2 PASS**：大幅海面與連續岸線保留明確海濱定位。
- **V3 FAIL**：本地植栽屏已疊合、冠層較厚；背景單球樹及遠處稀疏屋頂綠地仍未達整張圖的標準。
- **V4 PASS**：植物遮陰為主、部分主動遮棚保留的成熟配置。權威slot／hybrid數量保持，並非新舊年代切換。
- **V5 FAIL**：高綠化夜圖中screen／pergola較暗且投影小，輪廓仍在但分段差異不夠清楚；鄰樓與航道燈較搶眼。
- **V6 STATIC PASS**：本張未見主體遮棚穿模或漂浮支承；局部尺寸太小及靜態取樣仍有限制。

### ne:district · 5 · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-district__5__h22.jpg)](../S0/baseline/ne-district__5__h22.jpg) | [![Final](r3/ne-district__5__h22.jpg)](r3/ne-district__5__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 744/908 S0）；A6 PASS。

- **V1 FAIL**：海濱位置清楚，但前景water rooms／航道比細小climate bays搶眼；僅看圖仍難在兩秒辨認完整遮陰網絡。
- **V2 PASS**：大幅海面與連續岸線保留明確海濱定位。
- **V3 FAIL**：本地植栽屏已疊合、冠層較厚；背景單球樹及遠處稀疏屋頂綠地仍未達整張圖的標準。
- **V4 PASS**：植物遮陰為主、部分主動遮棚保留的成熟配置。權威slot／hybrid數量保持，並非新舊年代切換。
- **V5 FAIL**：高綠化夜圖中screen／pergola較暗且投影小，輪廓仍在但分段差異不夠清楚；鄰樓與航道燈較搶眼。
- **V6 STATIC PASS**：本張未見主體遮棚穿模或漂浮支承；局部尺寸太小及靜態取樣仍有限制。

### ne:district · 8 · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-district__8__h12.jpg)](../S0/baseline/ne-district__8__h12.jpg) | [![Final](r3/ne-district__8__h12.jpg)](r3/ne-district__8__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 744/908 S0）；A6 PASS。

- **V1 FAIL**：海濱位置清楚，但前景water rooms／航道比細小climate bays搶眼；僅看圖仍難在兩秒辨認完整遮陰網絡。
- **V2 PASS**：大幅海面與連續岸線保留明確海濱定位。
- **V3 FAIL**：本地植栽屏已疊合、冠層較厚；背景單球樹及遠處稀疏屋頂綠地仍未達整張圖的標準。
- **V4 PASS**：完整樹冠、植栽屏、屋頂及立面自然冷卻方案保留工程支承；零主動冷卻塔不等於落後／空地。
- **V5 FAIL**：高綠化夜圖中screen／pergola較暗且投影小，輪廓仍在但分段差異不夠清楚；鄰樓與航道燈較搶眼。
- **V6 STATIC PASS**：本張未見主體遮棚穿模或漂浮支承；局部尺寸太小及靜態取樣仍有限制。

### ne:district · 8 · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/ne-district__8__h22.jpg)](../S0/baseline/ne-district__8__h22.jpg) | [![Final](r3/ne-district__8__h22.jpg)](r3/ne-district__8__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 744/908 S0）；A6 PASS。

- **V1 FAIL**：海濱位置清楚，但前景water rooms／航道比細小climate bays搶眼；僅看圖仍難在兩秒辨認完整遮陰網絡。
- **V2 PASS**：大幅海面與連續岸線保留明確海濱定位。
- **V3 FAIL**：本地植栽屏已疊合、冠層較厚；背景單球樹及遠處稀疏屋頂綠地仍未達整張圖的標準。
- **V4 PASS**：完整樹冠、植栽屏、屋頂及立面自然冷卻方案保留工程支承；零主動冷卻塔不等於落後／空地。
- **V5 FAIL**：高綠化夜圖中screen／pergola較暗且投影小，輪廓仍在但分段差異不夠清楚；鄰樓與航道燈較搶眼。
- **V6 STATIC PASS**：本張未見主體遮棚穿模或漂浮支承；局部尺寸太小及靜態取樣仍有限制。

### energy:garden · baseline · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/energy-garden__baseline__h12.jpg)](../S0/baseline/energy-garden__baseline__h12.jpg) | [![Final](r3/energy-garden__baseline__h12.jpg)](r3/energy-garden__baseline__h12.jpg) |

A1 N/A；A2 N/A；A3 N/A；A4 1/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 478/462 S0）；A6 PASS。

- **V1 N/A**：本狀態沒有第一水庭；不將沒有主體當成framing或設施質素通過。
- **V2 PASS**：明確海面、岸線及岸邊步道提供水庭位置基準。
- **V3 N/A**：本狀態沒有第一水庭；不將沒有主體當成framing或設施質素通過。
- **V4 N/A**：本狀態沒有第一水庭；不將沒有主體當成framing或設施質素通過。
- **V5 N/A**：本狀態沒有第一水庭；不將沒有主體當成framing或設施質素通過。
- **V6 N/A**：本狀態沒有第一水庭；不將沒有主體當成framing或設施質素通過。

### energy:garden · baseline · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/energy-garden__baseline__h22.jpg)](../S0/baseline/energy-garden__baseline__h22.jpg) | [![Final](r3/energy-garden__baseline__h22.jpg)](r3/energy-garden__baseline__h22.jpg) |

A1 N/A；A2 N/A；A3 N/A；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 478/462 S0）；A6 PASS。

- **V1 N/A**：本狀態沒有第一水庭；不將沒有主體當成framing或設施質素通過。
- **V2 PASS**：明確海面、岸線及岸邊步道提供水庭位置基準。
- **V3 N/A**：本狀態沒有第一水庭；不將沒有主體當成framing或設施質素通過。
- **V4 N/A**：本狀態沒有第一水庭；不將沒有主體當成framing或設施質素通過。
- **V5 N/A**：本狀態沒有第一水庭；不將沒有主體當成framing或設施質素通過。
- **V6 N/A**：本狀態沒有第一水庭；不將沒有主體當成framing或設施質素通過。

### energy:garden · a · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/energy-garden__a__h12.jpg)](../S0/baseline/energy-garden__a__h12.jpg) | [![Final](r3/energy-garden__a__h12.jpg)](r3/energy-garden__a__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 1/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 512/496 S0）；A6 PASS。

- **V1 PASS**：上下兩池、直立回管及岸邊接駁可讀為水庭儲能設施；r3可見渦輪檢修面，屬session判斷。
- **V2 PASS**：明確海面、岸線及岸邊步道提供水庭位置基準。
- **V3 FAIL**：本體為儲能機械；背景仍有單球樹及圓柱植栽，整張圖的綠化標準未達。
- **V4 PASS**：有支承上下蓄水、PV檢修遮棚及獨立公共接駁，構成完整水邊能源配置。
- **V5 PASS**：夜圖的池緣、支承及管線輪廓可辨；機房細部仍偏暗，沒有宣稱每個細節清楚。
- **V6 STATIC PASS**：r3檢修面可見、前景桿未穿過主要池體／渦輪；左側桿仍近主體，靜態未見明顯穿模或z-fighting。

### energy:garden · a · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/energy-garden__a__h22.jpg)](../S0/baseline/energy-garden__a__h22.jpg) | [![Final](r3/energy-garden__a__h22.jpg)](r3/energy-garden__a__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 60.1 FPS；instant calls 512/496 S0）；A6 PASS。

- **V1 PASS**：上下兩池、直立回管及岸邊接駁可讀為水庭儲能設施；r3可見渦輪檢修面，屬session判斷。
- **V2 PASS**：明確海面、岸線及岸邊步道提供水庭位置基準。
- **V3 FAIL**：本體為儲能機械；背景仍有單球樹及圓柱植栽，整張圖的綠化標準未達。
- **V4 PASS**：有支承上下蓄水、PV檢修遮棚及獨立公共接駁，構成完整水邊能源配置。
- **V5 PASS**：夜圖的池緣、支承及管線輪廓可辨；機房細部仍偏暗，沒有宣稱每個細節清楚。
- **V6 STATIC PASS**：r3檢修面可見、前景桿未穿過主要池體／渦輪；左側桿仍近主體，靜態未見明顯穿模或z-fighting。

### energy:garden · mixed · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/energy-garden__mixed__h12.jpg)](../S0/baseline/energy-garden__mixed__h12.jpg) | [![Final](r3/energy-garden__mixed__h12.jpg)](r3/energy-garden__mixed__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 60 FPS；instant calls 512/496 S0）；A6 PASS。

- **V1 PASS**：上下兩池、直立回管及岸邊接駁可讀為水庭儲能設施；r3可見渦輪檢修面，屬session判斷。
- **V2 PASS**：明確海面、岸線及岸邊步道提供水庭位置基準。
- **V3 FAIL**：本體為儲能機械；背景仍有單球樹及圓柱植栽，整張圖的綠化標準未達。
- **V4 PASS**：有支承上下蓄水、PV檢修遮棚及獨立公共接駁，構成完整水邊能源配置。
- **V5 PASS**：夜圖的池緣、支承及管線輪廓可辨；機房細部仍偏暗，沒有宣稱每個細節清楚。
- **V6 STATIC PASS**：r3檢修面可見、前景桿未穿過主要池體／渦輪；左側桿仍近主體，靜態未見明顯穿模或z-fighting。

### energy:garden · mixed · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/energy-garden__mixed__h22.jpg)](../S0/baseline/energy-garden__mixed__h22.jpg) | [![Final](r3/energy-garden__mixed__h22.jpg)](r3/energy-garden__mixed__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9，距門檻7條）；A4 0/2相關pair通過；A5 PASS（vsync 59.9 FPS；instant calls 512/496 S0）；A6 PASS。

- **V1 PASS**：上下兩池、直立回管及岸邊接駁可讀為水庭儲能設施；r3可見渦輪檢修面，屬session判斷。
- **V2 PASS**：明確海面、岸線及岸邊步道提供水庭位置基準。
- **V3 FAIL**：本體為儲能機械；背景仍有單球樹及圓柱植栽，整張圖的綠化標準未達。
- **V4 PASS**：有支承上下蓄水、PV檢修遮棚及獨立公共接駁，構成完整水邊能源配置。
- **V5 PASS**：夜圖的池緣、支承及管線輪廓可辨；機房細部仍偏暗，沒有宣稱每個細節清楚。
- **V6 STATIC PASS**：r3檢修面可見、前景桿未穿過主要池體／渦輪；左側桿仍近主體，靜態未見明顯穿模或z-fighting。

### hero · neutral · hour 12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/hero__neutral__h12.jpg)](../S0/baseline/hero__neutral__h12.jpg) | [![Final](r3/hero__neutral__h12.jpg)](r3/hero__neutral__h12.jpg) |

A1 N/A；A2 N/A；A3 N/A；A4 N/A；A5 PASS（vsync 60 FPS；instant calls 950/948 S0）；A6 PASS。

- **V1 PASS**：完整城市、海濱與未來交通可讀；屬session總覽判斷，沒有訪客兩秒測試。
- **V2 PASS**：廣闊東京灣、岸線與遠方橋樑保持清楚地理定位。
- **V3 FAIL**：總覽仍可見既有單球樹與圓柱植栽，A局部冠層改良未覆蓋全城。
- **V4 PASS**：中性城市已有完整建築、海濱公共空間與交通；並非等待升級的空白狀態。
- **V5 PASS**：已檢視配對夜圖，建築、航道、海濱及主要空間輪廓可辨；海上遠景與細部綠化偏暗。
- **V6 STATIC PASS**：本張總覽未見明顯穿模或浮空主體，遠處細節解析度及靜態取樣不足以排除所有閃爍。

### hero · neutral · hour 22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/hero__neutral__h22.jpg)](../S0/baseline/hero__neutral__h22.jpg) | [![Final](r3/hero__neutral__h22.jpg)](r3/hero__neutral__h22.jpg) |

A1 N/A；A2 N/A；A3 N/A；A4 N/A；A5 PASS（vsync 60 FPS；instant calls 950/948 S0）；A6 PASS。

- **V1 PASS**：完整城市、海濱與未來交通可讀；屬session總覽判斷，沒有訪客兩秒測試。
- **V2 PASS**：廣闊東京灣、岸線與遠方橋樑保持清楚地理定位。
- **V3 FAIL**：總覽仍可見既有單球樹與圓柱植栽，A局部冠層改良未覆蓋全城。
- **V4 PASS**：中性城市已有完整建築、海濱公共空間與交通；並非等待升級的空白狀態。
- **V5 PASS**：已檢視配對夜圖，建築、航道、海濱及主要空間輪廓可辨；海上遠景與細部綠化偏暗。
- **V6 STATIC PASS**：本張總覽未見明顯穿模或浮空主體，遠處細節解析度及靜態取樣不足以排除所有閃爍。

## A4 pixel differences — unchanged thresholds

| Shot | hour | Pair | MAD | Required | Gap | Result |
| --- | --- | --- | --- | --- | --- | --- |
| ne:focal | 12 | -2 → 0 (adjacent) | 3.625% | 6% | 2.375 pp | FAIL |
| ne:focal | 12 | 0 → 2 (adjacent) | 2.796% | 6% | 3.204 pp | FAIL |
| ne:focal | 12 | -2 → 2 (extremes) | 4.846% | 12% | 7.154 pp | FAIL |
| ne:focal | 22 | -2 → 0 (adjacent) | 3.354% | 6% | 2.646 pp | FAIL |
| ne:focal | 22 | 0 → 2 (adjacent) | 2.101% | 6% | 3.899 pp | FAIL |
| ne:focal | 22 | -2 → 2 (extremes) | 4.143% | 12% | 7.857 pp | FAIL |
| ne:district | 12 | -8 → -5 (adjacent) | 0.906% | 6% | 5.094 pp | FAIL |
| ne:district | 12 | -5 → 0 (adjacent) | 1.239% | 6% | 4.761 pp | FAIL |
| ne:district | 12 | 0 → 5 (adjacent) | 1.248% | 6% | 4.752 pp | FAIL |
| ne:district | 12 | 5 → 8 (adjacent) | 0.904% | 6% | 5.096 pp | FAIL |
| ne:district | 12 | -8 → 8 (extremes) | 2.584% | 12% | 9.416 pp | FAIL |
| ne:district | 22 | -8 → -5 (adjacent) | 0.916% | 6% | 5.084 pp | FAIL |
| ne:district | 22 | -5 → 0 (adjacent) | 1.363% | 6% | 4.637 pp | FAIL |
| ne:district | 22 | 0 → 5 (adjacent) | 1.385% | 6% | 4.615 pp | FAIL |
| ne:district | 22 | 5 → 8 (adjacent) | 0.855% | 6% | 5.145 pp | FAIL |
| ne:district | 22 | -8 → 8 (extremes) | 2.763% | 12% | 9.237 pp | FAIL |
| energy:garden | 12 | baseline → a (adjacent) | 6.643% | 6% | 0.000 pp | PASS |
| energy:garden | 12 | a → mixed (adjacent) | 0.470% | 6% | 5.530 pp | FAIL |
| energy:garden | 12 | baseline → mixed (extremes) | 6.646% | 12% | 5.354 pp | FAIL |
| energy:garden | 22 | baseline → a (adjacent) | 4.143% | 6% | 1.857 pp | FAIL |
| energy:garden | 22 | a → mixed (adjacent) | 0.364% | 6% | 5.636 pp | FAIL |
| energy:garden | 22 | baseline → mixed (extremes) | 4.147% | 12% | 7.853 pp | FAIL |

## Performance — same two uncapping flags, two5s windows after≥16s

| Shot | hour | S0 FPS | r1 FPS | r2 FPS | final FPS | FPS/S0 | mean calls/S0 | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ne:focal | 12 | 99.53 | 101.56 | 100.83 | 103.28 | 103.8% | 819/817 | PASS |
| ne:focal | 22 | 102.33 | 102.41 | 100.71 | 102.64 | 100.3% | 819/817 | PASS |
| ne:district | 12 | 86.33 | 87.13 | 105.48 | 104.47 | 121.0% | 744/908 | PASS |
| ne:district | 22 | 83.99 | 86.60 | 104.94 | 104.20 | 124.1% | 744/908 | PASS |
| energy:garden | 12 | 101.77 | 103.66 | 113.26 | 101.13 | 99.4% | 512/496 | PASS |
| energy:garden | 22 | 102.28 | 102.22 | 112.28 | 100.67 | 98.4% | 512/496 | PASS |
| hero | 12 | 86.33 | 92.61 | 91.67 | 91.76 | 106.3% | 950/948 | PASS |
| hero | 22 | 89.42 | 92.00 | 91.33 | 90.95 | 101.7% | 950/948 | PASS |

FPS相對門檻按原S0；每狀態A5另核對其instant draw calls及vsync。單次calls可能落在shadow redraw frame，仍不靜默豁免FAIL。r1 hero source不變但FPS不同，故不把升幅當性能優化成果。

## 行為與限制

A7以[checks](checks.json)及[scratch live](live/browser.json)為準；browser診斷每120frame更新，只證實中間easing，精確三秒retarget由root tests核對。第一次r2 batch上限失敗及合批修正已保留於[r2 checks](r2/checks.json)。本批沒有asset／survey／module-swap／部署改動，second garden保持原幾何。

- Three rounds exhausted; all failures remain owner decisions.
- Session recognition judgments are not visitor tests or owner acceptance.
- A3 uses the complete original subject world-AABB; off-screen/gap samples remain failures.
- District A2 PASS does not imply the full carrier is visible; its projected bounds exceed the viewport.
- Energy a/mixed use the same first garden; their A4 difference remains subject to the original6% gate.
- V6 STATIC PASS does not certify flicker across all states.
- Only development Mac/Chrome1920x1080/DPR1/default measured; no exhibition hardware, Safari/iPad, Windows or full Z regression.
