[C4: Dex(P4) -> CC(P3)]

# Cycle 4 Take2 修正指示

## 修正対象

- `frontend/src/App.jsx`
- `frontend/src/App.reset.test.jsx`
- バージョン表示箇所
- `docs/handoff/CURRENT_STATUS.md`
- Take2完了報告

## 必須修正

1. デフォルトリセット確定時に、24名の `employees` へ戻すだけでなく、古い `generatedResult` も `null` にする。
2. 従業員管理画面のスマホカードとPCテーブルで、`isKeyHolder: true` の従業員を鍵持ちと識別できる表示を追加する。
3. 恒久テストを次の受入確認まで強化する。
4. コード変更になるため、画面バージョンを `v4.20` へ更新する。

## 期待する状態遷移

- キャンセル: 従業員リストと生成済みシフトをどちらも変更しない。
- 確定: 従業員リストを24名デフォルトへ置き換え、生成済みシフトを削除する。
- 確定後: 従業員管理画面で上位3名が鍵持ちと分かり、4番目以降は鍵持ち表示にならない。

## 受入確認

1. 1名だけの従業員データと生成済みシフトがある状態から確定すると、24名へ戻り古い生成結果が消える。
2. キャンセルすると、従業員データと生成済みシフトが保持される。
3. K.D. / N.E. / N.K. の3名に鍵持ち表示がある。
4. 4番目の T.S. を含む残り21名には鍵持ち表示がない。
5. 320 / 375 / 768 / 769px以上でボタンと鍵持ち表示が崩れず、横スクロールが発生しない。

## 触らない範囲

- シフト自動生成ロジック
- API、backend、DB
- 24名の氏名・雇用区分・契約日数・可能シフト
- 上位3名以外の鍵持ち設定
- デフォルトリセット以外の設定初期化

## 検証

```text
npm --prefix frontend test
node frontend/test_time_utils.mjs
npm --prefix frontend run build
```

完了報告は `docs/handoff/P3_CC_to_Dex/cycle_4_take2_report.md` に保存し、修正commitを `cc-cycle4` へpushしてください。

