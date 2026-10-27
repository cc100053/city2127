# Sector B — S0 / final r3 review

三輪已用完；**未經owner接受／未merge main**。7/9 raycast、A4 6%/12%、A5 95%FPS/+10%calls及58fps門檻不變。[逐項JSON](report.json)、[原圖量度](r3/capture.json)、[視覺理由](visual-review.json)、[驗證](checks.json)、[live](live/browser.json)。

**r3 focal構圖比r2退步**：新前景支柱遮住廣場，雖然數值A1/A2通過，仍不符合設施辨識；[r2原圖](r2/sw-focal__0__h12.jpg)顯示較少遮擋。三輪後停止，不用未量測的r2 pose＋r3 builder組合冒充final，也不自行開第四輪。新幾何保留為待審候選，建議owner暫不接受B美術。

18張final第二take原圖逐張檢視；S0欄引用既有基準。每輪18狀態、16比較、6組×2效能窗；三輪全部保存，A與S0原圖hash核對。

```json
{
  "finalStates": 18,
  "allMeasuredStates": 54,
  "rawStaticImages": 108,
  "roundsUsed": 3,
  "A1": {
    "PASS": 16,
    "N/A": 2
  },
  "A2": {
    "PASS": 16,
    "N/A": 2
  },
  "A3": {
    "FAIL": 16,
    "N/A": 2
  },
  "A4": {
    "pass": 0,
    "pairs": 16
  },
  "A5": {
    "FAIL": 6,
    "PASS": 12
  },
  "A6": {
    "PASS": 18
  },
  "reproducibility": {
    "PASS": 10,
    "FAIL": 8
  },
  "V": {
    "V1": {
      "FAIL": 6,
      "PASS": 12
    },
    "V2": {
      "FAIL": 6,
      "PASS": 12
    },
    "V3": {
      "FAIL": 18
    },
    "V4": {
      "PASS": 18
    },
    "V5": {
      "FAIL": 6,
      "PASS": 12
    },
    "V6": {
      "STATIC PASS": 18
    }
  }
}
```

## sw:focal · -2 · h12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-focal__-2__h12.jpg)](../S0/baseline/sw-focal__-2__h12.jpg) | [![Final](r3/sw-focal__-2__h12.jpg)](r3/sw-focal__-2__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 FAIL（vsync 60；calls 820/606 S0）；A6 PASS。

- **V1 FAIL**：前景淺色支柱穿過廣場中心，右側深色停泊桿及左樓搶焦；兩秒內不能清楚辨認私人休息設施。
- **V2 FAIL**：富士球體和彩虹橋未清楚入鏡；可見藍面不足以辨認為東京灣。
- **V3 FAIL**：廣場綠邊較細，但背景仍有圓球式冠層；遮擋令院落層次難判讀。
- **V4 PASS**：八個私人屏風、完整曲面環頂與平台仍屬成熟未來方案，沒有以low表示空地。
- **V5 FAIL**：已檢視配對hour22：環頂可見，但深色屏風與被遮住的座位差異不易辨認；無法達到夜間功能可讀。
- **V6 STATIC PASS**：可見環頂曲線及屏風沒有明顯閃線或浮空；被支柱擋住的部分無法判讀，未證實動態無閃爍。

## sw:focal · -2 · h22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-focal__-2__h22.jpg)](../S0/baseline/sw-focal__-2__h22.jpg) | [![Final](r3/sw-focal__-2__h22.jpg)](r3/sw-focal__-2__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 FAIL（vsync 59.7；calls 820/606 S0）；A6 PASS。

- **V1 FAIL**：夜景窗口及前景桿件比小型私人休息設施搶眼，中心支柱持續遮住廣場。
- **V2 FAIL**：富士球體和彩虹橋未清楚入鏡；可見藍面不足以辨認為東京灣。
- **V3 FAIL**：廣場綠邊較細，但背景仍有圓球式冠層；遮擋令院落層次難判讀。
- **V4 PASS**：八個私人屏風、完整曲面環頂與平台仍屬成熟未來方案，沒有以low表示空地。
- **V5 FAIL**：環頂可見，但深色屏風與被遮住的座位差異不易辨認；無法達到夜間功能可讀。
- **V6 STATIC PASS**：可見環頂曲線及屏風沒有明顯閃線或浮空；被支柱擋住的部分無法判讀，未證實動態無閃爍。

