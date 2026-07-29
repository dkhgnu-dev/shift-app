import { describe, it, expect } from 'vitest';
import {
    classifyPointerUp,
    buildFreeTimeShiftId,
    isValidFreeTimeRange,
    buildCellForSave,
    buildRequestsFromMatrix,
    swapMatrixCells,
    pushSnapshot,
    undoStep,
    redoStep,
    HISTORY_MAX_SIZE,
} from './cycle9Utils';

// Cycle9: 純粋関数の恒久テスト。DOM/イベントに依存しないため高速に実行できる。

describe('classifyPointerUp (短タップ/スワイプ判定)', () => {
    it('8px未満の移動・350ms以内は短タップとして扱う', () => {
        expect(classifyPointerUp({ distancePx: 3, durationMs: 100, wasCancelled: false, hadMultiplePointers: false, pointerIdMismatch: false })).toBe('tap');
    });

    it('30px横スワイプ(8px以上の移動)は破棄する', () => {
        expect(classifyPointerUp({ distancePx: 30, durationMs: 100, wasCancelled: false, hadMultiplePointers: false, pointerIdMismatch: false })).toBe('discard');
    });

    it('ちょうど8pxの移動は破棄する(8px「以上」)', () => {
        expect(classifyPointerUp({ distancePx: 8, durationMs: 100, wasCancelled: false, hadMultiplePointers: false, pointerIdMismatch: false })).toBe('discard');
    });

    it('pointercancelは破棄する', () => {
        expect(classifyPointerUp({ distancePx: 0, durationMs: 50, wasCancelled: true, hadMultiplePointers: false, pointerIdMismatch: false })).toBe('discard');
    });

    it('複数指(マルチタッチ)は破棄する', () => {
        expect(classifyPointerUp({ distancePx: 0, durationMs: 50, wasCancelled: false, hadMultiplePointers: true, pointerIdMismatch: false })).toBe('discard');
    });

    it('別pointerへの切替は破棄する', () => {
        expect(classifyPointerUp({ distancePx: 0, durationMs: 50, wasCancelled: false, hadMultiplePointers: false, pointerIdMismatch: true })).toBe('discard');
    });

    it('350msを超える長押しは破棄する', () => {
        expect(classifyPointerUp({ distancePx: 0, durationMs: 400, wasCancelled: false, hadMultiplePointers: false, pointerIdMismatch: false })).toBe('discard');
    });

    it('ちょうど350msは短タップとして許容する(350ms「以内」)', () => {
        expect(classifyPointerUp({ distancePx: 0, durationMs: 350, wasCancelled: false, hadMultiplePointers: false, pointerIdMismatch: false })).toBe('tap');
    });
});

describe('自由時間: buildFreeTimeShiftId / isValidFreeTimeRange', () => {
    it('同じ時間帯は同じIDを再利用できる(安定したID)', () => {
        expect(buildFreeTimeShiftId('10:00', '15:00')).toBe('__custom__10_00_15_00');
        expect(buildFreeTimeShiftId('10:00', '15:00')).toBe(buildFreeTimeShiftId('10:00', '15:00'));
    });

    it('異なる時間帯は異なるIDになる', () => {
        expect(buildFreeTimeShiftId('09:00', '18:00')).not.toBe(buildFreeTimeShiftId('10:00', '15:00'));
    });

    it('00:00 <= start < end <= 24:00 の正常な範囲は有効', () => {
        expect(isValidFreeTimeRange('09:00', '18:00')).toBe(true);
        expect(isValidFreeTimeRange('00:00', '24:00')).toBe(true);
        expect(isValidFreeTimeRange('23:59', '24:00')).toBe(true);
    });

    it('開始時刻に24:00は使えない', () => {
        expect(isValidFreeTimeRange('24:00', '24:00')).toBe(false);
    });

    it('同時刻・逆転は無効', () => {
        expect(isValidFreeTimeRange('10:00', '10:00')).toBe(false);
        expect(isValidFreeTimeRange('15:00', '10:00')).toBe(false);
    });

    it('空欄・不正形式は無効', () => {
        expect(isValidFreeTimeRange('', '18:00')).toBe(false);
        expect(isValidFreeTimeRange('9:00', '')).toBe(false);
        expect(isValidFreeTimeRange('abc', '18:00')).toBe(false);
        expect(isValidFreeTimeRange('25:00', '26:00')).toBe(false);
    });
});

describe('buildCellForSave (セル保存時の正規化)', () => {
    it('空にする場合は{}を返す', () => {
        expect(buildCellForSave({ mode: 'empty' })).toEqual({});
    });

    it('通常シフトはshift/isFixed/isErrorを持ち、hoursを持たない', () => {
        const cell = buildCellForSave({ mode: 'normal', shiftId: '④' });
        expect(cell).toEqual({ shift: '④', isFixed: true, isError: false });
        expect(cell).not.toHaveProperty('hours');
    });

    it('特殊シフトはhoursを持つ', () => {
        const cell = buildCellForSave({ mode: 'special', shiftId: '有休', hours: 4.5 });
        expect(cell).toEqual({ shift: '有休', isFixed: true, isError: false, hours: 4.5 });
    });

    it('注記は前後空白を除去し最大40文字にする', () => {
        const longNote = 'あ'.repeat(50);
        const cell = buildCellForSave({ mode: 'normal', shiftId: '④', note: `  ${longNote}  ` });
        expect(cell.note).toBe('あ'.repeat(40));
    });

    it('注記が空欄ならnoteキー自体を持たない', () => {
        const cell = buildCellForSave({ mode: 'normal', shiftId: '④', note: '   ' });
        expect(cell).not.toHaveProperty('note');
    });
});

