# Cycle 3 スマホ版UI/UX最適化 — Dex P2事前レビュー

対象計画: `docs/handoff/P2_AirCrew_to_CC/cycle_3_mobile_layout_fix.md`
実装予定担当: Air（CCの利用制限中に限る特例）
レビュー日: 2026-07-24

## 判定

**P2 NG（計画修正・Cycle 2の統合単位確定後にAirのP3着手可）**

バックエンド・ソルバー・保存形式には触れないUI作業なので、AirがP3を担当する特例そのものは承認します。ただし、現計画を文字どおり実装するとPC版の横並びが崩れ、さらにCycle 2とCycle 3の統合対象が混ざるため、このままの着手は承認しません。

## 着手前の必須修正

1. P2指示書の制御文字を除去してUTF-8の通常文字に直す。`flex-direction`、`font-size`、`fixed`、`bottom`、`npm` が壊れて見える箇所があるため、修正版を独立コミットする。
2. `.app-container` は次を**基本定義**として移植し、`@media (max-width: 768px)` 内でだけ `flex-direction: column` にする。これがないと769px以上でもsidebarとmain-contentが縦積みになる。

   ```css
   .app-container { display: flex; width: 100%; min-height: 100vh; }
   @media (max-width: 768px) {
     .app-container { flex-direction: column; }
   }
   ```

3. Cycle 2 UI Take4はP4 OKだが、まだmainへP5統合できていない。同じdirty worktreeでCycle 3を実装するとCycle 2/3を分けてP5できない。**先にCycle 2をP5統合し、最新mainからCycle 3専用branchを切る**こと。これを行えない場合は、Cycle 2+3を一括レビュー・一括統合することをKazumaxが明示承認し、CURRENT_STATUSに統合単位を記載してから着手する。

## 実装仕様の補足

- アクション群は共通のfragment/componentにし、デスクトップのheaderかモバイルのbottom barの**一方だけ**で描画する。`generatedResult`時だけ空欄自動作成を出す条件、`disabled={isGenerating}`、`fillBlanks()`／`generateShift()` は現行どおりに共有し、二重表示・二重実行を防ぐ。
- bottom barは `fixed` を採用する。`z-index: 60`程度（header 50より前、sidebar/loading/modalより後）とし、barと`.main-content`の双方に `env(safe-area-inset-bottom)` を含む下余白を設け、末尾の内容が隠れないようにする。
- `isMobileView`は画面内のPC/スマホ表示切替にも使われている。物理幅と表示モードの判定を混同しないよう、bottom barの表示条件を明示する（推奨: narrow viewport判定を分離）。768px以下で手動PCビューに変えた場合にも、barが消失・重複しないこと。
- モーダルはモバイルで `width: calc(100% - 32px)`、左右余白16px、`max-height: calc(100dvh - 32px)`、縦scrollを維持する。320px幅で横はみ出しを起こさないこと。
- iOSズーム対策は実入力要素が対象。`.form-control` と `.time-picker-input` に加え、画面内の `input, select, textarea` のcomputed font-sizeが16px以上になることを確認する。`.time-picker-value` はdivなので補助対象とする。
- 表示バージョンを `v4.16` から `v4.17` に更新する。

## P3の変更範囲・停止条件

- 変更可: `frontend/src/App.jsx`、`frontend/src/index.css`、表示バージョン、Cycle 3 P3報告書、必要最小限のUIテスト。
- 変更禁止: backend/solver、依存パッケージ、保存データ形式、Cycle 2機能の仕様。
- AirはP2作成者かつ例外P3担当のため、自己承認で完了にしない。P3後はDex P4を必須とする。

## P3受入条件

1. `npm --prefix frontend test`、`node frontend/test_time_utils.mjs`、`npm --prefix frontend run build` が成功する。
2. 320px / 375px / 390px / 768pxで、左の空白・意図しない横スクロール・bottom barによる末尾隠れがない。表をPC表示した際の意図的な表内横scrollは除く。
3. 769px以上ではsidebarとmain-contentが横並び、header actionは従来位置、bottom barは非表示である。
4. モバイルでは各actionが一つずつだけ表示される。生成結果なしは「最適化シフトを生成」のみ、ありは「空欄自動作成」も表示。loading中は両方disabledで、各クリックが既存handlerを1回だけ呼ぶ。
5. モバイルのTimePicker矢印は34x34px以上で、既存の4桁入力・Enter・Escape・24:00・矢印disabled/re-enableのテストを維持する。
6. 画面幅を769→768→769に変更し、手動PC/スマホ切替も行って、barの重複・消失がない。sidebar、modal、loading overlayはbarより前面に出る。
7. P3報告には、確認したviewport、ブラウザ実機の有無、変更ファイル、テスト結果を記載する。

## Airへの返却

上記の着手前3点を満たした後、AirがP3を実装してください。完了報告先は `docs/handoff/P3_CC_to_Air/cycle_3_mobile_ux_report.md` のままで構いませんが、担当表記をAirに修正してください。

## デクスクルー利用

- 利用: UI実装観点と統合・回帰観点の独立サブレビューを実施。
- 理由: レイアウト変更はPC/モバイル双方へ影響し、未統合のCycle 2と同一worktreeで進む高リスク作業だったため。

## Kazumax確認レベル

**必須確認** — Cycle 2を先に単独P5統合するか、Cycle 2+3を一括統合として進めるかの選択が必要です。
