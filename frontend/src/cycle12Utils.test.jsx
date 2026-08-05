import { describe, it, expect } from 'vitest';
import {
    isProtectedCellForGenerate,
    buildProtectedFixedAssignments,
    reconcileGeneratedMatrix,
    buildStampCandidates,
    isStampAllowedForEmployee,
    isStampToggleClear,
    isEraseStamp,
    isEraseNoOp,
    isSpecialStampShift,
    resolveStampHours,
    buildStampedCell,
    ERASE_STAMP_ID,
    SPECIAL_STAMP_SHIFT_IDS,
    SPECIAL_STAMP_DEFAULT_HOURS,
} from './cycle12Utils';

// Cycle12 P2確定仕様(docs/handoff/P2_Dex_to_CC/cycle_12_protection_and_stamp_instructions.md)
// の純粋関数を検証する恒久テスト。App結合テストは別ファイル(App.cycle12.test.jsx)。

describe('cycle12Utils: isProtectedCellForGenerate (2.1)', () => {
    it('isFixed:trueのセルは保護対象', () => {
        expect(isProtectedCellForGenerate({ shift: '④', isFixed: true })).toBe(true);
    });
    it('isFixed:falseの自動生成セルは保護対象外(再最適化を許可)', () => {
        expect(isProtectedCellForGenerate({ shift: '④', isFixed: false })).toBe(false);
    });
    it('isFixed未設定(旧localStorage)は安全側で保護対象', () => {
        expect(isProtectedCellForGenerate({ shift: '④' })).toBe(true);
    });
    it('shiftが無いセル・null・空セルは保護対象外', () => {
        expect(isProtectedCellForGenerate(null)).toBe(false);
        expect(isProtectedCellForGenerate({})).toBe(false);
        expect(isProtectedCellForGenerate({ shift: '' })).toBe(false);
    });
});

describe('cycle12Utils: buildProtectedFixedAssignments (2.1/2.2)', () => {
    it('isFixed:trueのセルだけをfixed_assignmentsへ抽出し、isFixed:falseは除外する', () => {
        const matrix = [
            [{ shift: '④', isFixed: true }, { shift: '⑦', isFixed: false }, {}],
        ];
        const { fixedAssignments } = buildProtectedFixedAssignments(matrix, ['emp_0']);
        expect(fixedAssignments).toEqual([{ employee_id: 'emp_0', day_index: 0, shift_id: '④' }]);
    });

    it('休・希望休はOFFとして送る', () => {
        const matrix = [
            [{ shift: '休', isFixed: true }, { shift: '希望休', isFixed: true }],
        ];
        const { fixedAssignments } = buildProtectedFixedAssignments(matrix, ['emp_0']);
        expect(fixedAssignments).toEqual([
            { employee_id: 'emp_0', day_index: 0, shift_id: 'OFF' },
            { employee_id: 'emp_0', day_index: 1, shift_id: 'OFF' },
        ]);
    });

    it('保護座標ごとに元のセルオブジェクトをスナップショットする(応答再合成用)', () => {
        const cell = { shift: '有休', hours: 6, note: 'メモ', isFixed: true, isError: false };
        const matrix = [[cell]];
        const { protectedCellsByCoord } = buildProtectedFixedAssignments(matrix, ['emp_0']);
        expect(protectedCellsByCoord[0][0]).toBe(cell); // 同一参照(丸ごと再合成できること)
    });

    it('重複座標を生成しない(1セル1件)', () => {
        const matrix = [[{ shift: '④', isFixed: true }]];
        const { fixedAssignments } = buildProtectedFixedAssignments(matrix, ['emp_0']);
        expect(fixedAssignments.length).toBe(1);
    });
});

describe('cycle12Utils: reconcileGeneratedMatrix (2.3)', () => {
    it('保護座標は元オブジェクトを丸ごと復元し、それ以外はバックエンド応答から新規セルを作る', () => {
        const protectedCell = { shift: '有休', hours: 6, note: 'メモ', isFixed: true, isError: false };
        const protectedCellsByCoord = { 0: { 1: protectedCell } };
        const empShiftsList = [['④', '有休', '休']];
        const result = reconcileGeneratedMatrix(empShiftsList, protectedCellsByCoord);
        expect(result[0][0]).toEqual({ shift: '④', isError: false, isFixed: false });
        expect(result[0][1]).toBe(protectedCell); // hours/note/isFixed/isErrorすべて保持
        expect(result[0][2]).toEqual({ shift: '休', isError: false, isFixed: false });
    });
});

describe('cycle12Utils: buildStampCandidates (5.1, Cycle13で拡張)', () => {
    it('休・希望休・消しゴム・特殊シフト4種は常に候補へ含まれる(通常シフト0件でも)', () => {
        const candidates = buildStampCandidates({});
        const ids = candidates.map(c => c.shiftId);
        expect(ids).toEqual(['休', '希望休', ERASE_STAMP_ID, ...SPECIAL_STAMP_SHIFT_IDS]);
    });

    it('「休」が先頭のまま維持される(スタンプモードON時の既定選択候補)', () => {
        const candidates = buildStampCandidates({ '④': '8:15～17:30' });
        expect(candidates[0].shiftId).toBe('休');
    });

    it('通常シフトと自由時間も候補へ含まれ、研修・公休など今回指定外の特殊シフトは含まれない', () => {
        const shiftMaster = { '④': '8:15～17:30', '__custom__10_00_15_00': '10:00～15:00' };
        const candidates = buildStampCandidates(shiftMaster);
        const ids = candidates.map(c => c.shiftId);
        expect(ids).toContain('④');
        expect(ids).toContain('__custom__10_00_15_00');
        expect(ids).toContain('有休');
        expect(ids).toContain('応援');
        expect(ids).toContain('勉強会');
        expect(ids).toContain('店長会');
        expect(ids).not.toContain('研修');
        expect(ids).not.toContain('公休');
    });
});

