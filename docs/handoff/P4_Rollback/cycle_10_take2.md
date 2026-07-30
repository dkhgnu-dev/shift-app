# Cycle 10 Dex(P4) DIFFレビュー - Take2差し戻し

## 判定

**P4 NG / CC(P3)へTake2差し戻し**

- Branch: `cc-cycle10`
- Review HEAD: `78d28d7`
- Base: `origin/main` (`1ca3e25`)
- Version: `v4.34`
- `main`へmergeしないこと

スマホ用3アクションのイベント結線、PC導線、氏名列82px、既存Cycle 9機能にP1問題はありません。ただし、Cycle 10の「スマホ画面全領域活用」と主要操作の使いやすさに関わるP2が2件あります。

## Findings

### P2-1: ルール設定タブに不要な下部80px余白が残る

対象:

- `frontend/src/App.jsx:1556`
- `frontend/src/App.jsx:2353`
- `frontend/src/index.css:231`

下部固定バーが表示されるのは従業員管理タブだけですが、スマホ用`.main-content`はすべてのタブで`padding-bottom: 80px`を確保しています。

ダッシュボードだけは`.compact-bottom`で4pxへ補正されますが、ルール設定タブには補正クラスが付かないため、実ブラウザ375pxで次を確認しました。

```text
activeTab = settings
mobile-bottom-bar = 0件
main-content padding-bottom = 80px
```

Cycle 10の目的である「不要な外枠余白の極小化」を、ルール設定だけ満たしていません。

必須修正:

- 下部バー用余白を従業員管理タブだけに付ける。
- ダッシュボードとルール設定は、safe-areaを考慮した最小余白にする。
- `compact-bottom`という否定的な例外より、`has-mobile-bottom-bar`等の明示クラスで従業員管理だけ80pxを確保する構造を推奨する。

### P2-2: 主要3操作の唯一の入口が32×32px

対象:

- `frontend/src/App.jsx:1497`
- `frontend/src/index.css:213`

スマホでは「希望休ランダム入力」「空欄自動作成」「最適化シフトを生成」がハンバーガーメニュー内だけになりました。しかし、その唯一の入口であるハンバーガーボタンは実ブラウザ320/375/768pxで`32×32px`でした。

押しやすさと誤操作防止のため、少なくとも`44×44px`のタップ領域を確保してください。アイコン自体を大きくする必要はなく、ボタンのwidth/heightまたはpaddingで領域を広げれば十分です。

## 恒久テスト不足

Cycle 10専用テストがなく、既存135件は主にPC側の従来導線を検証しています。Take2では次のレスポンシブ契約を恒久テストへ追加してください。

1. `768px`以下のダッシュボードではハンバーガー内に3操作があり、ダッシュボード用下部バーがない。
2. 従業員管理では下部固定バーがあり、下部余白用クラスが付く。
3. ルール設定では下部固定バーも下部余白用クラスもない。
4. `769px`以上ではPCヘッダーの3操作を維持し、スマホ専用操作を描画しない。
5. ハンバーガーボタンに44px以上のタップ領域を保証するクラスまたはCSS契約を確認する。

## 修正補助

### 修正対象

- `frontend/src/App.jsx`
- `frontend/src/index.css`
- 適切なfrontendコンポーネントテスト
- `docs/handoff/P3_CC_to_Dex/cycle_10_report.md`のGit記録

### 期待する状態遷移

- Dashboard / mobile: 下部バーなし、最小下余白、ハンバーガーから3操作
- Employees / mobile: 従業員用下部バーあり、バーと重ならない下余白
- Settings / mobile: 下部バーなし、最小下余白
- PC: 従来のヘッダー操作を維持

### 受入確認

- `320 / 375 / 768 / 769 / 1280px`で上記表示を確認する。
- ハンバーガーの実測領域が44×44px以上。
- 標準テストを2回連続PASS。
- time utils、build、`git diff --check`をPASS。
- Browser consoleのwarning/errorが0件。

### 触らない範囲

- バックエンド、solver、DB、API形式。
- Cycle 9の履歴・セル編集・スワップロジック。
- 従業員管理タブの下部2操作。
- 氏名列82pxとカード余白2px。

## 報告書訂正

`cycle_10_report.md`には「コミット・push未実施」とありますが、レビュー時点では`78d28d7`が`origin/cc-cycle10`へpush済みです。Take2報告では、実際の実装commit・報告commit・push済みHEADを記録してください。

## Dex検証

```text
npm.cmd --prefix frontend test
-> 135/135 PASS、138.22秒

npm.cmd --prefix frontend test
-> 135/135 PASS、132.14秒

node frontend/test_time_utils.mjs
-> 33/33 PASS

npm.cmd --prefix frontend run build
-> PASS

git diff --check origin/main..78d28d7
-> PASS
```

ブラウザ実測:

- 320/375/768px: 氏名列82px、main padding 4px、カードpadding 2px、ダッシュボード下部バーなし
- 768px: スマホ導線
- 769/1280px: PC導線
- 従業員管理375px: 下部固定バーあり
- ルール設定375px: 下部バーなし、不要な下余白80pxあり
- Browser console warning/error: 0件

## デクスクルー利用記録

サブレビュー利用: 使用。

- 観点A: Reactイベント結線、PC導線、Cycle 9操作競合。
- 観点B: レスポンシブCSS、余白、固定列、タップ領域。
- 統合判断: 観点Aの「P1/P2なし」を採用。観点Bのルール設定余白とハンバーガー領域を実ブラウザで再現し、P2として採用。

## Take2出口

- UI/CSS変更のためVersionを`v4.35`へ更新する。
- CCクルー: 不要。修正対象と受入条件が限定されているため。
- 完了報告:
  `docs/handoff/P3_CC_to_Dex/cycle_10_take2_report.md`
- `cc-cycle10`へcommit/pushし、対象HEADをDex(P4)へ報告する。
- `main`へはmergeしない。
