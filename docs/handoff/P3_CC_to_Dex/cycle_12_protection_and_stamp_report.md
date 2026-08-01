# P3報告書: Cycle 12「手動配置保護・スタンプモード」

## 対応した指示書
`docs/handoff/P2_Dex_to_CC/cycle_12_protection_and_stamp_instructions.md`(最終指示書・拘束力あり)

## 重要: バージョン採番の経緯(通常と異なる対応が必要だった)

作業開始時、mainは指示書の前提通り`v4.38`だったが、実装中に**アグが「全画面表示ボタン」機能等を直接mainへpushし続け**、確認するたびにmainのバージョンが進行した。

1. 実装開始直後の確認: main = `v4.38`(指示書の前提と一致)。
2. 実装後半の確認: main = `v4.40`まで進行していることを検知。P2指示書9章「mainが進んでいたら勝手に採番せず停止する」に従い、**Kazumaxへ確認を仰いだ**。「main最新+1で採番して継続」の回答を得て`v4.41`を採用。
3. CCクルー3による監査時に再確認したところ、mainはさらに`v4.44`まで進行しており(アグが継続してpush)、**`v4.41`はmain側で既に使用済みで衝突**していることが判明。同じ方針(main最新+1で継続)に従い、`v4.45`へ再採番した。

**このため、`v4.41`という中間バージョン番号は本ブランチのコード上には残っていない(最終的に一度だけv4.45へ更新)。** mainが非常に活発に更新され続けているため、**merge時にApp.jsx/index.cssで衝突する可能性が高い**。Dex(P4)はレビュー・merge判断の際にこの点を必ず確認してください。

## 変更前/後バージョン
- 変更前: `v4.38`(作業開始時点のmain/本ブランチ双方の値)
- 変更後: `v4.45`
- `node scripts/check_version_gate.mjs cfcd3a561a23bac2befa45c6b49dbc100f4fbbd1` → `PASS: App and CURRENT_STATUS are v4.45.`

## 対象HEAD
- ブランチ: `cc-cycle12-stamp-and-protect`
- P2作成時HEAD: `cfcd3a561a23bac2befa45c6b49dbc100f4fbbd1`
- 本Cycleの実装コミットは、この報告書と同時にcommitし、push後にHEADを本ファイルへ追記する(下記Git節参照)。

## 全変更ファイル

### バックエンド
- `backend/shift_solver.py`(主要変更)
- `backend/models.py`(`Field(default_factory=list)`化)
- `backend/main.py`(ValueError→HTTP 400変換)
- `backend/requirements.txt`(`jpholiday==1.0.3`追加)
- `backend/test_cycle2_take2.py`(2テストをfail-closed契約へ更新)
- `backend/test_cycle12.py`(新規、Cycle12固有4テストクラス・12チェック)

### フロントエンド
- `frontend/src/App.jsx`(主要変更: generateShift保護・fillBlanksトークン共有・スタンプモード)
- `frontend/src/cycle12Utils.js`(新規: 純粋関数)
- `frontend/src/cycle12Utils.test.jsx`(新規: 17テスト)
- `frontend/src/App.cycle12.test.jsx`(新規: 16テスト)
- `frontend/src/App.cycle9.test.jsx`(1テストをCycle12の意図的な仕様変更に合わせて更新)
- `frontend/src/index.css`(スタンプモードUI・トグルのCSS追加)

### ドキュメント
- `docs/handoff/CURRENT_STATUS.md`

## 実装内容

### 2. 通常生成の手動セル保護
- `cycle12Utils.js`の`isProtectedCellForGenerate`: `cell.shift`が存在し`cell.isFixed !== false`のセルだけを保護(`isFixed:true`および未設定は保護、`isFixed:false`は再最適化許可)。
- `buildProtectedFixedAssignments`: fetch開始時にmatrixをスナップショット化し、`fixed_assignments`ペイロードと座標→元セルオブジェクトのマップを同時構築。休/希望休はOFFとして送る。
- `reconcileGeneratedMatrix`: バックエンド応答から、保護座標だけを元セルオブジェクトで丸ごと再合成(shift/hours/note/isFixed/isErrorすべて保持)。
- `generateShift()`: 旧`fixed_assignments: []`固定を廃止し、上記保護ロジックへ統一(fillBlanksと同じ保護方式)。参照中の自由時間IDもfillBlanksと同様にshift_typesへ許可。
- INFEASIBLE/HTTPエラー/通信例外ではmatrix/employees/Undo・Redoを一切変更しない(既存契約を維持)。
- `generateRequestTokenRef`による連打対策: generateShift/fillBlanksで共有し、古い応答・finallyが新しい要求を妨げないようにした。