describe('buildRequestsFromMatrix (希望休同期の共通関数)', () => {
    it('matrixの「希望休」セルからrequestsを再構築する(重複日付を作らない・ソートする)', () => {
        const employees = [
            { name: 'A', requests: '1, 2, 3' }, // 古いrequestsは無視され、matrix基準で上書きされる
            { name: 'B', requests: '' },
        ];
        const matrix = [
            [{ shift: '希望休' }, {}, { shift: '希望休' }],
            [{}, { shift: '④' }, { shift: '希望休' }],
        ];
        const result = buildRequestsFromMatrix(matrix, employees);
        expect(result[0].requests).toBe('1, 3');
        expect(result[1].requests).toBe('3');
        // 他の項目(name等)は保持される
        expect(result[0].name).toBe('A');
    });

    it('希望休セルが無ければrequestsは空文字になる', () => {
        const employees = [{ name: 'A', requests: '5, 10' }];
        const matrix = [[{ shift: '④' }, { shift: '休' }]];
        const result = buildRequestsFromMatrix(matrix, employees);
        expect(result[0].requests).toBe('');
    });
});

describe('swapMatrixCells (セル交換: セルオブジェクト全体を交換する)', () => {
    it('shift/hours/note/isFixed/isErrorを含む全属性を交換する', () => {
        const matrix = [
            [{ shift: '④', isFixed: true, isError: false }, { shift: '有休', hours: 4, note: 'メモ', isFixed: true, isError: false }],
            [{}, {}],
        ];
        const result = swapMatrixCells(matrix, 0, 0, 0, 1);
        expect(result[0][0]).toEqual({ shift: '有休', hours: 4, note: 'メモ', isFixed: true, isError: false });
        expect(result[0][1]).toEqual({ shift: '④', isFixed: true, isError: false });
    });

    it('異なる従業員間のセルも交換できる', () => {
        const matrix = [
            [{ shift: '④' }],
            [{ shift: '休' }],
        ];
        const result = swapMatrixCells(matrix, 0, 0, 1, 0);
        expect(result[0][0]).toEqual({ shift: '休' });
        expect(result[1][0]).toEqual({ shift: '④' });
    });

    it('同じセル同士の交換は内容が変わらない', () => {
        const matrix = [[{ shift: '④' }]];
        const result = swapMatrixCells(matrix, 0, 0, 0, 0);
        expect(result[0][0]).toEqual({ shift: '④' });
    });

    it('元のmatrixを変更しない(イミュータブル)', () => {
        const original = [[{ shift: '④' }, { shift: '休' }]];
        const result = swapMatrixCells(original, 0, 0, 0, 1);
        expect(original[0][0]).toEqual({ shift: '④' });
        expect(result[0][0]).toEqual({ shift: '休' });
    });
});

describe('Undo/Redo履歴スタック', () => {
    it('21件目のpushSnapshotで最古の1件が破棄され20件に制限される', () => {
        let past = [];
        for (let n = 1; n <= 21; n++) {
            past = pushSnapshot(past, { label: `変更${n}` });
        }
        expect(past.length).toBe(HISTORY_MAX_SIZE);
        expect(past[0].label).toBe('変更2'); // 変更1が破棄されている
        expect(past[past.length - 1].label).toBe('変更21');
    });

    it('undoStepはpastの最後を復元し、現在の状態をfutureの先頭へ積む', () => {
        const past = [{ label: 'A' }, { label: 'B' }];
        const future = [];
        const current = { label: 'current' };
        const result = undoStep(past, future, current);
        expect(result.restored).toEqual({ label: 'B' });
        expect(result.past).toEqual([{ label: 'A' }]);
        expect(result.future).toEqual([{ label: 'current' }]);
    });

    it('pastが空ならundoStepはnullを返す', () => {
        expect(undoStep([], [], { label: 'current' })).toBeNull();
    });

    it('redoStepはfutureの先頭を復元し、現在の状態をpastへ積む', () => {
        const past = [{ label: 'A' }];
        const future = [{ label: 'B' }, { label: 'C' }];
        const current = { label: 'current' };
        const result = redoStep(past, future, current);
        expect(result.restored).toEqual({ label: 'B' });
        expect(result.future).toEqual([{ label: 'C' }]);
        expect(result.past).toEqual([{ label: 'A' }, { label: 'current' }]);
    });

    it('futureが空ならredoStepはnullを返す', () => {
        expect(redoStep([{ label: 'A' }], [], { label: 'current' })).toBeNull();
    });

    it('undo→redoで元の状態に戻る(3状態の往復)', () => {
        let past = [];
        let future = [];
        const stateA = { value: 'A' };
        const stateB = { value: 'B' };

        past = pushSnapshot(past, stateA);
        let current = stateB;

        const undoResult = undoStep(past, future, current);
        past = undoResult.past;
        future = undoResult.future;
        current = undoResult.restored;
        expect(current).toEqual(stateA);

        const redoResult = redoStep(past, future, current);
        past = redoResult.past;
        future = redoResult.future;
        current = redoResult.restored;
        expect(current).toEqual(stateB);
        expect(future).toEqual([]);
    });
});
