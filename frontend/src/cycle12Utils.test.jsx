import { describe, it, expect } from 'vitest';
import {
    isProtectedCellForGenerate,
    buildProtectedFixedAssignments,
    reconcileGeneratedMatrix,
    buildStampCandidates,
    isStampAllowedForEmployee,
    isStampNoOp,
    buildStampedCell,
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

describe('cycle12Utils: buildStampCandidates (5.1)', () => {
    it('休・希望休は常に候補へ含まれる(通常シフト0件でも)', () => {
        const candidates = buildStampCandidates({});
        const ids = candidates.map(c => c.shiftId);
        expect(ids).toEqual(['休', '希望休']);
    });

    it('通常シフトと自由時間が候補へ含まれ、勤務時間入力が必要な特殊シフトは含まれない', () => {
        const shiftMaster = { '④': '8:15～17:30', '__custom__10_00_15_00': '10:00～15:00' };
        const candidates = buildStampCandidates(shiftMaster);
        const ids = candidates.map(c => c.shiftId);
        expect(ids).toContain('④');
        expect(ids).toContain('__custom__10_00_15_00');
        expect(ids).not.toContain('有休');
        expect(ids).not.toContain('応援');
    });
});

describe('cycle12Utils: isStampAllowedForEmployee (5.2)', () => {
    it('休・希望休は常に許可', () => {
        expect(isStampAllowedForEmployee('休', [])).toBe(true);
        expect(isStampAllowedForEmployee('希望休', [])).toBe(true);
    });
    it('自由時間は常に許可', () => {
        expect(isStampAllowedForEmployee('__custom__10_00_15_00', [])).toBe(true);
    });
    it('通常シフトは対象従業員の許可シフトのみ許可', () => {
        expect(isStampAllowedForEmployee('④', ['④', '⑦'])).toBe(true);
        expect(isStampAllowedForEmployee('①', ['④', '⑦'])).toBe(false);
    });
});

describe('cycle12Utils: isStampNoOp / buildStampedCell (5.2)', () => {
    it('同じシフトを同じセルへ重ねた場合はno-op', () => {
        expect(isStampNoOp({ shift: '④', note: 'メモ' }, '④')).toBe(true);
    });
    it('異なるシフトまたは空セルはno-opではない', () => {
        expect(isStampNoOp({ shift: '④' }, '⑦')).toBe(false);
        expect(isStampNoOp(null, '④')).toBe(false);
        expect(isStampNoOp({}, '④')).toBe(false);
    });
    it('スタンプで書くセルは常にisFixed:trueの確定セル', () => {
        expect(buildStampedCell('④')).toEqual({ shift: '④', isFixed: true, isError: false });
    });
});