## sw:focal · 0 · h12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-focal__0__h12.jpg)](../S0/baseline/sw-focal__0__h12.jpg) | [![Final](r3/sw-focal__0__h12.jpg)](r3/sw-focal__0__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 FAIL（vsync 60；calls 820/606 S0）；A6 PASS。

- **V1 FAIL**：中性配置只見部分屏風及長椅邊緣，中央前景支柱遮住共享／私人混合設施；牌面可讀但不足以兩秒辨識。
- **V2 FAIL**：富士球體和彩虹橋未清楚入鏡；可見藍面不足以辨認為東京灣。
- **V3 FAIL**：廣場綠邊較細，但背景仍有圓球式冠層；遮擋令院落層次難判讀。
- **V4 PASS**：共享及私人席位的混合方案、環頂與平台均保留完整構造；不是過渡中的空地。
- **V5 FAIL**：已檢視配對hour22：亮窗及停泊燈搶焦，混合席位變化難辨；環頂可見不代表功能可讀。
- **V6 STATIC PASS**：可見環頂曲線及屏風沒有明顯閃線或浮空；被支柱擋住的部分無法判讀，未證實動態無閃爍。

## sw:focal · 0 · h22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-focal__0__h22.jpg)](../S0/baseline/sw-focal__0__h22.jpg) | [![Final](r3/sw-focal__0__h22.jpg)](r3/sw-focal__0__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 FAIL（vsync 60.1；calls 820/606 S0）；A6 PASS。

- **V1 FAIL**：夜景混合席位只露出部分屏風及背板，前景中央支柱與明亮鄰樓令設施不易辨識。
- **V2 FAIL**：富士球體和彩虹橋未清楚入鏡；可見藍面不足以辨認為東京灣。
- **V3 FAIL**：廣場綠邊較細，但背景仍有圓球式冠層；遮擋令院落層次難判讀。
- **V4 PASS**：私人及共享混合配置保持完整平台、曲面環頂與植栽邊界，沒有未建成空地。
- **V5 FAIL**：亮窗及停泊燈搶焦，混合席位變化難辨；環頂可見不代表功能可讀。
- **V6 STATIC PASS**：可見環頂曲線及屏風沒有明顯閃線或浮空；被支柱擋住的部分無法判讀，未證實動態無閃爍。

## sw:focal · 2 · h12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-focal__2__h12.jpg)](../S0/baseline/sw-focal__2__h12.jpg) | [![Final](r3/sw-focal__2__h12.jpg)](r3/sw-focal__2__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 FAIL（vsync 60.1；calls 820/606 S0）；A6 PASS。

- **V1 FAIL**：可見部分共享長椅，但中央支柱遮擋仍令公共休息設施退到背景；兩秒辨識未過。
- **V2 FAIL**：富士球體和彩虹橋未清楚入鏡；可見藍面不足以辨認為東京灣。
- **V3 FAIL**：廣場綠邊較細，但背景仍有圓球式冠層；遮擋令院落層次難判讀。
- **V4 PASS**：完整共享長椅、公共平台及採光環頂保留成熟2127方案，並非刪走私人設施後留空。
- **V5 FAIL**：已檢視配對hour22：雖可見環頂與部分淺色椅背，但遮擋及深色背景令全共享配置差異仍難讀。
- **V6 STATIC PASS**：可見環頂曲線及屏風沒有明顯閃線或浮空；被支柱擋住的部分無法判讀，未證實動態無閃爍。

## sw:focal · 2 · h22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-focal__2__h22.jpg)](../S0/baseline/sw-focal__2__h22.jpg) | [![Final](r3/sw-focal__2__h22.jpg)](r3/sw-focal__2__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 FAIL（vsync 59.7；calls 820/606 S0）；A6 PASS。

- **V1 FAIL**：夜間共享長椅輪廓在支柱後只露出一部分，牌面及鄰樓光線較搶眼，難以兩秒辨識。
- **V2 FAIL**：富士球體和彩虹橋未清楚入鏡；可見藍面不足以辨認為東京灣。
- **V3 FAIL**：廣場綠邊較細，但背景仍有圓球式冠層；遮擋令院落層次難判讀。
- **V4 PASS**：完整共享長椅、公共平台及採光環頂保留成熟2127方案，並非刪走私人設施後留空。
- **V5 FAIL**：雖可見環頂與部分淺色椅背，但遮擋及深色背景令全共享配置差異仍難讀。
- **V6 STATIC PASS**：可見環頂曲線及屏風沒有明顯閃線或浮空；被支柱擋住的部分無法判讀，未證實動態無閃爍。

