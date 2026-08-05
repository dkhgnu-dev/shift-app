# Cycle 13 完了報告 (CC → Dex)

## 対象

- branch: `cc-cycle13-generation-ui-stamp-toggle`(基点: `origin/air-cycle13-ui-stamp-toggle`)
- 実装commit: `f36d6f4`
- 指示書: `docs/handoff/P2_Dex_to_CC/cycle_13_generation_ui_and_stamp_toggle_instructions.md`
- Version: v4.47 → **v4.48**(製品コード変更のためversion gate要件どおり+1)
- `main`へはmergeしていません。

## 変更ファイル

- `frontend/src/App.jsx`
- `frontend/src/cycle12Utils.js`
- `frontend/src/cycle12Utils.test.jsx`
- `frontend/src/App.cycle12.test.jsx`
- `frontend/src/App.cycle8.test.jsx`
- `frontend/src/App.cycle9.test.jsx`
- `frontend/src/App.cycle10.test.jsx`
- `frontend/src/index.css`
- `docs/handoff/CURRENT_STATUS.md`

(`AGENTS.md`・`manuals/`配下は共通マニュアル同期対象のため、commit/pushには含めません。)

## 実装内容

### 2. 生成UIの整理

- PCの全体シフト表: 「空欄自動作成」を最も強い見た目の主ボタンとして配置し、「希望休ランダム入力」も日常操作として並べる。「最適化シフトを生成」は同列・同強度の常時ボタンとしては出さない。
- 新設の「詳細操作」トグル(`aria-expanded`/`aria-controls="advanced-operations-panel"`)の先に、上級操作として「最適化シフトを再生成」ボタンを配置。押下前に`window.confirm()`で必ず確認し(`confirmAndRegenerate()`)、キャンセル時は`generateShift()`自体を呼ばないため、fetch・履歴・表・`isGenerating`のいずれも変更しない。
- スマホのハンバーガーメニューは「日常操作」(空欄自動作成・希望休ランダム)と「上級・再調整」(最適化シフトを再生成)へセクション分離。上級操作は確認の承認・キャンセルいずれの場合もメニューを閉じる(既存3操作と同じ挙動に統一)。
- 新設`advancedOpen` stateを`closeInteractiveState()`へ組み込み、タブ切替・生成開始(`generateShift`/`fillBlanks`双方)・全画面切替のいずれでも詳細操作パネルが自動的に閉じ、背面に残って誤操作できる状態にならないようにした。
- `generateShift()`自体のロジック・呼び出しシグネチャは無変更。呼び出し導線だけを移動した。

### 3. スタンプの同値トグル空欄化

- 旧`isStampNoOp`(同値スタンプは何もしない)を廃止し、`isStampToggleClear()`(`cycle12Utils.js`)に置換。`applyStamp()`内で、通常シフトの許可判定より**先に**同値判定を行うため、許可シフト設定が後から変わっていても同値セルは常に消去できる。
- 消去・上書きのどちらも`commitHistory()`を一度だけ通し、`setGeneratedResult()`と`setEmployees(buildRequestsFromMatrix(...))`を同一操作内で実行(共通ヘルパー`clearCellByStamp()`)。
- 希望休の同値消去では`employees[].requests`から該当日が即時に消え、Undoで元の希望休・requestsが完全復元、Redoで再び消える。

### 4. 消しゴムスタンプ

