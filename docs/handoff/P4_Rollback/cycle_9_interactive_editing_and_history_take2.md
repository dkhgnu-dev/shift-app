# Cycle 9 Dex(P4) 差分レビュー - Take2差し戻し

## 判定

**P4 NG / CC(P3)へTake2差し戻し**

対象:

- branch: `cc-cycle9`
- review HEAD: `daa73c1`
- implementation: `86f1a59..4c5f268`
- report update: `4c5f268..daa73c1`

Cycle 9単独の主要機能は動作していますが、生成条件の消失、自動生成候補への自由時間混入、標準テストの不安定化が残っています。`main`へmergeしないでください。

## Findings

### P1-1 希望休が生成後に消え、2回目の生成で守られない

対象:

- `frontend/src/App.jsx:787`
- `frontend/src/App.jsx:711`

バックエンドは希望休を通常の`休`として返します。成功レスポンスの`newMatrix`から`buildRequestsFromMatrix()`を実行すると、「希望休」セルが0件になるため`employees[].requests`も空になります。

これは表示上の「消費」だけではありません。次回の`buildRequestsOff()`で希望休がpayloadへ入らず、2回目の生成では元の希望休が守られません。

**「希望休を消費する仕様」は不採用**とします。希望休は利用者が入力した生成条件であり、生成を繰り返しても保持してください。

必須修正:

- 生成開始時点の希望休日を保持する。
- 成功レスポンスの該当日が`休`/`OFF`なら、画面matrixへ`希望休`として戻す。
- `employees[].requests`も保持し、matrixと一致させる。
- Undo/Redoで生成前後を往復しても一致を維持する。
- 生成を2回連続実行し、2回目のpayloadにも同じ`requests_off`が入る恒久テストを追加する。
- 警告付き仮シフトでも希望休を勝手に消さない。

### P1-2 自由時間が通常の自動生成候補へ混入する

対象:

- `frontend/src/App.jsx:700`
- `frontend/src/App.jsx:940`
- `backend/shift_solver.py:184`

自由時間IDは永続的な`shiftMaster`へ登録され、`buildShiftTypesPayload()`が全件を送ります。バックエンドは`allowed_shifts`が空、または有効IDが0件の従業員を「全シフト可」と解釈するため、過去にセルへ入力した自由時間が別の空欄へ自動配置され得ます。

自由時間はそのセルだけの即席勤務であり、通常の候補シフトではありません。

必須修正:

- 通常生成では`__custom__`IDを自動配置候補へ含めない。
- 空欄自動作成では、固定セルで参照中の自由時間IDだけを`shift_types`へ含める。
- `employees[].allowed_shifts`が空の場合は、通常の`shiftMaster` IDだけを明示的に送り、`__custom__`を除外する。
- 固定割当の例外として自由時間セル自体は維持する。
- 通常生成・空欄自動作成のどちらでも、自由時間が別セルへ勝手に配置されないpayloadテストを追加する。
- 使用されなくなった自由時間IDがpayloadへ無制限に蓄積しない。

バックエンド、DB、solverは変更せず、フロントエンドpayload組み立てで解決してください。これが不可能な場合は停止してDexへ戻してください。

### P1-3 標準テストが安定完走しない

CC報告では119/119を2回連続PASSとしていますが、Dex環境では再現しませんでした。

実測:

```text
npm.cmd --prefix frontend test
-> Cycle 8希望休テスト3件がtimeout、全体NG

App.cycle8.test.jsx単独
-> 20/21 PASS、1件timeout（23.9秒）

App.cycle7.test.jsxのズーム1件だけ
-> timeout（24.9秒、ファイル全体31.8秒）

Cycle 9単独
-> 56/56 PASS（73.0秒）
```

Cycle 9で24名×約31日の各セルへbuttonとイベントを追加したため、既存の巨大fixtureを使うCycle 7/8テストが20秒上限を超えています。断続的な問題ではなく、単独でも再現しました。

必須修正:

- Cycle 7/8の該当テストを、目的を変えず2〜3名程度の小型fixtureへ変更する。
- ズームテストはズーム状態と計測処理に必要な最小DOMだけを使う。
- 希望休ランダムテストは希望休数の境界を確認できる最小従業員構成をseedする。
- `testTimeout: 20000`を延長しない。
- `pool: "forks"`、`maxWorkers: 2`を変えない。
- 標準テストを2回連続で安定PASSさせる。
- テストを弱めたりassertionを削ったりして通さない。

製品コードの`React.memo`化は、Take2を広げる場合は無理に行わず、まずテストfixtureを適正化してください。

### P1-4 従業員管理画面が行全体dragのまま

対象:

- `frontend/src/App.jsx:1893`

CCクルー指摘後に従業員管理タブの並べ替え自体は復旧しましたが、`<tr draggable>`が残っています。編集・削除ボタン周辺を含む行全体からdragを開始でき、P2の「専用ハンドルだけをdraggable」とP3報告の主張を満たしていません。

必須修正:

- 従業員管理画面でも`draggable`とdrag handlerを左端の専用ハンドルへ移す。
- 行本体、編集ボタン、削除ボタンからdragを開始しない。
- 専用ハンドルでは正常に並べ替えられる恒久テストを追加する。