## sw:district · -8 · h12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-district__-8__h12.jpg)](../S0/baseline/sw-district__-8__h12.jpg) | [![Final](r3/sw-district__-8__h12.jpg)](r3/sw-district__-8__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 PASS（vsync 59.9；calls 746/920 S0）；A6 PASS。

- **V1 PASS**：海邊連橋、水上圓頂及環形花園清楚，能快速辨認為水邊休憩設施，對應水辺の居場所。
- **V2 PASS**：東京灣海面及船隻佔畫面下半，位置清楚。
- **V3 FAIL**：水上島嶼仍有平圓冠層及棒狀樹幹；新增院落／halo細節未消除全景的玩具式樹形。
- **V4 PASS**：私人水庭、完整透光圓頂、接橋及岸上花園是完整成熟方案。
- **V5 PASS**：已檢視配對hour22：圓頂格殼、粉色環邊與無罩水庭仍可區分；局部綠植偏暗但主要輪廓可讀。
- **V6 STATIC PASS**：圓頂格殼、環邊與接橋的可見部分沒有明顯穿模或浮空；沒有宣稱靜態圖可證明動態無閃爍。

## sw:district · -8 · h22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-district__-8__h22.jpg)](../S0/baseline/sw-district__-8__h22.jpg) | [![Final](r3/sw-district__-8__h22.jpg)](r3/sw-district__-8__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 PASS（vsync 60.1；calls 746/920 S0）；A6 PASS。

- **V1 PASS**：夜景透光圓頂、環形岸線及接橋仍容易辨認為水邊休憩設施。
- **V2 PASS**：東京灣海面及船隻佔畫面下半，位置清楚。
- **V3 FAIL**：水上島嶼仍有平圓冠層及棒狀樹幹；新增院落／halo細節未消除全景的玩具式樹形。
- **V4 PASS**：私人水庭、完整透光圓頂、接橋及岸上花園是完整成熟方案。
- **V5 PASS**：圓頂格殼、粉色環邊與無罩水庭仍可區分；局部綠植偏暗但主要輪廓可讀。
- **V6 STATIC PASS**：圓頂格殼、環邊與接橋的可見部分沒有明顯穿模或浮空；沒有宣稱靜態圖可證明動態無閃爍。

## sw:district · -5 · h12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-district__-5__h12.jpg)](../S0/baseline/sw-district__-5__h12.jpg) | [![Final](r3/sw-district__-5__h12.jpg)](r3/sw-district__-5__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 PASS（vsync 60；calls 760/934 S0）；A6 PASS。

- **V1 PASS**：圓頂水庭與部分植栽halo並置、接橋清楚，可辨認水邊花園／休憩設施。
- **V2 PASS**：東京灣海面及船隻佔畫面下半，位置清楚。
- **V3 FAIL**：halo冠層雖有起伏，仍像均勻小球；島內平圓樹冠及棒幹未改善到要求。
- **V4 PASS**：私人水庭、部分開放halo及岸上庭院都有完整構造；中間rung仍是成熟配置。
- **V5 PASS**：已檢視配對hour22：發光環邊、圓頂與無罩水庭有可辨輪廓差異；植栽內部仍較暗。
- **V6 STATIC PASS**：圓頂格殼、環邊與接橋的可見部分沒有明顯穿模或浮空；沒有宣稱靜態圖可證明動態無閃爍。

## sw:district · -5 · h22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-district__-5__h22.jpg)](../S0/baseline/sw-district__-5__h22.jpg) | [![Final](r3/sw-district__-5__h22.jpg)](r3/sw-district__-5__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 PASS（vsync 59.9；calls 760/934 S0）；A6 PASS。

- **V1 PASS**：夜景中暖邊halo與透光水庭並置，接橋連到岸上休憩空間，設施身份可辨。
- **V2 PASS**：東京灣海面及船隻佔畫面下半，位置清楚。
- **V3 FAIL**：水上島嶼仍有平圓冠層及棒狀樹幹；新增院落／halo細節未消除全景的玩具式樹形。
- **V4 PASS**：私人水庭及部分開放halo保持成熟、完整且有接橋的配置。
- **V5 PASS**：發光環邊、圓頂與無罩水庭有可辨輪廓差異；植栽內部仍較暗。
- **V6 STATIC PASS**：圓頂格殼、環邊與接橋的可見部分沒有明顯穿模或浮空；沒有宣稱靜態圖可證明動態無閃爍。

