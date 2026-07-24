# P2 指示書: Cycle 3 スマホ版UI/UX本格最適化

## 背景・目的
スマホ版（ブラウザ幅768px以下）で表示した際、左側に大きな空白領域ができ、メインコンテンツが右に寄ってしまうレイアウト崩れが発生しています。また、全体的にPC用のUIサイズになっており、スマホでは操作しづらい状況です。
原因の特定（App.jsxのインラインスタイル）と、本格的なスマホUX向上（タップ領域拡大、ボトムアクションバー化など）をまとめて実装してください。

## CC（今回はAirが特例で代行）への実装指示

### 1. frontend/src/App.jsx の修正
- return 直下の全体ラッパー div に設定されているインラインスタイル <div style={{display: 'flex', width: '100%', minHeight: '100vh'}}> を削除し、<div className="app-container"> に変更してください。
- スマホ画面の時、.header 内にある主要なアクションボタン（最適化シフトを生成、空欄自動作成など）を、画面上部ではなく画面下部に固定配置する「ボトムアクションバー」として描画するように構造を調整してください。二重描画を防ぐため、PCヘッダーかスマホボトムバーの一方でのみレンダリングするようにしてください。
- ボトムバーは isMobileView に依存せず、実際の物理的なViewport幅（Narrow判定等）を分離して表示制御を行い、手動のスマホ表示切替時にも重複・消失しないようにしてください。

### 2. frontend/src/index.css の修正
1. **基本レイアウト修正:** .app-container クラスにPC用の display: flex; width: 100%; min-height: 100vh; を必ず定義し、@media (max-width: 768px) の中だけで lex-direction: column; になるようにする。（PC版が縦積みにならないようにするため）
2. **モーダルの最適化:** スマホ幅の際、.modal の padding と margin を 16px に減らし、width: calc(100% - 32px); max-height: calc(100dvh - 32px); で画面を広く使う。
3. **タップ領域拡大:** スマホ幅の際、.time-picker-step（上下矢印ボタン）の width と height を最低 34px に拡大。
4. **iOSズーム防止:** スマホ幅の際、.form-control, .time-picker-input, .time-picker-value に加え、すべての input, select, textarea の ont-size が 16px 以上になるよう設定し、iPhone等でのタップ時自動ズームを防ぐ。
5. **ボトムアクションバーのスタイル:** 下部に移動したアクションボタン群を position: fixed; bottom: 0; z-index: 60; などで配置。ボトムバー自身と .main-content の双方に env(safe-area-inset-bottom) を含む下余白（padding-bottom等）を設け、末尾の内容が隠れないようにする。

### 3. バージョン表記の更新
表示バージョンを 4.16 から 4.17 へ更新してください。

## 検証条件
1. npm --prefix frontend test、node frontend/test_time_utils.mjs、npm --prefix frontend run build でエラーが出ないこと。
2. PC幅（769px以上）で既存の横並びレイアウトが崩れず、ボトムバーが表示されないこと。
3. スマホ幅（768px以下）でレイアウト崩れがなく、ボトムバーが表示され、末尾コンテンツが隠れないこと。
4. 手動でPC/スマホ表示を切り替えてもボトムバーの重複・消失がないこと。
5. スマホ幅のタイムピッカーボタンが大きく押しやすくなっていること。

## 完了報告先
実装完了後、docs/handoff/P3_CC_to_Air/cycle_3_mobile_ux_report.md に完了報告を作成してください（担当: Air）。
