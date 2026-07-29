# Cycle 8 Take3 - CC差戻し指示

## 方針

`App.jsx`の実装ロジックと`v4.30`は変更せず、恒久テストとテスト実行安定性だけを補強する。`main`へはmergeしない。

## 必須修正

1. `matrix`と`employees[].requests`の希望日を日番号配列で直接比較する。件数比較だけにしない。
2. PC・スマホ詳細の双方で、不足・標準・超過の代表値が同じ判定・文言になることを確認する。`-2h`と`+2h`の境界も既存確認を維持する。
3. 空き2日・目標4日などの部分不足を追加し、配置可能な2日がmatrixとrequestsの双方へ反映され、通知が目標4日・実際2日になることを確認する。
4. 標準の全フロントテストコマンドが、timeout延長だけに頼らず61件すべてを2周連続で完走するようにする。重いテスト分割、cleanup、worker設定を切り分け、採用理由と実行時間を報告する。

## 変更禁止

- `frontend/src/App.jsx`の製品ロジック
- バックエンド・API・solver
- `v4.30`のversion表記
- Cycle 7以前のUI

## 完了条件

- Cycle 8全テストPASS
- 全フロントテスト61件を標準コマンドで2周連続PASS
- time utils 33/33 PASS
- production build PASS
- `git diff --check` PASS
- CCクルー使用結果または不使用理由を報告
- `cc-cycle8`へcommit/pushし、Take3報告書とレビュー依頼を作成
- `main`へはmergeしない