## sw:district · 0 · h12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-district__0__h12.jpg)](../S0/baseline/sw-district__0__h12.jpg) | [![Final](r3/sw-district__0__h12.jpg)](r3/sw-district__0__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 PASS（vsync 60.1；calls 760/934 S0）；A6 PASS。

- **V1 PASS**：完整圓頂、半開格殼與階梯式水庭同時可見，能辨認水邊休憩群。
- **V2 PASS**：東京灣海面及船隻佔畫面下半，位置清楚。
- **V3 FAIL**：階梯／halo內仍是平圓樹冠與簡化棒幹，岸上冠層也有均勻球形。
- **V4 PASS**：中性以半開水庭與共享階梯組合成成熟混合方案，並非未完成工地。
- **V5 PASS**：已檢視配對hour22：完整／半開圓頂及無罩階梯的主要輪廓可分辨；暖邊halo提供位置提示，綠植細部偏暗。
- **V6 STATIC PASS**：圓頂格殼、環邊與接橋的可見部分沒有明顯穿模或浮空；沒有宣稱靜態圖可證明動態無閃爍。

## sw:district · 0 · h22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-district__0__h22.jpg)](../S0/baseline/sw-district__0__h22.jpg) | [![Final](r3/sw-district__0__h22.jpg)](r3/sw-district__0__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 PASS（vsync 60；calls 760/934 S0）；A6 PASS。

- **V1 PASS**：夜景完整圓頂、半開格殼、階梯水庭與接橋都有可讀輪廓，仍是水邊休憩群。
- **V2 PASS**：東京灣海面及船隻佔畫面下半，位置清楚。
- **V3 FAIL**：水上島嶼仍有平圓冠層及棒狀樹幹；新增院落／halo細節未消除全景的玩具式樹形。
- **V4 PASS**：中性混合配置各水庭都保持完整構造，沒有空置／未建成的過渡感。
- **V5 PASS**：完整／半開圓頂及無罩階梯的主要輪廓可分辨；暖邊halo提供位置提示，綠植細部偏暗。
- **V6 STATIC PASS**：圓頂格殼、環邊與接橋的可見部分沒有明顯穿模或浮空；沒有宣稱靜態圖可證明動態無閃爍。

## sw:district · 5 · h12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-district__5__h12.jpg)](../S0/baseline/sw-district__5__h12.jpg) | [![Final](r3/sw-district__5__h12.jpg)](r3/sw-district__5__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 PASS（vsync 60；calls 760/934 S0）；A6 PASS。

- **V1 PASS**：共享階梯水庭及植栽halo成為主要水上設施，接橋與岸上共用庭院清楚。
- **V2 PASS**：東京灣海面及船隻佔畫面下半，位置清楚。
- **V3 FAIL**：水庭內仍是平圓冠層，halo屋面則像一圈均勻綠珠，未達自然層次要求。
- **V4 PASS**：共享水庭與仍保留的庭院設備構成完整成熟配置，沒有以更開放代表未開發。
- **V5 PASS**：已檢視配對hour22：階梯環、halo輪廓及岸上庭院仍可分辨，主要開放形式可讀；植栽內部細節偏暗。
- **V6 STATIC PASS**：圓頂格殼、環邊與接橋的可見部分沒有明顯穿模或浮空；沒有宣稱靜態圖可證明動態無閃爍。

## sw:district · 5 · h22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-district__5__h22.jpg)](../S0/baseline/sw-district__5__h22.jpg) | [![Final](r3/sw-district__5__h22.jpg)](r3/sw-district__5__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 PASS（vsync 60；calls 760/934 S0）；A6 PASS。

- **V1 PASS**：夜景共享階梯水庭、暖邊halo及接橋仍清楚，水邊設施身份容易辨認。
- **V2 PASS**：東京灣海面及船隻佔畫面下半，位置清楚。
- **V3 FAIL**：水上島嶼仍有平圓冠層及棒狀樹幹；新增院落／halo細節未消除全景的玩具式樹形。
- **V4 PASS**：完整開放水庭及庭院保留成熟公共空間，不以高值代表從空地增建。
- **V5 PASS**：階梯環、halo輪廓及岸上庭院仍可分辨，主要開放形式可讀；植栽內部細節偏暗。
- **V6 STATIC PASS**：圓頂格殼、環邊與接橋的可見部分沒有明顯穿模或浮空；沒有宣稱靜態圖可證明動態無閃爍。

