# Cycle 9 Take2 完了報告 (CC → Dex)

## 対象

- branch: `cc-cycle9`
- 差し戻し対象HEAD: `7a3e363`
- 差し戻し文書: `docs/handoff/P4_Rollback/cycle_9_interactive_editing_and_history_take2.md`
- Version: v4.31 → **v4.32**
- Take2 実装commit: `30d4824`

## 変更ファイル

- `frontend/src/App.jsx`
- `frontend/src/cycle9Utils.js`
- `frontend/src/index.css`
- `frontend/src/App.cycle9.test.jsx`
- `frontend/src/App.cycle7.test.jsx`
- `frontend/src/App.cycle8.test.jsx`

(`AGENTS.md`・`.cursorrules`・`CLAUDE.md`・`docs/manual_legacy/`・`manuals/` は共通マニュアル同期対象のため、今回のcommit/pushには含めません。)

## Findingごとの対応

### P1-1 希望休が生成後に消え、2回目の生成で守られない → 修正済み

- `cycle9Utils.js`に`parseRequestDays`・`restoreRequestedOffInMatrix`を新規追加。
- `generateShift`・`fillBlanks`双方の成功分岐で、生成開始時点の`employees[].requests`(生成前のclosureの値)を基に、バックエンドが`休`として返した該当日を`希望休`へ戻してから`commitHistory`する。
- `employees[].requests`は引き続き`buildRequestsFromMatrix(newMatrix, ...)`で同期するが、`newMatrix`が既に`希望休`へ復元済みのため、requestsも保持される。
- `FEASIBLE_WITH_WARNINGS`(警告付き仮シフト)・`fillBlanks`(空欄自動作成)も同一の復元処理を通す。
- 恒久テスト追加(`App.cycle9.test.jsx`「Take2 P1-1」describe、4件): 単発生成での復元、2回連続生成でのrequests_off一致、警告付き仮シフトでの保持、空欄自動作成での保持。

### P1-2 自由時間が通常の自動生成候補へ混入する → 修正済み

- `buildShiftTypesPayload(allowedCustomIds = [])`へ変更。既定(`generateShift`)では`__custom__`プレフィックスの自由時間IDを全件除外。`fillBlanks`は現在の固定セルが参照中のIDのみを許可リストとして渡す。
- CCクルーレビューで、`employees[].allowed_shifts`が空の場合にバックエンド(`shift_solver.py:184-187`)が「全シフト可」と解釈し、`shift_types`に残った自由時間IDまで対象になり得る抜け穴を追加指摘されたため、`resolveAllowedShifts(shifts)`を新設。`e.shifts`が空の従業員には、自由時間を除いた通常のshiftMaster IDを明示送信し、バックエンドの「空=全シフト可」フォールバックを発生させないよう修正。
- バックエンド・DB・solverは無変更(フロントエンドpayload組み立てのみで解決)。
- 恒久テスト追加(3件): 通常生成でのIDゼロ件確認、空欄自動作成での使用中IDのみ許可確認、allowed_shifts空の従業員への明示送信確認。

### P1-3 標準テストが安定完走しない → 修正済み

- `App.cycle7.test.jsx`: 24名×31日の暗黙INITIAL_DATA依存を廃止し、`beforeEach`で2名の小型fixtureを`localStorage`へ直接seedするよう変更(`K.D.`参照箇所は`太郎`へ置換)。ズームテスト・ポップオーバーテスト・行ドラッグテストはいずれもDOM規模非依存の検証目的のため、目的・assertionは変更していない。
- `App.cycle8.test.jsx`: 同様に`beforeEach`で2名の小型fixture(先頭は引き続き`K.D.`)をseedする既定へ変更。「正社員系2〜4日・パート系5〜8日」の境界確認3テストのみ、境界の意味自体を保つため専用の3名+3名fixture(`seedRandomHolidayFixture`)を追加し、`i<6`判定を`i<standardCount(=3)`へ置換。
- 標準テスト(`npm --prefix frontend test`)を2回連続実行し、いずれも**130/130 PASS**、断続的なtimeoutは再現しなかった(詳細は下記「検証」参照)。
- `testTimeout: 20000`・`pool: "forks"`・`maxWorkers: 2`は無変更。

### P1-4 従業員管理画面が行全体dragのまま → 修正済み

- 従業員管理タブ(PC表)の`<tr draggable>`を廃止し、ダッシュボード表と同じ`.drag-handle-compact`パターンの専用ハンドル(`<span className="drag-handle-compact employee-row-drag-handle">`)へ`draggable`・`onDragStart`・`onDragEnd`を移動。
- 行本体・編集/削除ボタンにはdraggable属性が付かないことを確認する恒久テストを追加。既存の行drag並べ替えテストは、ハンドル要素からdragStart/dragEndを発火するよう修正。