### 3. バックエンド固定制約のfail-closed化
- `_validate_fixed_assignments()`を新設し、`solve_shift()`入口(`_solve_once()`呼び出し前)で検証。未知employee/期間外day/未知shift/重複座標/固定非OFFと強制希望休の衝突を、1件でも検出した時点で`ValueError`を送出し停止する(部分無視・後勝ちを廃止)。
- `main.py`: `ValueError`をHTTP 400へ変換(黙って200を返さない)。
- `models.py`: `Field(default_factory=list)`化(可変デフォルトの安全化)。

### 4. v4.38未評価差分の是正
- **day_max持ち越し**: `base_max_allowed`(不変)と日ごとの`day_max`コピーへ分離。土日祝で引き上がるのは当日の`day_max`だけとし、翌平日へ持ち越さない(`backend/test_cycle12.py`の`test_day_max_does_not_carry_over_to_next_weekday`で回帰確認)。
- **祝日判定**: 不完全な自前実装`is_japanese_holiday()`を削除し、`jpholiday==1.0.3`の`jpholiday.is_holiday(date)`へ置換。振替休日・国民の休日を含め正しく判定される(通常祝日・振替休日・非祝日をテストで確認)。
- **特殊シフト混入**: `is_special:true`のシフト(有休/公休/応援/研修/勉強会等、プレースホルダ時刻0:00〜0:00を持つ)をEARLY/LATE集計から除外。

### 5. スタンプモード
- `stampModeEnabled`/`activeStamp`をUI専用stateとして追加。
- パレット候補は「休」「希望休」「現在のshiftMasterの通常シフト」「現在の自由時間」に限定(勤務時間入力が必要な特殊シフトは含まれない、`shiftMaster`自体に存在しないため構造的に除外)。
- 既存の`classifyPointerUp()`を再利用し、有効な短タップ(pointerup)でのみ1セルをスタンプ。8px以上移動・350ms超過・pointercancel・複数指では発火しない。キーボードのEnter/Space(`click(detail===0)`)でも同じ経路。
- スタンプで書くセルは常に`isFixed:true`。同じシフトを同じセルへ重ねた場合はno-op(履歴・Redo・noteを変更しない)。
- `closeInteractiveState(keepStampMode)`を拡張: トグルON時は`closeInteractiveState(true)`でエディタ/swap待ち/drag/pointer追跡だけを解除しスタンプは維持。Undo/Redo(`applyHistorySnapshot`)も`closeInteractiveState(true)`でスタンプモードを維持。それ以外(月変更・タブ変更・生成開始・従業員構成変更・デフォルトリセット)は既定の`closeInteractiveState()`でスタンプモードも終了。
- スタンプON中はPCセルdragを開始しない(`draggable={... && !stampModeEnabled}`)。
- active stampの通常シフトIDがルール設定で削除されたら、`useEffect`でactive stampをnullにしてモードを安全停止。
- 既存Lucideの`Paintbrush`アイコンを使用。トグルに`aria-pressed`、パレット各候補に`aria-pressed`+可視ラベル、現在の筆に`aria-live="polite"`。スマホは44px以上のタップ領域、パレットは折り返し。

## CCクルー補助レビュー結果(指示書8章により必須)

3クルーへ独立監査を依頼(担当領域は指示書8章の指定通り)。

- **クルー1(固定セル抽出・payload・応答再合成・失敗経路)**: ACCEPT WITH NOTES。ロジック自体はすべてMATCHES。指摘: (a)当時はまだ未commit状態だったため作業ツリー差分をレビューした旨の注記、(b)`AGENTS.md`が同期対象外差分として紛れていた点 → **採用・対応済み**(AGENTS.md/.cursorrules/CLAUDE.md/docs/manual_legacy/はcommit対象から除外)。
- **クルー2(スタンプUI・pointer・排他制御・アクセシビリティ)**: ACCEPT。10項目すべてMATCHES、指摘なし。
- **クルー3(バージョン・Git衛生・回帰網羅)**: ACCEPT WITH NOTES。**重大指摘: mainが更に進み(v4.44)v4.41が既に使用済みで衝突** → **採用・対応済み**(v4.45へ再採番、本報告書冒頭に経緯を記載)。AGENTS.md等の除外も同様に指摘・対応済み。

いずれもDex(P4)の代替ではなく、CC側の事前セルフレビューとして実施した。

## 検証結果

### フロントエンド
- `npx vitest run`(全体、`pool:'forks'`/`maxWorkers:2`/`testTimeout:20000`は無変更): v4.45確定後に**2回連続220/220 PASS**(258.76秒 / 284.34秒)、タイムアウト0件。
  - 途中1回、無関係な`App.matrixScroll.test.jsx`のテストが重いバックエンドPythonプロセスとの資源競合でタイムアウトしたが、単独実行で8/8 PASSを確認し、フレークと判断(Cycle12の変更とは無関係)。
