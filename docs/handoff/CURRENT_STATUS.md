# CURRENT_STATUS - 友達シフト

## Project

- Name: 友達シフト
- Repository: `dkhgnu-dev/shift-app`
- Working Branch: `cc-cycle10`
- Main agents: Air / CC / アグ
- External reviewer/integrator: Dex

## Current State

- Cycle: 10 Take2 P4レビュー完了
- Status: Dex(P4)再DIFFレビューOK。差戻し2件と恒久テスト不足は解消し、P1/P2 Findingなし。`main`統合待ち。
- Version: v4.35（更新済み）
- Next: Dex(P5)がレビュー済みHEADを`main`へ統合する
- Working branch: `cc-cycle10`（最新 `main` から生成）
- Air Instructions (Cycle 10): `docs/handoff/P2_AirCrew_to_CC/cycle_10_mobile_ui_optimization_instructions.md`
- P4差し戻し(Take2): `docs/handoff/P4_Rollback/cycle_10_take2.md`
- P4再レビュー: `docs/handoff/P4_Dex_Review/cycle_10_take2_review.md`
- Cycle 9 merge commit: `d1b3866`
- Kazumax確認レベル: 確認不要

## P2 Confirmed Rules (Cycle 9)

- スマホは768px以下、PCは769px以上。
- セル全面の透明selectを廃止し、短タップ・クリック・キーボードで編集画面を開く。
- 横移動8px以上、pointercancel、複数指ではセル操作を発火させない。
- 行並べ替えは専用ハンドル、セル交換は別drag種別として干渉させない。
- 自由時間は既存`shiftMaster`と空欄自動作成payloadへ統合し、バックエンドを変更しない。
- 履歴は`generatedResult`, `employees`, `shiftMaster`を原子的に最大20件保持する。
- 希望休はmatrixから`employees[].requests`を再構築する共通関数で同期する。
- 非同期処理は成功時だけ1履歴を作り、失敗・キャンセル・同値保存では履歴を変えない。
- CCクルー利用は必須。イベント競合、履歴原子性、テスト性能を分担監査する。

## P2 Confirmed Rules (Cycle 8 継承)

- 月間目標計上時間は従業員ごとの任意入力 `targetHours` とし、未設定を許す。
- 既存データや初期名簿へ推測値を埋めない。
- `targetHours` はlocalStorage内のフロントエンド項目とし、バックエンドpayloadへ送らない。
- 法的な「残業」ではなく、特殊勤務も含む「目標計上時間との差分」と表示する。
- 希望休は空き日の列挙・シャッフル方式とし、乱数運による不足をなくす。
- 確定シフトを保持し、実際の空き不足だけを明示通知する。
- CCクルー利用は推奨。使用結果または不使用理由をP3報告に記録する。

## Verification (Cycle 10 Take2, CC P3)

- frontend test(全体): 140/140 PASS（既存135件+Cycle10新規5件、2回連続、148.77秒 / 179.93秒）
- time utils: 33/33 PASS
- frontend build: PASS
- `git diff --check`: PASS（CRLF/LF警告のみ）
- ブラウザ実機確認(375px): ダッシュボード/ルール設定とも`main-content`padding-bottom 4px・下部固定バーなし、従業員管理は`has-mobile-bottom-bar`付与でpadding-bottom 80px・下部固定バーあり、`.hamburger-btn`実測44×44px、console warning/error 0件
- ブラウザ実機確認(769px): PCヘッダー3操作維持、下部バー/ドロワー/ハンバーガーいずれも非存在

## Verification (Cycle 10 Take2, Dex P4)

- frontend test: 140/140 PASS（211.90秒）
- time utils: 33/33 PASS
- frontend build: PASS
- `git diff --check 311db91..7acccc9`: PASS
- デクスクルー: React導線回帰とレスポンシブCSSを分担監査。P1/P2 Findingなし

## Verification (Cycle 10 Take1, Dex P4)

- frontend test(全体): 135/135 PASS（2回連続、138.22秒 / 132.14秒）
- time utils: 33/33 PASS
- frontend build: PASS（バンドルハッシュ前回と同一、実装コード無変更のため想定通り）
- `git diff --check`: PASS（CRLF/LF警告のみ）
- デクスクルー: 2名使用。React導線は問題なし、レスポンシブUIにP2を2件確認
- ブラウザ実機確認: 320/375/768/769/1280pxを確認。ルール設定の下余白80pxとハンバーガー32×32pxを実測

### 参考: Take2差し戻し時点(Dex P4)のNG実測

- frontend test: NG（Cycle 8希望休テスト3件timeout）
- Cycle 8単独: 20/21 PASS、1件timeout（23.9秒）
- Cycle 7ズーム単独: timeout（24.9秒）
- Cycle 9単独: 56/56 PASS（73.0秒）

## Read First

- `AGENTS.md`
- `docs/handoff/CURRENT_STATUS.md`
- `manuals/STARTUP_CHECKLIST.md`
- `docs/PROJECT_RULES.md`
- `docs/handoff/WORKFLOW_RULES.md`
- `docs/handoff/P4_Rollback/cycle_10_take2.md`

## Stop Conditions

以下の場合は推測で進めず、人間へ確認する。

- 月間目標配置時間を給与・法定労働時間・残業判定へ使う必要が生じた
- バックエンドAPI、DB、保存形式の破壊的変更が必要になった
- シフト自動生成ロジックを変更する必要が生じた
- Git conflictが発生した
- `.env`、パスワード、個人情報、本物データを扱う
