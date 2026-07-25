# P2 指示書: Cycle 4 デフォルト構成（24名）へのワンタッチリセット機能と鍵持ち設定

## 背景・目的
スマホ等の新端末で開いたときや、テスト・デバッグでデータが壊れるか初期（8名）に戻ってしまった際に、毎回メンバー24名分や設定を入れ直す手間を省くための改修です。

現在、ソースコード (`frontend/src/App.jsx`) の `INITIAL_DATA` には全24名の構成データが存在しますが、プライバシー（ Stop Conditions : 個人情報保護 ）の観点からイニシャル（K.D.、N.E. 等）で記載されています。実名を GitHub にコミットしてはいけないルールを守りつつ、どの端末・ブラウザからでも **最新の「全24名デフォルト構成」に一発でリセットできるボタン** を追加し、業務で必須となる **「上位3名のデフォルト鍵持ち設定」** を組み込みます。

## CCへの実装指示 (P3)

### 1. `frontend/src/App.jsx` の `INITIAL_DATA` 編集（上位3名を鍵持ちへ）
`INITIAL_DATA` 配列の最初の3名（正社員・時間限定社員）の `isKeyHolder` パラメータを `true`（鍵あり）に変更してください。
- 1行目: `'K.D.'`, `isKeyHolder: true` に設定
- 2行目: `'N.E.'`, `isKeyHolder: true` に設定
- 3行目: `'N.K.'`, `isKeyHolder: true` に設定
※ 4番目以降のメンバーは `isKeyHolder: false` のまま維持してください。

### 2. 「従業員管理（employees）」画面へのリセットボタン導入
- `lucide-react` からのインポートに `RotateCcw`（または類似のアイコン）を追加してください。
- `renderActions` 関数内、`activeTab === 'employees'` の戻り値として描画されるアクション領域において、既存の「新規追加」ボタンと並ぶ形で **「デフォルトリセット」** ボタンを追加してください。

```jsx
// 構成イメージ
<div style={{display: 'flex', gap: '8px', width: isNarrowViewport ? '100%' : 'auto'}}>
    <button 
        className="btn btn-secondary" 
        style={{flex: isNarrowViewport ? 1 : 'none', justifyContent: 'center', backgroundColor: '#F3F4F6', color: '#374151'}}
        onClick={() => {
            if (window.confirm('現在の従業員リストを破棄し、デフォルトの24名構成（鍵持ち権限等設定済）にリセットしますか？')) {
                setEmployees(INITIAL_DATA.map(emp => ({ ...emp, shifts: [...emp.shifts] })));
            }
        }}
    >
        <RotateCcw size={16}/> デフォルトリセット
    </button>
    <button className="btn" style={{flex: isNarrowViewport ? 1 : 'none', justifyContent: 'center'}} onClick={() => openModal()}>
        <Plus size={16}/> 新規追加
    </button>
</div>
```
※ スマートフォン表示（`isNarrowViewport`）における横の収まりを綺麗に揃えるようスタイルを配慮してください。

### 3. バージョン表記の更新
ヘッダー（PC用・モバイル用両方）にあるバージョン表記を `v4.18` から `v4.19` へ更新してください。

---

## 検証条件 (MUST)
1. コマンド自動テストおよびビルド検知
   - `npm --prefix frontend test` でテストが全通過すること
   - `node frontend/test_time_utils.mjs` で全33テストが通過すること
   - `npm --prefix frontend run build` がエラーなく完了し、生成物（`dist`）が出力されること
2. 画面ロジック検証
   - 「従業員管理」画面で「デフォルトリセット」をクリックした際、確認アラートが出て、承認すると24名リスト（上位3名に 🔑 マーク付与）へ更新されること。
   - スマホ画面（320px/375px/768px 等）とPC画面（769px以上）でボタンレイアウトのズレがないこと。

## 完了報告先
実装および自律検証完了後、`docs/handoff/P3_CC_to_Air/cycle_4_report.md` に完了報告を作成し、`docs/handoff/CURRENT_STATUS.md` を「P3完了・Dex P4レビュー待ち」に更新してください。
