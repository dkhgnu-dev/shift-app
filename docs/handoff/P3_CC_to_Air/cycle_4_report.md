[C4: CC(P3) ⇒ Air/Dex]

# P3 完了報告: Cycle 4 デフォルト構成（24名）ワンタッチリセット & 鍵持ち設定

## 対応した指示

- `docs/handoff/P2_AirCrew_to_CC/cycle_4_default_members_reset_instructions.md`

## 実装内容

### 1. `INITIAL_DATA`の上位3名を鍵持ちへ

`frontend/src/App.jsx`の`INITIAL_DATA`配列の最初の3名の`isKeyHolder`を`true`に変更しました。

- 1行目: `K.D.` → `isKeyHolder: true`
- 2行目: `N.E.` → `isKeyHolder: true`
- 3行目: `N.K.` → `isKeyHolder: true`
- 4番目以降は`isKeyHolder: false`のまま変更していません。

### 2. 「従業員管理」画面へのデフォルトリセットボタン

- `lucide-react`のimportに`RotateCcw`を追加。
- `renderActions()`の`activeTab === 'employees'`分岐に、指示書のサンプルコードどおり「デフォルトリセット」ボタンを「新規追加」ボタンの左に追加しました。クリックすると`window.confirm`で確認し、OKなら`setEmployees(INITIAL_DATA.map(emp => ({ ...emp, shifts: [...emp.shifts] })))`で24名構成へ即時リセットします。
- スタイルは指示書のサンプルをそのまま使用（`isNarrowViewport`に応じて`flex: 1`/`none`を切り替え、既存の「新規追加」ボタンと横並びで揃うようにしています）。

### 3. バージョン表記

ヘッダー（PC用・モバイル用両方）の`v4.18`表記を`v4.19`に更新しました（`replace_all`で2箇所とも反映）。

## 変更ファイル

- `frontend/src/App.jsx`（`INITIAL_DATA`の`isKeyHolder`変更、`RotateCcw`import追加、`renderActions()`へのボタン追加、バージョン表記更新）
- `frontend/src/App.reset.test.jsx`（新規、デフォルトリセットボタンの恒久コンポーネントテスト）

シフト自動生成ロジック、DB/保存形式、既存の削除・上書き系機能には触れていません。実名はコミットしておらず、既存のイニシャル表記を維持しています（Stop Conditions: 個人情報保護に抵触しません）。

## 検証内容

### 1. コマンド自動テスト・ビルド（MUST）

```text
npm --prefix frontend test          -> Test Files 2 passed / Tests 12 passed
node frontend/test_time_utils.mjs   -> 33件全てPASS
npm --prefix frontend run build     -> 成功、distへ出力
```

### 2. 画面ロジック検証

**恒久コンポーネントテストで検証した内容**（`frontend/src/App.reset.test.jsx`、jsdom + `@testing-library/react`）:

- localStorageに1名だけの壊れた/古い従業員リストを仕込んだ状態で起動し、「従業員管理」タブへ切り替え。
- 「デフォルトリセット」ボタンをクリックすると`window.confirm`が1回呼ばれ、OKを返すと画面上に`K.D.`/`N.E.`/`N.K.`を含む24名分の表示に切り替わり、リセット前の従業員（`X.X.`）は表示から消えることを確認。
- `window.confirm`がキャンセル（`false`）を返した場合は、リセット前の従業員（`X.X.`）がそのまま残り、`K.D.`等のデフォルトデータへは切り替わらないことを確認。

**このセッションで確認できなかった項目（重要）**:

Take2〜4と同じ理由（このセッションのBrowserペインが別プロジェクト`シフト`のdevサーバー設定に固定されており、`友達シフト`側を起動できない）により、**ブラウザ実機でのレイアウト確認はできていません**。具体的には以下が未確認です。

- [ ]（未確認・要ブラウザ実機）スマホ画面（320px/375px/768px等）とPC画面（769px以上）で「デフォルトリセット」「新規追加」ボタンの横並びレイアウトが崩れていないか。
- [ ]（未確認・要ブラウザ実機）リセット後の従業員一覧で、上位3名に🔑マークが実際に表示されるか（ダッシュボード側の`emp.isKeyHolder`表示ロジック自体はCycle 3までに実装済みで今回変更していないため、コード上は表示される想定です）。

## まだ不安な点・Dexに特に見てほしい点

- レスポンシブレイアウトの実機確認ができていない点（上記の通り）。可能であればDexまたはKazumax側での実機確認をお願いします。
- `frontend/src/App.reset.test.jsx`は新規追加したApp全体のレンダリングテストです。既存の`TimePicker.test.jsx`と合わせてテストファイルが増えていますが、範囲は今回の変更（デフォルトリセット）のみに絞っています。

## Kazumax確認レベル

軽い確認を推奨します。可能であればスマホとPCそれぞれで「従業員管理」画面のボタン横並びと、リセット後の🔑表示を見ていただけると安心です。
