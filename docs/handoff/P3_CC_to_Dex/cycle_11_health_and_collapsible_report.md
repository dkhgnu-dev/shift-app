# P3報告書: Cycle 11「6連勤＆休息不足アラート ＋ 氏名列折りたたみ」

## 対応した指示書
- `docs/handoff/P2_Dex_to_CC/cycle_11_health_and_collapsible_instructions.md`(最終指示書・拘束力あり)
- `docs/handoff/P1_Air_Blueprint/cycle_11_health_alerts_and_collapsible_names.md`(元Blueprint、参考)

## 実装コミットとHEAD
- ブランチ: `cc-cycle11`
- 本Cycleの実装はこの報告書と同時にcommitし、push後にHEADを追記する(下記Git節参照)。

## 変更ファイルと要点

### 新規: `frontend/src/cycle11Utils.js`
- `parseShiftRange(cell, shiftMaster)`: セルの開始/終了(分)を解析。特殊シフト・休・希望休・公休・有休・未知ID・時刻不正はnull。日をまたぐ(終了<=開始)パターンは安全側でnull(判定不能)扱い(下記「既知制約」参照)。
- `isWorkingCell(cell, shiftMaster)`: 3.1の勤務日判定(応援/店長会/研修/勉強会は勤務日、休/希望休/公休/有休/未知IDは非勤務日)。
- `buildHealthAlerts(matrix, shiftMaster, options?)`: 行ごとに1回走査(O(E×D))して6連勤警告と休息不足警告を同時計算。戻り値は`[i][d] = { consecutiveDays, restShortMinutes }`(matrix/localStorage/履歴へは保存しない前提の純粋関数)。
- `formatRestMinutesAsLabel(minutes)`: "10時間15分"表記への整形。
- `extractSurname(name)`: 氏名折りたたみ用の名字抽出(5.3の契約通り)。

### 変更: `frontend/src/App.jsx`
- `healthAlerts`を`useMemo(() => buildHealthAlerts(generatedResult.matrix, shiftMaster), [generatedResult, shiftMaster])`で派生計算。setStateするeffectは作らず、直接編集・スワップ・ランダム入力・自動生成・Undo/Redoいずれでもmatrix参照が変わるたびに自動再計算される。
- `renderCellNode`にセル内非操作バッジ(`⚠️N連勤` / `⏰休息短`、`pointer-events: none`)を追加。既存の`.cell-hit-target`button・レイアウトは無変更。
- セルの`aria-label`/`title`に警告文言を追加(色だけに依存しない)。
- セル編集モーダルに、そのセルの警告詳細(「現在N日以上の連続勤務中です」「前日の勤務終了からの休息がH時間M分です」)を表示するパネルを追加。
- `isNameColumnCollapsed`(UI専用state、初期false、localStorage/Undo/Redo/generatedResultへ非保存)を追加。
- 表の直上・左端に氏名列とは独立した専用トグルbutton(`aria-expanded`/`aria-label`/`title`で状態を明示)を追加。
- `<table>`へ`name-col-collapsed`クラスを付与し、CSS側で`td.name-col`/`th.name-col`の幅を一括変更(28px、PC/スマホ共通)。`display:none`は使用しない。
- 折りたたみ中はPC属性/実績バッジを非表示にし、氏名セルは`extractSurname`によるうっすら名字ヒント(opacity 0.6)を表示。`title`/`aria-label`には常にフルネームを残す。
- 既存のzoom再計測effect(`recalc`/`computeFitZoom`)の依存配列へ`isNameColumnCollapsed`を追加し、折りたたみ切替後にDOM反映後の再計測が1回だけ走るようにした(実ブラウザで51%→55%→51%と正しく追随することを確認済み、下記参照)。

### 変更: `frontend/src/index.css`
- `.name-col-toggle-row` / `.name-col-toggle-btn`(スマホは44×44px以上のタップ領域)。
- `table.name-col-collapsed td.name-col, table.name-col-collapsed th.name-col`(28px固定、PC/スマホ双方の既存ルールより詳細度を上げて確実に上書き)。
- `.name-col .name-cell-collapsed`(うっすら名字表示、既存の`.name-cell-text`メディアクエリより詳細度を上げて競合を回避)。
- `.health-alert-badge`(pointer-events:none)、`.health-alert-panel`(モーダル内警告表示)。
- バージョン表示を`v4.35` → `v4.36`へ更新(ヘッダー/サイドバーロゴ2箇所)。