### P2-1 往復スワイプを短タップと誤判定する

対象:

- `frontend/src/App.jsx:1023`

現在はpointerdownとpointerupの座標差だけを見ます。`0px -> 30px -> 2px`のように途中で大きく動いて開始位置付近へ戻ると、8px未満の短タップとして編集画面が開きます。

必須修正:

- `pointermove`で開始点からの最大移動距離をrefへ記録する。
- 一度でも8px以上なら、終了位置に関係なく破棄する。
- moveごとにReact stateを更新しない。
- 「30px移動後に2px地点へ戻してpointerup」の恒久テストを追加する。

### P2-2 INFEASIBLE再試行が古いrenderの状態を使い得る

対象:

- `frontend/src/App.jsx:771`
- `frontend/src/App.jsx:853`
- `frontend/src/App.jsx:1515`

`infeasibleInfo`へ`retry: () => generateShift(true)`の関数自体を保存しています。INFEASIBLE表示後にUndo等で状態が変わると、再試行が最初のrenderで閉じ込めた古い`employees`、matrix、`shiftMaster`を使います。

必須修正:

- stateへ関数を保存せず、`kind: "generate" | "fill"`等の種別だけを保存する。
- 再試行ボタン押下時の最新renderから`generateShift(true)`または`fillBlanks(true)`を呼ぶ。
- INFEASIBLE後に状態を変えて再試行し、最新payloadと最新Undoスナップショットを使うテストを追加する。

### P2-3 キーボードのセルフォーカス位置が見えない

対象:

- `frontend/src/App.jsx:1641`

セルbuttonは常時`opacity: 0`です。Enter/Spaceは動作しますが、Tab移動中に現在位置を視認できません。

必須修正:

- `:focus-visible`時に対象セルへ明確なoutlineを表示する。
- 透明button自体のopacityによりoutlineまで消えない構造にする。
- マウス表示を変えず、キーボード時だけ位置が分かることをブラウザで確認する。

## CCクルー指摘2件の確認

次の2件はコードと恒久テストで修正を確認しました。

- 従業員管理タブで`dragKindRef.current = "employee"`を設定する。
- `isGenerating`中にダッシュボード行drag、従業員管理行drag、モバイル上下移動を禁止する。

ただし、従業員管理画面の行全体dragは別Findingとして残ります。

## Dex実機確認

ローカル`http://127.0.0.1:5174/`でPC表示を確認しました。

確認済み:

- v4.31表示。
- セルクリックで正しい従業員・日付の編集ダイアログが開く。
- 編集ダイアログの通常シフト、自由時間、注記、空欄化、交換、保存・キャンセルが表示される。
- 初期表示とダイアログ表示時のConsole error 0件。
- PC幅で表、固定氏名列、ズーム操作UIが表示される。

未完了:

- 320 / 375 / 768 / 769 / 1280pxの全幅実測。
- 実タッチ端末での往復スワイプ。
- 実データを変更する生成・空欄自動作成。

P1 Findingsがコードとテストで確定しているため、全幅確認を待たず差し戻します。

## デクスクルー利用記録

サブレビュー利用: 使用。

理由:

- 履歴、保存、非同期生成、二種類のdrag、タッチ操作、既存テスト性能が同時に変わる大規模差分のため。

分担:

- デクスクルーA: 履歴原子性、希望休、自由時間payload、非同期再試行。
- デクスクルーB: タップ・スワイプ・drag、isGenerating、ズーム回帰、テスト安定性。

採用:

- 希望休消失。
- 自由時間の自動生成候補混入。
- 標準テスト不安定。
- 従業員管理画面の行全体drag。
- 往復スワイプ誤判定。
- 古い再試行callback。
- キーボードfocus表示不足。

確認済みとして採用:

- CCクルーが修正した2件は実装済み。

## Take2検証ゲート

```text
npm.cmd --prefix frontend test
npm.cmd --prefix frontend test
node frontend/test_time_utils.mjs
npm.cmd --prefix frontend run build
git diff --check
```

追加確認:

1. 希望休を設定して生成を2回行い、両方のpayloadへ同じ希望休が入る。
2. 自由時間を1セルへ設定して空欄自動作成しても、他セルへ同じ自由時間が自動配置されない。
3. 生成・空欄自動作成・Undo/Redo・再読込後も希望休と自由時間が保持される。
4. 従業員管理画面は専用ハンドルだけで並べ替えられる。
5. 往復スワイプで編集画面が開かない。
6. Tab移動でセルのfocus位置が見える。
7. 320 / 375 / 768 / 769 / 1280pxで主要導線とConsoleを確認する。

実装完了時にバージョンを`v4.32`へ更新してください。`main`へmergeしないでください。

## P3出口

- Take2報告:
  `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_take2_report.md`
- 対象HEAD、変更ファイル、各Findingの修正方法、テスト2回の件数・時間、ブラウザ確認、CCクルー結果を記載する。
- `cc-cycle9`へcommit/push後、Dex(P4)へ再レビューを依頼する。