- 特殊ID定数`ERASE_STAMP_ID = '__erase__'`を`cycle12Utils.js`に一元定義し、文字列を複数箇所へ直書きしない。
- `buildStampCandidates()`へ「消しゴム（空欄にする）」候補を追加(休・希望休の次、通常/自由時間候補より前)。
- `applyStamp()`で消しゴムは通常シフトの許可判定を一切通さず、入力済みセルを`{}`へ完全初期化。空欄セルを選んだ場合は真のno-op(履歴・Redo・matrix・requestsを変えない、`isEraseNoOp()`)。
- 通常シフト・希望休・自由時間・特殊シフト4種のいずれも消去可能。短タップ・マウスクリック・キーボードEnter/Spaceで同じ結果になり、スワイプ・drag・スワップ・通常編集は起動しない(既存のstampModeEnabled分岐に相乗り)。
- `activeStamp`監視effect(shiftMaster変更時の自動終了判定)から消しゴムを除外し、ルール設定変更でスタンプモードが勝手に終了しないようにした。
- パレット表示は`title`属性を追加し、消しゴムには控えめな危険色(赤系)のボーダーを付けて視覚的に区別。

### 4-1. 特殊シフトスタンプ4種(有休・応援・勉強会・店長会)

- 上記4種を`buildStampCandidates()`へ常時追加(研修・公休など今回指定外の既存特殊シフトは追加していない)。
- 早番`①`の時間帯から初期計上時間を安全に算出する純粋関数`computeEarlyShiftHours(shiftMaster, fallbackHours)`を新設。`①`が欠損・不正形式・終了<=開始の場合は`DEFAULT_SPECIAL_HOURS`へフォールバックする。固定の`4`は散在させていない。
- 特殊スタンプで作るセルは`buildStampedCell(shiftId, hours)`で`hours`を明示保存(`{ shift: '有休', hours: 4, isFixed: true, isError: false }`)。
- 4種とも通常シフトの許可リストに含まれなくても使用可能(`isStampAllowedForEmployee`で許可判定をバイパス)。
- スタンプOFFで対象セルを通常どおり開けば、既存の特殊勤務用の時間入力から個別に`hours`を変更できる(スタンプ中に編集モーダルを開く仕様には変えていない)。
- 同値特殊スタンプの再タップ・消しゴムでは、`hours`・`note`を一切残さず完全空欄化する。
- `activeStamp`監視effectで、消しゴム同様この4種も`shiftMaster`変更による自動終了対象から除外した。

## 既存テストの移行

`最適化シフトを生成`という常時表示のDOMを前提にしていた`App.cycle8.test.jsx`・`App.cycle9.test.jsx`・`App.cycle10.test.jsx`・`App.cycle12.test.jsx`の該当テストを、検索で網羅的に洗い出して更新しました。

- 各ファイルへ`clickRegenerate()`(詳細操作トグルを開いてから「最適化シフトを再生成」を押す)ヘルパーを追加し、`window.confirm`を承認モックした上でユーザー操作としてのフローを通すように変更。
- `App.cycle10.test.jsx`の表示存在チェックは、PCでは「詳細操作を開くと最適化シフトを再生成が現れる」形へ、スマホでは常時表示のまま文言だけ更新。
- テストを通す目的でのユーザー非表示ボタンやテスト専用分岐は追加していません。

## 純粋関数とテストの具体的改修(P2 5節)

- `cycle12Utils.test.jsx`: `isStampNoOp`/旧`buildStampCandidates`の空配列前提テストを削除・置換し、`isStampToggleClear`・`isEraseStamp`・`isEraseNoOp`・`isSpecialStampShift`・`computeEarlyShiftHours`・`buildStampedCell`のhours対応を新規カバー。
- `App.cycle12.test.jsx`: 「同じシフトを同じセルへ重ねてもno-op」テストを「同値スタンプはトグル消去、Undo/Redoで往復」テストへ置換。P2 5-2の13項目のうち、以下を新規テストとして追加しました。
  1. 同値通常スタンプの完全初期化
  2. 同値希望休スタンプでのmatrix空欄化・requests同期・Undo/Redo往復
  3. (2に統合)1履歴のみでの消去
  4. 許可外シフトでも同値消去はalertなしで成功、異なるスタンプは拒否
  5. 消しゴム・特殊4種のパレット表示・選択状態切替
  6. 特殊スタンプの初期hours算出(正常系・フォールバック系)
  7. 特殊スタンプ後の通常編集によるhours変更、同値再タップでの完全空欄化
  8. 消しゴムによる通常/希望休/自由時間/特殊4種いずれの消去とrequests同期
  9. 消しゴムの空欄セルno-op
  10. 消しゴムのキーボード/pointer短タップ/スワイプ挙動差
  11. スタンプON中(消しゴム・特殊スタンプ含む)のセル編集モーダル抑止
  12. 生成UI整理(PC主操作・詳細操作・確認キャンセル・スマホセクション分離)
  13. 全画面表示中の消しゴム・特殊スタンプ選択・消去・モード終了(CCクルー指摘で追加補強)

