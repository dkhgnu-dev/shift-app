# Cycle 3 スマホ版UI/UX最適化 — Dex P4レビュー

対象HEAD: `83676df` (`air-cc-dev`)
実装commit: `106c2bc`
統合対象: `origin/main` `e15fc10` から `air-cc-dev` のCycle 2+3全体
レビュー日: 2026-07-24

## 判定

**NG（Take 2差し戻し） — P5統合は実行しない。**

Cycle 3のコードは、P2で求めたapp-containerのPC基本CSS、物理viewport判定の分離、header/bottom barの排他描画、safe-area下余白、34px TimePicker、16px入力、v4.17更新を静的に満たしています。backend、solver、保存形式、依存関係にはCycle 3由来の変更がありません。

ただし、主目的であるレスポンシブ表示の実画面検証がなく、settings画面に空の固定bottom barが出る回帰があります。P4 OKにできないため、承認済みA案の一括P5も保留します。

## 必須修正

### P2-1: settings画面の空bottom barを表示しない

- 対象: `frontend/src/App.jsx` のbottom bar描画部（現行1452行付近）。
- 現象: `isNarrowViewport`だけで`.mobile-bottom-bar`を描画し、settingsでは`renderActions()`が`null`を返す。そのため375px等のsettings画面で背景・border・safe-area分を持つ空の固定帯が残る。
- 修正: actionが存在するdashboard/employeesだけでbar自体を描画する。たとえば`activeTab === 'dashboard' || activeTab === 'employees'`を条件に加えるか、actionsを先に変数化してnull時はbarを描画しない。
- 触らない範囲: dashboardの生成／空欄自動作成、employeesの新規追加、既存handler・disabled条件は変更しない。

### P2-2: レスポンシブ受入確認を実画面で実施し、P3報告を訂正する

静的CSSと既存TimePickerテストだけでは、今回の目的（左空白解消・bottom barによる非遮蔽）を受入できません。以下をブラウザ実機またはブラウザdevtools viewportで確認し、スクリーンショットまたは具体的な結果をP3 Take 2報告へ保存すること。

1. 320px / 375px / 768px: 左余白・意図しない横scrollがない。dashboardではactionが各1個、生成結果ありでは空欄自動作成も1個、loading中はdisabledである。
2. 375px: rules/settingsでは空bottom barがない。employeesでは新規追加のみ、dashboardでは生成actionのみがbottom barに出る。
3. 768px: 最下部の操作要素がbarとsafe areaに隠れず、modal・sidebar・loading overlayがbarより前面になる。
4. 769px: sidebarとmain-contentが横並び、header actionは従来位置、bottom barは非表示である。
5. 768px幅で手動PC/スマホ表示を切り替え、barの重複・消失がない。TimePicker矢印の大きさは34x34px以上、入力要素は16px以上である。

P3報告のテスト表記も訂正すること。`npm --prefix frontend test` はVitestのTimePickerコンポーネントテスト10件であり、Time Utils回帰テストは `node frontend/test_time_utils.mjs`（33件）である。

### P2-3: 完了時文書を最新化

- `docs/handoff/CURRENT_STATUS.md` をP3完了・Dex P4 Take 2待ちに更新する。P3実装前のままにしない。
- 修正後のP3報告は `docs/handoff/P3_CC_to_Air/cycle_3_mobile_ux_take2_report.md` に保存する。
- `AGENTS.md`、`manuals/`、`.cursorrules`、`CLAUDE.md`など今回対象外の既存差分をcommitに混ぜない。

## Dex再検証

今回Dexが再実行した結果:

- `npm --prefix frontend test`: 10 passed
- `node frontend/test_time_utils.mjs`: 33 passed
- `npm --prefix frontend run build`: success
- `git diff --check origin/main...air-cc-dev`: 動作に影響しないCSSの末尾空白2件を検出（Take 2で清掃推奨）

## 一括P5について

A案の統合範囲は承認内容と一致し、`origin/main=e15fc10`から`air-cc-dev=83676df`へfast-forward可能な状態です。P4 Take 2がOKになった時点で、Dexがmainを`git pull --ff-only`で最新化し、Cycle 2+3を一括P5します。P4 NG中はmerge・pushを行いません。

## デクスクルー補助レビュー

- 利用理由: Cycle 2+3の一括統合に加え、複数viewport・UI状態・未報告差分を確認するため。
- UI観点: 空bottom barと実画面検証不足を採用。静的実装のP2要件充足を確認。
- 統合観点: 一括統合範囲・fast-forward可能性・対象外差分の除外を確認。CURRENT_STATUSの未更新を採用。

## Kazumax確認レベル

**確認不要** — 修正とAI側のviewport検証・再レビューで完結できる。P5まで進んだ場合のみ、共有前に軽いUI確認を案内する。
