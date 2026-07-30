import { describe, it, expect } from 'vitest';
import {
    parseShiftRange,
    isWorkingCell,
    buildHealthAlerts,
    formatRestMinutesAsLabel,
    extractSurname,
    CONSECUTIVE_WARNING_THRESHOLD,
} from './cycle11Utils';

// Cycle11 P2確定仕様(docs/handoff/P2_Dex_to_CC/cycle_11_health_and_collapsible_instructions.md)
// の純粋関数を検証する恒久テスト。App結合テストは別ファイル(App.cycle11.test.jsx)。

const MASTER = {
    'A': '9:00～17:00',
    'E22': '14:00～22:00', // 終了22:00
    'E21': '13:00～21:00', // 終了21:00
    'E24': '15:30～24:00', // 終了24:00
    'S815': '8:15～17:00', // 開始8:15
    'S900': '9:00～18:00', // 開始9:00
};

const A = { shift: 'A' };
const OFF = { shift: '休' };
const EMPTY = {};
const HOPE_OFF = { shift: '希望休' };
const KOKYU = { shift: '公休' };
const YUKYU = { shift: '有休' };
const OUEN = { shift: '応援' };
const TENCHOKAI = { shift: '店長会' };
const KENSHU = { shift: '研修' };
const BENKYOKAI = { shift: '勉強会' };
const UNKNOWN_ID = { shift: 'GHOST_ID_DELETED' };

function row(...cells) { return cells; }

describe('cycle11Utils: isWorkingCell / parseShiftRange (3.1)', () => {
    it('通常シフトは勤務日として扱う', () => {
        expect(isWorkingCell(A, MASTER)).toBe(true);
    });

    it('休・空・希望休・公休・有休は非勤務日として扱う', () => {
        expect(isWorkingCell(OFF, MASTER)).toBe(false);
        expect(isWorkingCell(EMPTY, MASTER)).toBe(false);
        expect(isWorkingCell(null, MASTER)).toBe(false);
        expect(isWorkingCell(HOPE_OFF, MASTER)).toBe(false);
        expect(isWorkingCell(KOKYU, MASTER)).toBe(false);
        expect(isWorkingCell(YUKYU, MASTER)).toBe(false);
    });

    it('応援・店長会・研修・勉強会は勤務日(連勤計上対象)として扱う', () => {
        expect(isWorkingCell(OUEN, MASTER)).toBe(true);
        expect(isWorkingCell(TENCHOKAI, MASTER)).toBe(true);
        expect(isWorkingCell(KENSHU, MASTER)).toBe(true);
        expect(isWorkingCell(BENKYOKAI, MASTER)).toBe(true);
    });

    it('削除済み・未知IDは安全側で非勤務として扱う', () => {
        expect(isWorkingCell(UNKNOWN_ID, MASTER)).toBe(false);
        expect(parseShiftRange(UNKNOWN_ID, MASTER)).toBeNull();
    });

    it('特殊シフト(応援等)はparseShiftRangeでnull(時刻解析対象外)を返す', () => {
        expect(parseShiftRange(OUEN, MASTER)).toBeNull();
    });

    // Take2(Dex P4差戻し): 正しい"開始～終了"のちょうど2要素だけを受理し、
    // 区切り過多・空要素・分範囲外・終了<=開始はすべてnull(判定不能)として拒否する。
    it('正しい"8:15～17:30"は従来どおり勤務として判定する', () => {
        const master = { X: '8:15～17:30' };
        expect(parseShiftRange({ shift: 'X' }, master)).toEqual({ startMin: 495, endMin: 1050 });
        expect(isWorkingCell({ shift: 'X' }, master)).toBe(true);
    });

    it.each([
        ['区切り文字が複数ある壊れた時刻("8:15～17:30～不正値")', '8:15～17:30～不正値'],
        ['終了が欠落("8:15～")', '8:15～'],
        ['開始が欠落("～17:30")', '～17:30'],
        ['分が範囲外("8:60～17:30")', '8:60～17:30'],
        ['終了<=開始("17:30～8:15")', '17:30～8:15'],
    ])('%sはparseShiftRangeでnull、isWorkingCellでも非勤務として安全側に倒す', (_label, timeStr) => {
        const master = { X: timeStr };
        const cell = { shift: 'X' };
        expect(parseShiftRange(cell, master)).toBeNull();
        expect(isWorkingCell(cell, master)).toBe(false);
    });

    it('壊れた時刻を挟むとbuildHealthAlertsで6連勤が継続しない(連勤カウンタが切れる)', () => {
        const master = { A: '9:00～17:00', X: '8:15～17:30～不正値' };
        const matrix = [[{ shift: 'A' }, { shift: 'A' }, { shift: 'A' }, { shift: 'A' }, { shift: 'A' }, { shift: 'X' }, { shift: 'A' }]];
        const alerts = buildHealthAlerts(matrix, master);
        expect(alerts[0][5].consecutiveDays).toBeNull(); // 壊れた時刻のセル自体は非勤務扱い
        expect(alerts[0][6].consecutiveDays).toBeNull(); // リセット後1日目なので警告なし(6連勤にならない)
    });
});