### 新規テスト
- `frontend/src/cycle11Utils.test.jsx`(純粋関数、31件): 5/6/7連勤境界、休/空/希望休/公休/有休によるリセット、応援等4種の連勤計上、削除済み・未知IDの安全側非勤務、22:00→8:15等4つの休息境界例、両警告同居、名字抽出(半角/全角/なし/空値)。
- `frontend/src/App.cycle11.test.jsx`(App結合、9件): 初期matrix警告表示、直接編集での即時追加/解除、スワップ+Undo/Redoでの警告追従、警告バッジ上の短タップ/横スワイプ既存契約維持、モーダル内警告詳細表示、折りたたみのaria/class連動と再展開、折りたたみ中の氏名詳細アクセス、zoom復元契約(jsdom制約下でのproxy検証、下記既知制約参照)、768/769px境界維持。

## 確定仕様への適合表

| 項目 | 適合 |
|---|---|
| 3.1 勤務日/非勤務日分類 | ✅ |
| 3.2 6連勤(6日目以降すべて警告、非勤務でリセット、期間外を推測しない) | ✅ |
| 3.3 休息不足(11時間未満、ちょうど11時間は警告なし、24:00=1440分、片側不明なら判定しない) | ✅(4境界例すべてテスト済み) |
| 3.4 useMemoのみで派生、setStateするeffectなし、履歴等へ非保存 | ✅ |
| 4 警告UI(pointer-events:none、aria-label/title、両警告同居、既存ジェスチャー無干渉) | ✅ |
| 5.1 折りたたみstate(UI専用、localStorage/Undo/Redo非保存、専用button、44px、独立配置) | ✅ |
| 5.2 幅(展開時現状維持・折りたたみ28px・display:none禁止・class一括変更・sticky維持) | ✅ |
| 5.3 名字抽出契約 | ✅ |
| 5.4 scrollLeft非リセット・再計測1回・zoom契約維持 | ✅(実ブラウザで51%→55%→51%を確認) |
| 6 恒久テスト(純粋関数+App結合、重複render禁止) | ✅ |
| 7 実機確認幅(320/375/768/769/1280) | ✅(下記参照) |
| バージョンv4.36 | ✅ |
| `main`未merge | ✅(mergeしていません) |

## CCクルー指摘と採否

Dex指示書8章に基づき、3クルーへ独立監査を依頼(いずれもコード読解による静的監査、担当領域は指示書通りに分担)。

- **クルーA(勤務分類・6日境界・11時間境界・24:00・未知ID・Undo/Redo再計算)**: 6項目すべて「MATCHES」、**ACCEPT**。指摘なし。
- **クルーB(28px sticky列・320〜1280px・セルタップ/スワイプ/drag・zoom再計測)**: 6項目すべて「MATCHES」、**ACCEPT**。CSS詳細度の実測比較(`table.name-col-collapsed td.name-col`が既存の`td:nth-child(2)`/`td.name-col`(mobile)を上回ることを確認)を含め指摘なし。
- **クルーC(unrelated diff・テスト重複render・timeout・バージョン表記)**: unrelated diff/テスト重複render → 「PASS」。**バージョン表記 → 「FAIL」(v4.35のまま2箇所とも未更新)を検出**。
  - **採否: 採用。** 直ちに`App.jsx`の2箇所(モバイルヘッダーロゴ/サイドバーPCロゴ)を`v4.36`へ修正し、修正後に`grep -rn "v4.3[0-9]"`で他に古いバージョン文字列が残っていないことを確認した。

## 全テスト2回・build・実機幅別確認の結果

- Cycle11対象テスト単独: `cycle11Utils.test.jsx` 31/31 PASS、`App.cycle11.test.jsx` 9/9 PASS(いずれも初回一発PASS)
- `npx vitest run`(全体、`pool: forks` / `maxWorkers: 2`を維持): **1回目 180/180 PASS(160.97秒)、2回目 180/180 PASS(152.16秒)**。タイムアウト0件。(既存140件+Cycle11新規40件=180件)
- version bump後に再度2回連続実行して再確認: **1回目 180/180 PASS、2回目 180/180 PASS**。
- `node frontend/test_time_utils.mjs`: 33/33 PASS
- `npm run build`: PASS
- `git diff --cached --check`: PASS(CRLF警告のみ)