describe('cycle12Utils: isStampAllowedForEmployee (5.2, Cycle13で拡張)', () => {
    it('休・希望休は常に許可', () => {
        expect(isStampAllowedForEmployee('休', [])).toBe(true);
        expect(isStampAllowedForEmployee('希望休', [])).toBe(true);
    });
    it('自由時間は常に許可', () => {
        expect(isStampAllowedForEmployee('__custom__10_00_15_00', [])).toBe(true);
    });
    it('消しゴムは常に許可', () => {
        expect(isStampAllowedForEmployee(ERASE_STAMP_ID, [])).toBe(true);
    });
    it('特殊シフトスタンプ4種は許可シフト一覧に含まれなくても常に許可', () => {
        SPECIAL_STAMP_SHIFT_IDS.forEach(id => {
            expect(isStampAllowedForEmployee(id, [])).toBe(true);
        });
    });
    it('通常シフトは対象従業員の許可シフトのみ許可', () => {
        expect(isStampAllowedForEmployee('④', ['④', '⑦'])).toBe(true);
        expect(isStampAllowedForEmployee('①', ['④', '⑦'])).toBe(false);
    });
});

describe('cycle12Utils: isStampToggleClear (Cycle13 3)', () => {
    it('同じシフトを同じセルへ重ねた場合は消去対象', () => {
        expect(isStampToggleClear({ shift: '④', note: 'メモ' }, '④')).toBe(true);
    });
    it('異なるシフトまたは空セルは消去対象ではない', () => {
        expect(isStampToggleClear({ shift: '④' }, '⑦')).toBe(false);
        expect(isStampToggleClear(null, '④')).toBe(false);
        expect(isStampToggleClear({}, '④')).toBe(false);
    });
});

describe('cycle12Utils: isEraseStamp / isEraseNoOp (Cycle13 4)', () => {
    it('消しゴムIDだけを消しゴムとして判定する', () => {
        expect(isEraseStamp(ERASE_STAMP_ID)).toBe(true);
        expect(isEraseStamp('④')).toBe(false);
        expect(isEraseStamp('__custom__10_00_15_00')).toBe(false);
    });
    it('空欄セルを選んだ場合だけno-op(消しゴムの真のno-op判定)', () => {
        expect(isEraseNoOp(null)).toBe(true);
        expect(isEraseNoOp({})).toBe(true);
        expect(isEraseNoOp({ shift: '' })).toBe(true);
        expect(isEraseNoOp({ shift: '④' })).toBe(false);
        expect(isEraseNoOp({ shift: '希望休' })).toBe(false);
    });
});

describe('cycle12Utils: isSpecialStampShift (Cycle13 4-1)', () => {
    it('有休・応援・勉強会・店長会だけを特殊シフトスタンプとして判定する', () => {
        SPECIAL_STAMP_SHIFT_IDS.forEach(id => expect(isSpecialStampShift(id)).toBe(true));
        expect(isSpecialStampShift('研修')).toBe(false);
        expect(isSpecialStampShift('公休')).toBe(false);
        expect(isSpecialStampShift('④')).toBe(false);
    });
});

describe('cycle12Utils: resolveStampHours (Cycle13 4-1 Take2: 固定8h)', () => {
    it('特殊シフトスタンプ4種はすべて固定8hを返す', () => {
        expect(SPECIAL_STAMP_DEFAULT_HOURS).toBe(8);
        SPECIAL_STAMP_SHIFT_IDS.forEach(id => {
            expect(resolveStampHours(id)).toBe(8);
        });
    });
    it('通常シフト・自由時間・休・希望休・消しゴムはhoursを持たせない', () => {
        ['①', '③', '__custom__1', '休', '希望休', ERASE_STAMP_ID].forEach(id => {
            expect(resolveStampHours(id)).toBeUndefined();
        });
    });
    it('shiftMasterを一切参照しない純粋関数である(①/③の設定に依存しない)', () => {
        // 引数はshiftIdのみ。①や③をどう変えても呼び出し結果が変わる余地がない。
        expect(resolveStampHours.length).toBe(1);
        SPECIAL_STAMP_SHIFT_IDS.forEach(id => expect(resolveStampHours(id)).toBe(8));
    });
});

describe('cycle12Utils: buildStampedCell (5.2, Cycle13でhours対応)', () => {
    it('hours省略時は従来どおりisFixed:trueの確定セルのみ', () => {
        expect(buildStampedCell('④')).toEqual({ shift: '④', isFixed: true, isError: false });
    });
    it('hoursが有限数の場合は明示保存する(特殊シフトスタンプ用)', () => {
        expect(buildStampedCell('有休', 8)).toEqual({ shift: '有休', isFixed: true, isError: false, hours: 8 });
    });
    it('hoursが非数値・非有限の場合は保存しない', () => {
        expect(buildStampedCell('④', undefined)).not.toHaveProperty('hours');
        expect(buildStampedCell('④', NaN)).not.toHaveProperty('hours');
    });
});
