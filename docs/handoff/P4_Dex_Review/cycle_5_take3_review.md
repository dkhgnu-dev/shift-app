# Cycle 5 Take3 Dex P4 Review

## 判定

**P4 OK - P5統合可**

Take2で残っていた固定1列目と氏名列の5px重複は解消した。
実装差分、テスト、指定5画面幅の実座標、既存タブ回帰にブロッカーはない。

## Review Target

- Branch: `cc-cycle5`
- Requested HEAD: `aa50aa8`
- Implementation commit: `56bff20`
- Documentation follow-up: `aa50aa8`
- Compared from: `1df48c5`
- Version: `v4.23`

`56bff20..aa50aa8`はhandoffの対象HEAD追記だけで、製品コード変更はない。

## DIFF Review

- `frontend/src/index.css`
  - 1列目へ`width/min-width/max-width: 40px`を指定
  - 2列目の`left: 40px`と一致
  - 日付列の共通`min-width: 45px`には影響なし
- `frontend/src/App.jsx`
  - PC・モバイルのバージョンをともに`v4.23`へ更新
- solver、保存、API、従業員データへの変更なし
- 報告範囲外の製品コード変更なし

## Browser Coordinate Verification

各幅で左右ボタンにより350px横スクロールし、固定列のヘッダーと本文を実測した。

| Viewport | 1列目 | 2列目左端 | 境界差 | 結果 |
|---:|---:|---:|---:|---|
| 320px | 40px | 1列目右端と同位置 | 0px | PASS |
| 375px | 40px | 1列目右端と同位置 | 0px | PASS |
| 768px | 40px | 1列目右端と同位置 | 0px | PASS |
| 769px | 40px | 1列目右端と同位置 | 0px | PASS |
| 1280px | 40px | 1列目右端と同位置 | 0px | PASS |

追加確認:

- 横スクロール後も1列目と氏名列が固定: PASS
- 本文でも境界差0px: PASS
- 縦420pxスクロール後も日付ヘッダーはコンテナ上端+1px: PASS
- 固定ヘッダー・固定本文背景は`rgb(248, 250, 252)`で不透明: PASS
- 月度表示は全幅で表示: PASS
- 320pxの従業員管理・ルール設定で横あふれなし: PASS
- 769pxの従業員管理・ルール設定で横あふれなし: PASS
- Browser console error/warn: 0件

## Automated Verification

- `npm --prefix frontend test` 1回目: 17/17 PASS
- `npm --prefix frontend test` 2回目: 17/17 PASS
- `node frontend/test_time_utils.mjs`: 33/33 PASS
- `npm --prefix frontend run build`: PASS

Viteプラグインのdeprecated warningはテストランナー起動時の既知警告であり、製品画面のconsoleには出ていない。今回差分による回帰ではない。

## Crew Review

サブレビュー利用判断: **使用**

理由: Take3で同じ固定列領域を再確認するため、デクスクルーに差分範囲・CSS境界計算・バージョン・範囲外変更を独立監査させた。

統合判断:

- 静的に境界一致: 採用。Dex実測でも5幅すべて0px差で一致
- `aa50aa8`は文書のみ: 採用。Git差分で確認
- P4 OK提案: 採用。Dexの自動・実ブラウザ検証でもブロッカーなし
- 残存リスク「実ブラウザ未確認」: 解消。Dexが指定5幅で確認済み

## Kazumax確認レベル

**確認不要**

理由: CSS境界と通常導線はDexが指定5幅で実測し、自動テスト・既存タブ・consoleまで確認した。
操作感に関する好みの変更を希望しない限り、今回Kazumaxが追加で触る必要はない。

## Next

Dex(P5)がレビュー済み`cc-cycle5`をmainへmergeし、統合記録と最終statusを更新する。