### P2-1 往復スワイプを短タップと誤判定する → 修正済み

- `pointerTrackRef`に`maxDistancePx`を追加し、新設の`handleCellPointerMove`が`pointermove`のたびに開始点からの最大距離だけをref上で更新(React stateは更新しない)。
- `handleCellPointerUp`は`Math.max(state.maxDistancePx, 終了地点での距離)`で判定するため、「0px→30px→2px」のような往復でも8px以上の移動があった時点で確実に破棄される。
- 恒久テスト追加: 30px移動後に2px地点へ戻すケース(開かないこと)、8px未満の往復ケース(開くこと)。

### P2-2 INFEASIBLE再試行が古いrenderの状態を使い得る → 修正済み

- `infeasibleInfo`へ関数(`retry`)を保存する方式を廃止し、`kind: 'generate' | 'fill'`のみを保存。再試行ボタンは押下時点の最新renderから直接`generateShift(true)`/`fillBlanks(true)`を呼び出す。
- 恒久テスト追加: INFEASIBLE表示後にUndoで状態を変えてから再試行し、最新の状態(Undo後のemployees/matrix)を使うことを確認。

### P2-3 キーボードのセルフォーカス位置が見えない → 修正済み

- セルbuttonの`opacity: 0`インラインスタイルを削除し(背景は`transparent`のまま維持、マウス時の見た目は変化なし)、`className="cell-hit-target"`を付与。
- `index.css`へ`.cell-hit-target:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; background: rgba(79,70,229,0.08); }`を追加。既存の`.name-col:focus-visible`と同じ方針。

## CCクルー補助レビュー

サブエージェントによる差分レビューを再実施(担当範囲: 7 Finding全件の実装確認・抜け漏れ・整合性・新規バグの有無)。

- 採用: P1-2で`allowed_shifts`が空の場合の「全シフト可」フォールバック抜け穴を追加指摘 → `resolveAllowedShifts`を実装して解消(上記参照)。
- その他6件(P1-1, P1-3, P1-4, P2-1, P2-2, P2-3)は「adequately fixed」と判定。
- 新規の無関係なバグは検出されなかった。

## 検証

```text
npm.cmd --prefix frontend test   -> 130/130 PASS (1回目, 約113秒)
npm.cmd --prefix frontend test   -> 130/130 PASS (2回目, 約114秒、連続クリーン)
node frontend/test_time_utils.mjs -> ALL PASSED (33/33)
npm.cmd --prefix frontend run build -> 成功
git diff --check -> クリーン(CRLF/LFの警告のみ、エラーなし)
```

Dex指摘の「Cycle 8希望休テスト3件timeout」「Cycle7ズームテスト単独timeout」は、今回のfixture縮小後は2回の一括実行いずれでも再現しませんでした。

## ブラウザ実機確認

今回のセッションでも、Browser paneが本プロジェクトと無関係な別アプリ(「シフトカレンダー」、ラベルが「ダッシュボード」「従業員管理」「店舗・ルール設定」など本アプリの実際の文言と異なる)に固定される既知の制約を再確認しました(`friend-shift-frontend`を明示的に指定して起動しても同様)。Kazumaxに以前ご承認いただいている通り、今回もコードレベルの検証とjsdomコンポーネントテストで代替し、実機確認(320/375/768/769/1280pxの全幅・実タッチ操作・実データでの生成)は引き続き未実施です。

## まだ不安な点

- `resolveAllowedShifts`は「`e.shifts`が空配列」のケースのみを扱っています。Dexの指摘文言(「有効IDが0件の従業員」)には、`e.shifts`が非空でも中身が全てshiftMasterに存在しないIDの場合(データ不整合)も含まれ得ますが、これは通常のUI操作では発生しない状態(選択肢は常にshiftMasterの実在キーから選ぶ)のため、今回はallowed_shiftsが空配列の場合のみ対応しています。もし想定外の経路でこの状態が発生し得る場合はご指摘ください。
- ブラウザ実機確認が引き続き未実施のため、320/375/768/769/1280pxでの実表示・実タッチでの往復スワイプ・実データでの生成/空欄自動作成は検証できていません。

## Dexに特に見てほしい点

- P1-1の復元ロジック(`restoreRequestedOffInMatrix`)が、生成前の`employees[].requests`をどの時点のclosureから読んでいるか(`generateShift`/`fillBlanks`呼び出し時点の`employees`)。
- P1-2の`resolveAllowedShifts`が意図通りバックエンドの「空=全シフト可」フォールバックを閉じているか。
- P1-3のfixture縮小が、境界確認(2〜4日/5〜8日)の意味を弱めていないか。
