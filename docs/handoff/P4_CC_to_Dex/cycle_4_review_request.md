[C4: CC ⇒ Dex(P4)]

# Cycle 4 レビュー依頼: デフォルト構成（24名）ワンタッチリセット & 鍵持ち設定

- 対象ブランチ: `cc-cycle4`
- レビュー対象HEAD: `417b665`（push済み）
- 対応指示: `docs/handoff/P2_AirCrew_to_CC/cycle_4_default_members_reset_instructions.md`
- 対応報告: `docs/handoff/P3_CC_to_Air/cycle_4_report.md`

## 対応内容（要約）

- `frontend/src/App.jsx`の`INITIAL_DATA`上位3名（K.D./N.E./N.K.）の`isKeyHolder`を`true`に変更（4番目以降は変更なし）。
- 「従業員管理」画面に「デフォルトリセット」ボタンを追加（`window.confirm`確認後、`INITIAL_DATA`で`setEmployees`）。
- ヘッダーのバージョン表記を`v4.18`→`v4.19`に更新（PC・モバイル両方）。
- `frontend/src/App.reset.test.jsx`を新規追加し、リセット確定・キャンセル双方の挙動を恒久コンポーネントテストで検証。

## branch運用について

`docs/handoff/CURRENT_STATUS.md`のWorking Branchが一時的に`main`表記になっていましたが、`manuals/WORKFLOW_RULES.md`の「重要な実装や大きな変更では、mainへ直接pushせず、作業branchを作ってからmergeする運用を優先する」に従い、Kazumax確認の上で`cc-cycle4`ブランチを作成してpushしました。P4 OKの場合は、Dex(P5)が`main`を`git pull --ff-only`で最新化してからmergeしてください。

## push状況

`417b665`として`cc-cycle4`へpush済みです（`origin/cc-cycle4`は新規branch）。

## 検証結果

- `npm --prefix frontend test`（vitest run）: 12件全てPASS（`TimePicker.test.jsx` 10件 + 新規`App.reset.test.jsx` 2件）
- `node frontend/test_time_utils.mjs`: 33件全てPASS
- `npm --prefix frontend run build`: 成功
- ブラウザ実機確認: **未実施**（Take2〜4と同じセッション環境制約により継続して不可）

## Dexへの確認依頼事項

1. `INITIAL_DATA`の`isKeyHolder`変更が指示書通り上位3名のみか（4番目以降に影響がないか）。
2. 「デフォルトリセット」ボタンのUIロジック（確認ダイアログ→`setEmployees(INITIAL_DATA.map(...))`）が意図通りか。
3. レスポンシブレイアウト（320px/375px/768px/769px以上でのボタン横並び）は未確認のため、可能であればDexまたはKazumax側で一度実機確認をお願いできるか。
4. `cc-cycle4`ブランチの作成・pushの判断自体が適切か（`main`直運用から作業branch運用へ切り替えた点）。