describe('cycle11Utils: buildHealthAlerts 連勤警告 (3.2)', () => {
    it('5連勤では警告が出ない', () => {
        const matrix = [row(A, A, A, A, A)];
        const alerts = buildHealthAlerts(matrix, MASTER);
        alerts[0].forEach(a => expect(a.consecutiveDays).toBeNull());
    });

    it('6連勤では6日目だけに警告が出る', () => {
        const matrix = [row(A, A, A, A, A, A)];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0].slice(0, 5).every(a => a.consecutiveDays === null)).toBe(true);
        expect(alerts[0][5].consecutiveDays).toBe(6);
    });

    it('7連勤では6日目・7日目に警告が出る', () => {
        const matrix = [row(A, A, A, A, A, A, A)];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0].slice(0, 5).every(a => a.consecutiveDays === null)).toBe(true);
        expect(alerts[0][5].consecutiveDays).toBe(6);
        expect(alerts[0][6].consecutiveDays).toBe(7);
    });

    it.each([
        ['休', OFF],
        ['空', EMPTY],
        ['希望休', HOPE_OFF],
        ['公休', KOKYU],
        ['有休', YUKYU],
    ])('%sを挟むと連勤カウンタがリセットされる', (_label, offCell) => {
        const matrix = [row(A, A, A, A, A, offCell, A)];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0][5].consecutiveDays).toBeNull();
        expect(alerts[0][6].consecutiveDays).toBeNull(); // リセット後1日目なので警告なし
    });

    it('応援・店長会・研修・勉強会だけの6日連続でも6日目に警告が出る(連勤へ計上)', () => {
        const matrix = [row(OUEN, TENCHOKAI, KENSHU, BENKYOKAI, OUEN, TENCHOKAI)];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0][5].consecutiveDays).toBe(6);
    });

    it('削除済み・未知IDは非勤務として連勤カウンタをリセットする', () => {
        const matrix = [row(A, A, A, A, A, UNKNOWN_ID, A)];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0][5].consecutiveDays).toBeNull();
    });

    it('しきい値はoptionsで変更できる', () => {
        const matrix = [row(A, A, A)];
        const alerts = buildHealthAlerts(matrix, MASTER, { consecutiveThreshold: 3 });
        expect(alerts[0][2].consecutiveDays).toBe(3);
        expect(CONSECUTIVE_WARNING_THRESHOLD).toBe(6);
    });
});

describe('cycle11Utils: buildHealthAlerts 休息不足警告 (3.3)', () => {
    it('22:00→翌8:15(10時間15分)は警告あり', () => {
        const matrix = [row({ shift: 'E22' }, { shift: 'S815' })];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0][1].restShortMinutes).toBe(615);
        expect(formatRestMinutesAsLabel(alerts[0][1].restShortMinutes)).toBe('10時間15分');
    });

    it('21:00→翌8:15(11時間15分)は警告なし', () => {
        const matrix = [row({ shift: 'E21' }, { shift: 'S815' })];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0][1].restShortMinutes).toBeNull();
    });

    it('22:00→翌9:00(ちょうど11時間)は警告なし', () => {
        const matrix = [row({ shift: 'E22' }, { shift: 'S900' })];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0][1].restShortMinutes).toBeNull();
    });

    it('24:00→翌9:00(9時間)は警告あり', () => {
        const matrix = [row({ shift: 'E24' }, { shift: 'S900' })];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0][1].restShortMinutes).toBe(540);
    });

    it.each([
        ['前日が非勤務(休)', OFF, { shift: 'S815' }],
        ['前日が特殊(応援)', OUEN, { shift: 'S815' }],
        ['翌日が特殊(店長会)', { shift: 'E22' }, TENCHOKAI],
        ['翌日が非勤務(空)', { shift: 'E22' }, EMPTY],
    ])('%sなら休息判定をしない', (_label, prevCell, currCell) => {
        const matrix = [row(prevCell, currCell)];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0][1].restShortMinutes).toBeNull();
    });

    it('片方が未知IDでも休息判定をしない', () => {
        const matrix = [row(UNKNOWN_ID, { shift: 'S815' })];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0][1].restShortMinutes).toBeNull();
    });

    it('6連勤警告と休息不足警告は同一セルに同居できる', () => {
        // E22(終了22:00)を6日連続、7日目にS815(開始8:15)を置く -> 7日目に両方の警告
        const matrix = [row({ shift: 'A' }, { shift: 'A' }, { shift: 'A' }, { shift: 'A' }, { shift: 'A' }, { shift: 'E22' }, { shift: 'S815' })];
        const alerts = buildHealthAlerts(matrix, MASTER);
        expect(alerts[0][6].consecutiveDays).toBe(7);
        expect(alerts[0][6].restShortMinutes).toBe(615);
    });
});

describe('cycle11Utils: extractSurname (5.3)', () => {
    it('nullや未定義は空文字を返す', () => {
        expect(extractSurname(null)).toBe('');
        expect(extractSurname(undefined)).toBe('');
        expect(extractSurname('')).toBe('');
        expect(extractSurname('   ')).toBe('');
    });

    it('半角スペースがあれば最初の語を名字とする', () => {
        expect(extractSurname('鈴木 花子')).toBe('鈴木');
    });

    it('全角スペースがあれば最初の語を名字とする', () => {
        expect(extractSurname('鈴木　花子')).toBe('鈴木');
    });

    it('スペースがない名前はUnicode文字単位で先頭最大4文字を返す', () => {
        expect(extractSurname('K.D.')).toBe('K.D.');
        expect(extractSurname('T.M.(1)')).toBe('T.M.');
    });

    it('前後の空白は除去してから判定する', () => {
        expect(extractSurname('  鈴木 花子  ')).toBe('鈴木');
    });
});