### 実機確認(320 / 375 / 768 / 769 / 1280px)
devサーバー(vite)を起動し、Browserでlocalstorageへ2名の小fixtureを投入(6連勤+休息不足の両方を含む行)して確認。この環境では`computer{action:"screenshot"}`によるスクリーンショット取得ができなかった(Browser paneが非表示のため合成不可)ため、DOM/computedStyle/getBoundingClientRectによる座標・属性の直接実測で代替した。

- **1280px(PC)**: 6連勤バッジ(`aria-label`に「現在6日以上の連続勤務中です（連続6日目）」)、休息不足バッジ(「前日の勤務終了からの休息が8時間15分です」)を実測確認。折りたたみで氏名列幅187→28px、`aria-expanded`がtrue→falseへ連動。折りたたみ中も氏名セルクリックで従業員詳細ダイアログ(「目標計上時間との差分」)が開くことを確認。
- **768px(スマホ境界)**: ヘッダー文言「氏名」、氏名列82→28px、sticky left 0px維持、トグルの実タップ領域44×44px以上を確認。
- **769px(PC境界)**: ヘッダー文言「従業員」、sticky left 40px(折りたたみ前後とも)、drag-col表示維持を確認。
- **375px**: トグル44×44px、休息不足込みのaria-label、折りたたみ28px維持を確認。
- **320px**: 折りたたみ時に氏名列右端と日付列左端の座標が重複・隙間なく一致(36px=36px)することを確認(overlapなし)。
- **PC Zoom**: 手動+/-、フィット、折りたたみ切替後の自動再計測(51%→55%→51%)を実測。resize往復・折りたたみ往復いずれも例外なし。
- **Browser console**: 全幅を通じてwarning/error 0件。

## 既知制約・未確認事項

- **日をまたぐ勤務パターン(終了<=開始)**: 指示書3.3の通り現行仕様外。`parseShiftRange`は終了<=開始のケースを安全側でnull(判定不能)として扱い、休息判定・連勤判定のどちらにも悪影響を及ぼさない設計にした。現行`shiftMaster`のデータは全シフトが同日内(最大24:00)で完結しており、実データでこのケースが発生することは想定していない。もし将来的に日またぎ勤務シフトを追加する必要が生じた場合は、本関数の前提が崩れるため、Kazumax/Dexへ確認のうえ再設計が必要。
- **zoom復元契約のVitestでの直接検証**: jsdomはレイアウトを計算しないため、`computeFitZoom`の実測分岐(`container.clientWidth`)が常に0となり、Vitest上では「エラーなく実行され`table.style.zoom`が不整合な値のまま残らないこと」のproxy検証に留まる。実ブラウザでの実測(51%→55%→51%)で実際の再計算・復元動作を別途確認済み。
- **スクリーンショット画像としての実機確認**: 本環境ではBrowser paneの画面合成待ちが取得できずスクリーンショット画像を残せなかった。代替としてDOM/computedStyle/getBoundingClientRectの座標・属性実測記録を本報告に残した。画像での確認が別途必要であればお知らせください。

## `v4.36`の表示箇所確認
- `App.jsx`内、モバイルヘッダーロゴ(旧v4.33→v4.34→v4.35)とPCサイドバーロゴの2箇所を`v4.36`へ更新済み。`grep -rn "v4.3[0-9]" frontend/src`で他の古いバージョン文字列が残っていないことを確認済み。

## `main`について
`main`へはmergeしていません。作業はすべて`cc-cycle11`ブランチ上。

## Dexに特に見てほしい点
- `parseShiftRange`の「終了<=開始は安全側でnull」という設計判断が、将来の日またぎ勤務要件に対して妥当な暫定対応か。
- CSS詳細度を利用した折りたたみ列の上書き方式(`table.name-col-collapsed td.name-col`)が、今後のCycleでの氏名列関連CSS変更時にも安全に保守できる設計か。
