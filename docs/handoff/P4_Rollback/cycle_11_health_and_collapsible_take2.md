# Cycle 11 Take2 修正指示

## 修正対象

1. `frontend/src/cycle11Utils.js`
   - `parseShiftRange` が `開始～終了` の厳密な2要素だけを受理するよう修正する。
2. `frontend/src/cycle11Utils.test.jsx`
   - 区切り過多、空要素、分範囲外、`end <= start` を `null` / 非勤務として確認する。
3. `frontend/src/App.cycle11.test.jsx`
   - 現在のzoom最終値だけを見るproxyテストを、折りたたみで再計測されたことを直接証明するテストへ置き換える。
4. `frontend/src/App.jsx`
   - 氏名列トグルを既存Lucideアイコンへ変更する。
5. version、P3 Take2報告、CURRENT_STATUS
   - 製品コード修正のため `v4.36 -> v4.37`。

## 期待する状態遷移

- 正しい `8:15～17:30` は従来どおり勤務として判定する。
- `8:15～17:30～不正値`、`8:15～`、`～17:30`、`8:60～17:30`、`17:30～8:15` は判定不能となり、連勤を切り、休息警告へ使わない。
- 氏名列を折りたたむと、DOM反映後の新しい表幅からPC zoomが再計算される。
- 再展開すると再び新しい表幅で再計算される。
- 折りたたみ操作で `scrollLeft`、セル操作、sticky、Undo/Redo、保存データを変更しない。

## 受入確認

1. 厳密時刻パースの正常1件・不正5件が恒久テストでPASSする。
2. `buildHealthAlerts` で不正時刻を挟むと6連勤が継続しない。
3. geometry mockを使い、展開 -> 折りたたみ -> 再展開でzoom表示が期待値どおり変化し、元へ戻る。
4. Cycle 11対象テスト、全体テスト2周、time utils、build、diff checkがPASSする。
5. `v4.37`、`main`未統合、`cc-cycle11`へpush済みである。

zoomテストは `frontend/src/App.cycle7.test.jsx` の `withMockedScrollGeometry` と、測定時のzoom書き込み順序テストを参考にする。`isNameColumnCollapsed` を依存配列から外した場合に失敗するテストにすること。

## 触らない範囲

- 6連勤のしきい値と勤務/休日分類
- 11時間未満の休息基準
- 警告文言、バッジ配置、セルpointer処理
- 28px、通常幅、sticky offset、スマホ/PC境界
- backend、solver、API、保存形式、履歴形式
- `pool: 'forks'`、`maxWorkers: 2`、`testTimeout: 20000`
- `main`へのmerge

## 提出

- P3 Take2報告:
  - `docs/handoff/P3_CC_to_Dex/cycle_11_health_and_collapsible_take2_report.md`
- 作業branch:
  - `cc-cycle11`
- CCクルー:
  - 今回は境界値とテスト有効性の再確認に限定して使用し、結果をP3報告へ記録する。