## CCクルー利用記録

**使用: 推奨どおり実施。**

観点: 生成UI整理・トグル空欄化・消しゴム・特殊スタンプの4領域それぞれについて、`applyStamp()`内の判定順(消しゴム→トグル消去→許可判定→通常書込)、`closeInteractiveState()`での`advancedOpen`クローズ、`activeStamp`監視effectでの除外対象、既存機能への回帰有無を確認。

結果: 4領域すべて「adequately implemented」判定。以下2件を指摘され、いずれも本報告時点で解消済みです。

- `docs/handoff/CURRENT_STATUS.md`のVersionがv4.47のままでv4.48と不一致(version gate失敗) → 本コミットで更新し、`node scripts/check_version_gate.mjs`がPASSすることを確認。
- P2 5-2 #13(全画面表示中の消しゴム・特殊スタンプ操作)の恒久テストが未カバー → `App.cycle12.test.jsx`の既存全画面テストへ、消しゴム選択・消去、有休スタンプ選択・書込、モード終了の検証を追加。

## 検証

```text
node scripts/check_version_gate.mjs -> PASS: App and CURRENT_STATUS are v4.48.
npm.cmd --prefix frontend test -> 248/248 PASS (1回目, 約254秒)
npm.cmd --prefix frontend test -> 248/248 PASS (2回目, 約243秒、連続クリーン)
npm.cmd --prefix frontend run build -> 成功
git diff --check -> クリーン(CRLF/LFの警告のみ、エラーなし)
git status --short --branch -> cc-cycle13-generation-ui-stamp-toggle、対象外ファイル(AGENTS.md/manuals)のみ変更
```

## ブラウザ実機確認

このセッションでもBrowser paneが本プロジェクトと無関係な別アプリ(「シフトカレンダー」、ラベルが「ダッシュボード」「従業員管理」「店舗・ルール設定」など本アプリの実際の文言と異なる)に固定される既知の制約を再確認しました(`friend-shift-frontend`を明示指定しても同様)。Kazumaxに以前ご承認いただいている方針どおり、コードレベルの検証とjsdomコンポーネントテスト(248件)で代替し、PC/スマホ/全画面での実表示・実タッチ操作は未実施です。

## まだ不安な点

- 「詳細操作」パネルの視覚デザイン(強調度・配置)はP2の要求を満たす最小限の実装に留めています。実機でのボタン優先度の見え方はDexまたはKazumaxのご確認をお願いしたいです。
- 消しゴムの危険色(赤系ボーダー)が「必要なら控えめに」の意図に沿っているか、実機での見た目確認が未実施です。
- ブラウザ実機確認が引き続き未実施のため、320/375/768/769/1280pxでの実表示・実タッチでのスタンプ/消しゴム操作は検証できていません。

## Dexに特に見てほしい点

- `applyStamp()`(`frontend/src/App.jsx`)の判定順序(消しゴム→トグル消去→許可判定→通常書込)がP2 section3/4の要求どおりか。
- `advancedOpen`のクローズタイミング(`closeInteractiveState()`経由)が、生成開始・タブ切替・全画面切替の3ケースで意図どおり機能しているか。
- `computeEarlyShiftHours()`のフォールバック条件(欠損・不正形式・終了<=開始)が十分網羅的か。