- `node frontend/test_time_utils.mjs`: 33/33 PASS
- `npm run build`: PASS

### バックエンド
- `python -u backend/test_solver.py`: SUCCESS
- `python -u backend/test_cycle2_take2.py`: **2回連続PASS**。実測時間: **5分7秒(307秒)/5分41秒(341秒)**。Dex指摘通り300秒を超過するため、「高速完了」とは扱わず実測時間をここに明記する(テストの分割・小型化は本Cycleでは実施していない。理由: 既存30チェックの構成を変えると別の回帰リスクを持ち込むため、実測記録での対応を選んだ)。
- `python -u backend/test_cycle12.py`: **2回連続12/12 PASS**(数秒オーダー)。
- `node scripts/check_version_gate.mjs cfcd3a561a23bac2befa45c6b49dbc100f4fbbd1`: PASS
- `git diff --check`(ステージ対象13ファイル): PASS(CRLF警告のみ)
- `git status --short`: 意図した変更のみ。AGENTS.md/.cursorrules/CLAUDE.md/docs/manual_legacy/はステージ対象外。

### ブラウザ実機確認(320 / 375 / 768 / 769 / 1280px)
localhost devサーバーでlocalStorageへ手動固定セル・自動生成セル・スタンプ対象を含む2名fixtureを投入して確認(実際のAPI呼び出しはproduction backendへのため、UI/ロジック確認はモック不要な範囲＝スタンプ・保護表示・折りたたみ共存に限定)。

- **1280px(PC)**: バージョンv4.45表示、スタンプトグル/パレット(休・希望休・①〜等)動作、実際にスタンプ後に保護セル(`isFixed:true`)・自動生成セル(`isFixed:false`)が両方とも無傷であることをlocalStorage実測で確認。スタンプ中はエディタモーダルが開かないこと、Undoが有効になることを確認。
- **375px**: バージョン表示、トグル/パレットボタンとも実測44×44px以上、氏名列折りたたみ(Cycle11)とスタンプパレットが共存し正常表示。
- **768px**: トグルの実タップ領域44×44px以上を確認。
- **769px(PC境界)**: スタンプON中はセルの`draggable`が`false`、OFF復帰で`true`に戻ることを実測確認(PCセルdragの排他)。
- **320px**: スタンプパレット表示時も横スクロール(`scrollWidth > innerWidth`)が発生しないことを確認。
- 全幅共通: Browser console warning/error 0件。

## 触らなかった範囲(指示通り)
- API URL、デプロイ先、永続化形式
- Cycle9のUndo/Redo 20件上限、スワップ、希望休同期の方式
- Cycle7のズーム、Cycle11の氏名列折りたたみ・健全性警告
- 自動生成の既存ハード制約(固定セルを通すための緩和は一切行っていない。矛盾時はINFEASIBLE)
- `pool:'forks'`、`maxWorkers:2`、`testTimeout:20000`

## 未実施確認
- **実機タッチデバイスでの操作感**: Browser実機はデスクトップブラウザのビューポート変更+pointer eventディスパッチによる確認であり、実物理タッチデバイスでの操作感(慣性スクロール、実指のタップ判定等)は未確認。
- **本番/Render環境での`jpholiday`依存関係の解決**: `pip install jpholiday==1.0.3`はこのローカル環境で実施・動作確認済みだが、Render等のデプロイ先ビルドでの依存解決自体はこのセッションでは確認していない(指示書11章の残余リスクとして事前に明示されていた点)。
- **Phase1 FEASIBLE・Phase2失敗時のフォールバックでの固定値不変性の専用回帰テスト**: この経路自体はCycle12で変更していない既存ロジックであり、既存テストスイート全体のPASSで間接的に確認しているが、Phase2を意図的に失敗させる専用テストは追加していない(決定的に再現させる入力の構築が難しく、既存動作を変えていないため優先度を下げた)。

## 残余リスク
- **main分岐リスク(最重要)**: mainが本Cycle作業中にv4.38→v4.44まで進み、アグによる直接pushが継続している。特に`App.jsx`/`index.css`はmain側でも大きく変更されている(全画面表示モード機能等)ため、merge時に高い確率でコンフリクトが発生する。Dex(P4)はレビュー後のmerge方針(手動再統合が必要になる可能性を含む)を必ず検討してください。
- 日をまたぐ勤務パターンは引き続き現行仕様外。
- `backend/test_cycle2_take2.py`の実行時間が300秒を超える点はDex指摘通り残存(実測記録のみで対応、分割は未実施)。

## `main`について
`main`へはmergeしていません。作業はすべて`cc-cycle12-stamp-and-protect`ブランチ上。