## sw:district · 8 · h12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-district__8__h12.jpg)](../S0/baseline/sw-district__8__h12.jpg) | [![Final](r3/sw-district__8__h12.jpg)](r3/sw-district__8__h12.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 PASS（vsync 60；calls 760/934 S0）；A6 PASS。

- **V1 PASS**：多個開放階梯水庭及植栽halo連到海岸，能快速辨認公共水邊休憩群。
- **V2 PASS**：東京灣海面及船隻佔畫面下半，位置清楚。
- **V3 FAIL**：島內平圓樹冠／棒幹及halo均勻綠珠仍像簡化原件，未達自然層次要求。
- **V4 PASS**：全共享配置仍有完整接橋、座階、遮蔭halo及岸上庭院，具完整未來系統。
- **V5 PASS**：已檢視配對hour22：全共享的座階環邊、halo與橋接輪廓仍可讀；綠植內部偏暗，另列V3。
- **V6 STATIC PASS**：圓頂格殼、環邊與接橋的可見部分沒有明顯穿模或浮空；沒有宣稱靜態圖可證明動態無閃爍。

## sw:district · 8 · h22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/sw-district__8__h22.jpg)](../S0/baseline/sw-district__8__h22.jpg) | [![Final](r3/sw-district__8__h22.jpg)](r3/sw-district__8__h22.jpg) |

A1 PASS；A2 PASS；A3 FAIL（0/9；差7條）；A4 0/2；A5 PASS（vsync 60.1；calls 760/934 S0）；A6 PASS。

- **V1 PASS**：夜景多個階梯水庭與暖邊halo清楚，接橋及岸上庭院仍可辨認為共享海濱設施。
- **V2 PASS**：東京灣海面及船隻佔畫面下半，位置清楚。
- **V3 FAIL**：島內平圓樹冠／棒幹及halo均勻綠珠仍像簡化原件，未達自然層次要求。
- **V4 PASS**：全共享配置仍有完整接橋、座階、遮蔭halo及岸上庭院，具完整未來系統。
- **V5 PASS**：全共享的座階環邊、halo與橋接輪廓仍可讀；綠植內部偏暗，另列V3。
- **V6 STATIC PASS**：圓頂格殼、環邊與接橋的可見部分沒有明顯穿模或浮空；沒有宣稱靜態圖可證明動態無閃爍。

## hero · neutral · h12

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/hero__neutral__h12.jpg)](../S0/baseline/hero__neutral__h12.jpg) | [![Final](r3/hero__neutral__h12.jpg)](r3/hero__neutral__h12.jpg) |

A1 N/A；A2 N/A；A3 N/A（—/9；差—條）；A4 0/0；A5 PASS（vsync 60；calls 950/948 S0）；A6 PASS。

- **V1 PASS**：總覽的完整城市、海濱及未來交通可辨認；這是session總覽判斷，沒有真人兩秒測試。
- **V2 PASS**：廣闊東京灣及岸線清楚，日圖亦可見遠方彩虹橋。
- **V3 FAIL**：總覽仍有單球、平圓及柱狀冠層；B局部細化未解決全城綠化層次。
- **V4 PASS**：中性城市已有完整建築、海濱設施與交通系統，並非等待升級的空白。
- **V5 PASS**：已檢視日夜配對，建築、航道及水上設施輪廓可讀；遠景及綠植細部偏暗。
- **V6 STATIC PASS**：總覽未見明顯浮空或穿模主體，但遠處解析度及靜態取樣不足以排除所有閃爍。

## hero · neutral · h22

| S0 original | Final r3 original |
| --- | --- |
| [![S0](../S0/baseline/hero__neutral__h22.jpg)](../S0/baseline/hero__neutral__h22.jpg) | [![Final](r3/hero__neutral__h22.jpg)](r3/hero__neutral__h22.jpg) |

A1 N/A；A2 N/A；A3 N/A（—/9；差—條）；A4 0/0；A5 PASS（vsync 60；calls 950/948 S0）；A6 PASS。

- **V1 PASS**：總覽的完整城市、海濱及未來交通可辨認；這是session總覽判斷，沒有真人兩秒測試。
- **V2 PASS**：廣闊東京灣及岸線清楚，日圖亦可見遠方彩虹橋。
- **V3 FAIL**：總覽仍有單球、平圓及柱狀冠層；B局部細化未解決全城綠化層次。
- **V4 PASS**：中性城市已有完整建築、海濱設施與交通系統，並非等待升級的空白。
- **V5 PASS**：已檢視日夜配對，建築、航道及水上設施輪廓可讀；遠景及綠植細部偏暗。
- **V6 STATIC PASS**：總覽未見明顯浮空或穿模主體，但遠處解析度及靜態取樣不足以排除所有閃爍。

## A4 原門檻與精確差距

| Shot | hour | Pair | MAD | Required | Gap | Result |
| --- | --- | --- | --- | --- | --- | --- |
| sw:focal | 12 | -2 → 0 (adjacent) | 1.370% | 6% | 4.630 pp | FAIL |
| sw:focal | 12 | 0 → 2 (adjacent) | 2.356% | 6% | 3.644 pp | FAIL |
| sw:focal | 12 | -2 → 2 (extremes) | 3.251% | 12% | 8.749 pp | FAIL |
| sw:focal | 22 | -2 → 0 (adjacent) | 1.042% | 6% | 4.958 pp | FAIL |
| sw:focal | 22 | 0 → 2 (adjacent) | 1.668% | 6% | 4.332 pp | FAIL |
| sw:focal | 22 | -2 → 2 (extremes) | 2.324% | 12% | 9.676 pp | FAIL |
| sw:district | 12 | -8 → -5 (adjacent) | 1.173% | 6% | 4.827 pp | FAIL |
| sw:district | 12 | -5 → 0 (adjacent) | 1.060% | 6% | 4.940 pp | FAIL |
| sw:district | 12 | 0 → 5 (adjacent) | 1.321% | 6% | 4.679 pp | FAIL |
| sw:district | 12 | 5 → 8 (adjacent) | 0.687% | 6% | 5.313 pp | FAIL |
| sw:district | 12 | -8 → 8 (extremes) | 1.763% | 12% | 10.237 pp | FAIL |
| sw:district | 22 | -8 → -5 (adjacent) | 1.349% | 6% | 4.651 pp | FAIL |
| sw:district | 22 | -5 → 0 (adjacent) | 0.916% | 6% | 5.084 pp | FAIL |
| sw:district | 22 | 0 → 5 (adjacent) | 1.074% | 6% | 4.926 pp | FAIL |
| sw:district | 22 | 5 → 8 (adjacent) | 0.574% | 6% | 5.426 pp | FAIL |
| sw:district | 22 | -8 → 8 (extremes) | 1.964% | 12% | 10.036 pp | FAIL |

## A5 雙flags uncapped效能

載入≥16s後量兩個5s rAF窗；同S0 default quality比較。

| Shot | hour | S0 FPS | r1 | r2 | r3 | FPS/S0 | calls/S0 | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sw:focal | 12 | 114.94 | 117.28 | 108.86 | 103.12 | 89.7% | 820/606 | FAIL |
| sw:focal | 22 | 112.86 | 116.72 | 108.08 | 102.39 | 90.7% | 820/606 | FAIL |
| sw:district | 12 | 86.97 | 97.16 | 100.83 | 106.87 | 122.9% | 760/934 | PASS |
| sw:district | 22 | 86.15 | 96.89 | 100.81 | 106.81 | 124.0% | 760/1119 | PASS |
| hero | 12 | 86.33 | 91.65 | 91.96 | 91.41 | 105.9% | 950/948 | PASS |
| hero | 22 | 89.42 | 91.37 | 91.42 | 91.14 | 101.9% | 950/948 | PASS |

## 限制及下一步

三輪後停止，未通過項目交owner決定，不另開第四輪。[A3原始射線診斷](a3-diagnostics.json)：144條射線0命中，80個取樣點在視窗外（每個district狀態8個）；其餘miss未重做3D原因分類，不全稱作遮擋。完整SharingDistrict仍包含六個水室及十個內陸court；AABB跨空隙／視窗外的miss保持FAIL，不能等同全部被遮擋。A4範圍依完整主體box，未裁成局部好看區。Live browser診斷每120frames更新，只證實中間easing；精確3s及retarget由node tests驗證。靜態V6不證明所有動態狀態無閃爍。

Chrome沿用同一安裝路徑，但r2/r3為156.0.8078.73，S0/r1為156.0.8078.48；保留原S0數值門檻，不把跨patch比較當成完全同環境的性能保證，也不歸因為本批優化。只測開發Mac Chrome1920×1080/DPR1/default；未測展示硬件、Safari/iPad、Windows、真人2秒辨識、全城Z。Survey／module-swap source未改、未另跑其獨立suite；未部署。
