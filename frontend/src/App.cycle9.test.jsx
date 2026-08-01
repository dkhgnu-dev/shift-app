import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Cycle9: セル直接編集・スワップ交換・Undo/Redoの恒久コンポーネントテスト。
// Dex P2指示により、24名×31日の巨大DOMを避け、小さな2名×αのfixtureを使う。

function setViewportWidth(width) {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

function seedSmallFixture(matrixOverride) {
    const employees = [
        { name: '太郎', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④', '⑦'], requests: '', targetHours: null },
        { name: '花子', type: '準社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
    ];
    window.localStorage.setItem('shift_employees', JSON.stringify(employees));
    if (matrixOverride) {
        window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix: matrixOverride, hasError: false, warnings: [], isWarningDraft: false, violations: [] }));
    }
}

function readMatrix() {
    const raw = window.localStorage.getItem('shift_generatedResult');
    if (!raw) return null;
    return JSON.parse(raw).matrix;
}

// dayCountは実行時の対象期間に依存するため、テストでは十分に大きい固定長で埋めておく。
const DAY_COUNT = 31;
function blankRow() {
    return Array.from({ length: DAY_COUNT }, () => ({}));
}

function getCellButton(rowIndex, dayIndex) {
    const table = document.querySelector('table');
    const row = table.querySelectorAll('tbody tr')[rowIndex];
    // drag-col + name-col の次から日付セルが始まる
    const dayTds = Array.from(row.querySelectorAll('td')).slice(2);
    return dayTds[dayIndex].querySelector('button');
}

// 編集画面内のシフト選択<select>を取得する(現在値に関わらず一意に取得できる)。
function getShiftSelect() {
    return document.querySelector('.modal select');
}

beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1280);
});

afterEach(() => {
    setViewportWidth(1280);
    vi.restoreAllMocks();
});

describe('セル編集画面の入口 (Cycle9)', () => {
    it('透明selectは存在せず、セルにbuttonが1つずつある', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const table = document.querySelector('table');
        expect(table.querySelectorAll('select').length).toBe(0);
        const firstRow = table.querySelectorAll('tbody tr')[0];
        const dayTds = Array.from(firstRow.querySelectorAll('td')).slice(2);
        dayTds.forEach(td => {
            expect(td.querySelectorAll('button').length).toBe(1);
        });
    });

    it('クリック(マウス)で編集画面が1回だけ開く', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        fireEvent.click(btn);
        expect(screen.getAllByText(/太郎.*の勤務を編集/).length).toBe(1);
    });

    it('Enterキー(キーボード)で編集画面が開く', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        btn.focus();
        fireEvent.click(btn, { detail: 0 }); // ネイティブbuttonのEnter/Spaceはdetail:0のclickとして発火する
        expect(screen.getByText(/太郎.*の勤務を編集/)).toBeInTheDocument();
    });

    it('8px未満・350ms以内の短タップ(pointerdown/up)で編集画面が開く', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        fireEvent.pointerDown(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn, { pointerId: 1, clientX: 102, clientY: 101 });
        expect(screen.getByText(/太郎.*の勤務を編集/)).toBeInTheDocument();
    });

    it('30px横スワイプ(8px以上の移動)では編集画面が開かない', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        fireEvent.pointerDown(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn, { pointerId: 1, clientX: 130, clientY: 100 });
        expect(screen.queryByText(/太郎.*の勤務を編集/)).not.toBeInTheDocument();
    });

    it('pointercancelでは編集画面が開かない', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        fireEvent.pointerDown(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerCancel(btn, { pointerId: 1 });
        fireEvent.pointerUp(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        expect(screen.queryByText(/太郎.*の勤務を編集/)).not.toBeInTheDocument();
    });

    it('768pxはスマホ方式、769pxはPC方式で表示が切り替わる', () => {
        setViewportWidth(768);
        const { unmount } = render(<App />);
        expect(document.querySelector('th.name-col').textContent).toBe('氏名');
        unmount();

        setViewportWidth(769);
        render(<App />);
        expect(document.querySelector('th.name-col').textContent).toBe('従業員');
    });
});

describe('セル編集の保存/キャンセル/空にする (Cycle9)', () => {
    it('保存すると選択したシフトがmatrixへ反映され、Undoが有効になる', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(readMatrix()[0][0].shift).toBe('④');
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).not.toBeDisabled();
    });

    it('キャンセルするとmatrixは変更されない', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

        expect(readMatrix()[0][0]).toEqual({});
    });

    it('同値保存(未設定のまま保存)ではmatrixも履歴も変更しない', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
    });

    it('「セルを空にする」で確定シフトを空セルへ戻せる', () => {
        seedSmallFixture([[{ shift: '④', isFixed: true, isError: false }, ...blankRow().slice(1)], blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('button', { name: 'セルを空にする' }));

        expect(readMatrix()[0][0]).toEqual({});
    });

    it('注記を保存すると次回開いたときに引き継がれる', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.change(screen.getByPlaceholderText('例: 早退18:00まで'), { target: { value: '早退17:00' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(readMatrix()[0][0].note).toBe('早退17:00');

        fireEvent.click(getCellButton(0, 0));
        expect(screen.getByPlaceholderText('例: 早退18:00まで').value).toBe('早退17:00');
    });
});

describe('自由時間 (Cycle9)', () => {
    it('自由時間を保存すると、shiftMasterへ登録され集計・表示に反映される', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('checkbox', { name: '自由時間を入力する' }));
        // TimePickerは直接inputを持たないため、中央表示をクリックして4桁入力する
        const timeValues = screen.getAllByTitle('タップして「0930」のように4桁で直接入力');
        fireEvent.click(timeValues[0]);
        fireEvent.change(document.querySelector('.time-picker-input'), { target: { value: '1000' } });
        fireEvent.keyDown(document.querySelector('.time-picker-input'), { key: 'Enter' });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        const cell = readMatrix()[0][0];
        expect(cell.shift).toBe('__custom__10_00_18_00');
    });

    it('不正な自由時間(逆転)は保存を拒否し、編集画面を閉じない', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('checkbox', { name: '自由時間を入力する' }));
        const timeValues = screen.getAllByTitle('タップして「0930」のように4桁で直接入力');
        fireEvent.click(timeValues[1]); // 終了側を開始より前へ設定して逆転させる
        fireEvent.change(document.querySelector('.time-picker-input'), { target: { value: '0800' } });
        fireEvent.keyDown(document.querySelector('.time-picker-input'), { key: 'Enter' });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(window.alert).toHaveBeenCalled();
        expect(screen.getByText(/太郎.*の勤務を編集/)).toBeInTheDocument(); // 編集画面は閉じない
        expect(readMatrix()[0][0]).toEqual({}); // 何も変更されない
    });
});

describe('セル交換 (Cycle9)', () => {
    it('編集画面の「交換」→別セルタップでスワップされる(shift/hours/noteを含む全属性)', () => {
        const row0 = [{ shift: '④', isFixed: true, isError: false }, { shift: '有休', hours: 6, note: 'メモ', isFixed: true, isError: false }, ...blankRow().slice(2)];
        seedSmallFixture([row0, blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('button', { name: /このシフトを交換/ }));
        expect(screen.getByText(/交換する相手のセルをタップ/)).toBeInTheDocument();

        fireEvent.click(getCellButton(0, 1));

        const matrix = readMatrix();
        expect(matrix[0][0]).toEqual({ shift: '有休', hours: 6, note: 'メモ', isFixed: true, isError: false });
        expect(matrix[0][1]).toEqual({ shift: '④', isFixed: true, isError: false });
    });

    it('同じセルを再タップすると交換をキャンセルする', () => {
        const row0 = [{ shift: '④', isFixed: true, isError: false }, {}, ...blankRow().slice(2)];
        seedSmallFixture([row0, blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('button', { name: /このシフトを交換/ }));
        fireEvent.click(getCellButton(0, 0)); // 同じセルを再タップ

        expect(screen.queryByText(/交換する相手のセルをタップ/)).not.toBeInTheDocument();
        expect(readMatrix()[0][0].shift).toBe('④'); // 変更されない
    });

    it('PCのdrag&dropでもセルを交換できる(行の並べ替えdragとは別種別)', () => {
        const row0 = [{ shift: '④', isFixed: true, isError: false }, {}, ...blankRow().slice(2)];
        seedSmallFixture([row0, blankRow()]);
        render(<App />);
        const source = getCellButton(0, 0).closest('td');
        const target = getCellButton(0, 1).closest('td');

        fireEvent.dragStart(source, { dataTransfer: { setData: () => {}, effectAllowed: '' } });
        fireEvent.dragOver(target, { dataTransfer: {} });
        fireEvent.drop(target, { dataTransfer: {} });

        const matrix = readMatrix();
        expect(matrix[0][1].shift).toBe('④');
        expect(matrix[0][0]).toEqual({});
    });

    it('ダッシュボードの行ドラッグハンドルで従業員を並べ替えても、セル交換は発生しない(dragKindRefによる種別分離)', () => {
        const row0 = [{ shift: '④', isFixed: true, isError: false }, {}, ...blankRow().slice(2)];
        const row1 = [{ shift: '休', isFixed: true, isError: false }, {}, ...blankRow().slice(2)];
        seedSmallFixture([row0, row1]);
        render(<App />);

        const table = document.querySelector('table');
        const rows = table.querySelectorAll('tbody tr');
        const handle0 = rows[0].querySelector('.drag-handle-compact');

        fireEvent.dragStart(handle0);
        fireEvent.dragEnter(rows[1]);
        fireEvent.dragEnd(handle0);

        const stored = JSON.parse(window.localStorage.getItem('shift_employees'));
        expect(stored[0].name).toBe('花子');
        expect(stored[1].name).toBe('太郎');
        // セルの内容は行ごと一緒に入れ替わる(交換ではなく行順の移動)だけで、
        // 各行内のセル自体が交換(スワップ)されたわけではないことを確認する。
        const matrix = readMatrix();
        expect(matrix[0][0].shift).toBe('休'); // 元row1(花子)の内容がそのまま先頭行へ
        expect(matrix[1][0].shift).toBe('④'); // 元row0(太郎)の内容がそのまま2行目へ
    });

    it('従業員管理タブの行dragでも並べ替えができる(PC版テーブル)', () => {
        seedSmallFixture(null);
        render(<App />);
        fireEvent.click(screen.getByText('従業員管理'));

        const rows = document.querySelectorAll('table tbody tr');
        // Take2 P1-4: draggableは行本体ではなく専用ハンドル(.drag-handle-compact)のみに
        // 限定されたため、ハンドル要素からdragStart/dragEndを発火させる。
        const handle0 = rows[0].querySelector('.drag-handle-compact');
        fireEvent.dragStart(handle0);
        fireEvent.dragEnter(rows[1]);
        fireEvent.dragEnd(handle0);

        const stored = JSON.parse(window.localStorage.getItem('shift_employees'));
        expect(stored[0].name).toBe('花子');
        expect(stored[1].name).toBe('太郎');
    });

    // Take2 P1-4(Dex差戻し): 従業員管理タブでも、行本体・編集/削除ボタンからは
    // dragを開始できない(専用ハンドルだけがdraggable)ことを確認する。
    it('従業員管理タブでは行本体や編集/削除ボタンにdraggable属性が付かない(専用ハンドルのみ)', () => {
        seedSmallFixture(null);
        render(<App />);
        fireEvent.click(screen.getByText('従業員管理'));

        const rows = document.querySelectorAll('table tbody tr');
        expect(rows[0]).not.toHaveAttribute('draggable');
        const editBtn = rows[0].querySelectorAll('button')[0];
        expect(editBtn).not.toHaveAttribute('draggable');
        const handle = rows[0].querySelector('.drag-handle-compact');
        expect(handle).toHaveAttribute('draggable', 'true');
    });
});

describe('Undo/Redo (Cycle9)', () => {
    it('Undo/Redoで状態が正しく往復する', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        expect(readMatrix()[0][0].shift).toBe('④');

        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(readMatrix()[0][0]).toEqual({});
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'やり直す(Redo)' })).not.toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'やり直す(Redo)' }));
        expect(readMatrix()[0][0].shift).toBe('④');
        expect(screen.getByRole('button', { name: 'やり直す(Redo)' })).toBeDisabled();
    });

    it('Undo後に新しい変更を行うとRedoが消える', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(screen.getByRole('button', { name: 'やり直す(Redo)' })).not.toBeDisabled();

        fireEvent.click(getCellButton(0, 1));
        fireEvent.change(getShiftSelect(), { target: { value: '休' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(screen.getByRole('button', { name: 'やり直す(Redo)' })).toBeDisabled();
    });

    it('Ctrl+Zでundo、Ctrl+Shift+Zでredoできる(input focus中は横取りしない)', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
        expect(readMatrix()[0][0]).toEqual({});

        fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
        expect(readMatrix()[0][0].shift).toBe('④');
    });

    // 履歴が正確に20件で頭打ちになる境界値そのものは、高速な純粋関数テスト
    // (cycle9Utils.test.jsx「21件目のpushSnapshotで最古の1件が破棄され20件に制限される」)
    // で厳密に検証済み。ここでは24名×31日相当の重いDOM操作を21回繰り返すコストを避け、
    // 実際のUI操作(セル編集の保存)を複数回連続しても履歴が正しく積み上がり、
    // Undoが連続して機能する(結合部分の配線)ことだけを軽量に確認する。
    it('複数回の連続したセル編集後もUndoが連続して正しく機能する(履歴の積み上げ)', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);

        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        fireEvent.click(getCellButton(0, 1));
        fireEvent.change(getShiftSelect(), { target: { value: '休' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        fireEvent.click(getCellButton(1, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(readMatrix()[0][0].shift).toBe('④');
        expect(readMatrix()[0][1].shift).toBe('休');
        expect(readMatrix()[1][0].shift).toBe('④');

        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(readMatrix()[1][0]).toEqual({});
        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(readMatrix()[0][1]).toEqual({});
        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(readMatrix()[0][0]).toEqual({});
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
    });
});

describe('生成中(isGenerating)の操作禁止 (Cycle9)', () => {
    it('isGenerating中はセル編集・Undo/Redoができない', async () => {
        seedSmallFixture([blankRow(), blankRow()]);
        const fetchMock = vi.fn(() => new Promise(() => {})); // 応答が返らない = isGenerating継続
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));

        expect(getCellButton(0, 0)).toBeDisabled();
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'やり直す(Redo)' })).toBeDisabled();
    });
});

describe('希望休同期 (Cycle9)', () => {
    it('セル編集で希望休を設定するとemployees[].requestsへ反映される', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '希望休' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        const stored = JSON.parse(window.localStorage.getItem('shift_employees'));
        expect(stored[0].requests).toBe('1');
    });
});

// ============================================================
// Take2 (Dex P4差し戻し) 必須修正の恒久テスト
// ============================================================

describe('Take2 P1-1: 希望休は生成後も保持される', () => {
    function seedWithRequest(requestsForEmp0) {
        const employees = [
            { name: '太郎', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④', '⑦'], requests: requestsForEmp0, targetHours: null },
            { name: '花子', type: '準社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
    }

    it('生成開始時点で希望休だった日は、成功レスポンスが「休」でも画面へ「希望休」として戻る', async () => {
        seedWithRequest('1');
        const dayCount = 31;
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'SUCCESS',
                shifts: {
                    emp_0: ['休', ...Array(dayCount - 1).fill('④')],
                    emp_1: Array(dayCount).fill('休'),
                },
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(readMatrix()).not.toBeNull());

        expect(readMatrix()[0][0].shift).toBe('希望休'); // '休'のまま消費されない
        const stored = JSON.parse(window.localStorage.getItem('shift_employees'));
        expect(stored[0].requests).toBe('1'); // requestsも保持される
    });

    it('2回連続で生成しても、2回目のpayloadに同じrequests_offが入る', async () => {
        seedWithRequest('1');
        const dayCount = 31;
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'SUCCESS',
                shifts: {
                    emp_0: ['休', ...Array(dayCount - 1).fill('④')],
                    emp_1: Array(dayCount).fill('休'),
                },
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        await vi.waitFor(() => expect(readMatrix()).not.toBeNull());

        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        await vi.waitFor(() => expect(readMatrix()[0][0].shift).toBe('希望休'));

        const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
        const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
        expect(firstBody.requests_off.length).toBe(1);
        expect(secondBody.requests_off).toEqual(firstBody.requests_off); // 1回目と2回目で同じ希望休が送られる
    });

    it('警告付き仮シフトでも希望休を消さない', async () => {
        seedWithRequest('1');
        const dayCount = 31;
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'FEASIBLE_WITH_WARNINGS',
                warnings: ['テスト警告'],
                shifts: {
                    emp_0: ['休', ...Array(dayCount - 1).fill('④')],
                    emp_1: Array(dayCount).fill('休'),
                },
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(readMatrix()).not.toBeNull());

        expect(readMatrix()[0][0].shift).toBe('希望休');
    });

    it('空欄自動作成でも、生成開始時点の希望休日は「希望休」として戻る', async () => {
        seedWithRequest('1');
        const dayCount = 31;
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'SUCCESS',
                shifts: {
                    emp_0: ['休', ...Array(dayCount - 1).fill('④')],
                    emp_1: Array(dayCount).fill('休'),
                },
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /空欄自動作成/ }));
        await vi.waitFor(() => expect(readMatrix()[0][0]?.shift).toBe('希望休'));

        expect(readMatrix()[0][0].shift).toBe('希望休');
    });
});

describe('Take2 P1-2: 自由時間は通常の自動生成候補から除外される', () => {
    // Cycle12 2.2(Dex P2): 通常生成(最適化シフトを生成)でも保護セル(isFixed:true)として
    // 参照中の自由時間IDはfillBlanks()と同じくshift_typesへ許可される(手動配置保護のため)。
    // Cycle11以前は`fixed_assignments: []`固定で自由時間IDが常に完全除外されていたが、
    // それは「手動固定を通常生成が無条件に上書きする」という緊急バグそのものだったため、
    // Cycle12でfillBlanks()と同じ保護方式へ統一した(このテストの旧アサーションは
    // 意図的に反転する)。
    it('通常生成(最適化シフトを生成)でも、保護セル(isFixed:true)で参照中の自由時間IDはshift_typesへ含まれる', async () => {
        const row0 = [{ shift: '__custom__10_00_15_00', isFixed: true, isError: false }, ...blankRow().slice(1)];
        seedSmallFixture([row0, blankRow()]);
        // shiftMasterへ自由時間IDを登録した状態を再現する
        window.localStorage.setItem('shift_custom_master', JSON.stringify({
            '①': '8:15～12:15', '④': '8:15～17:30', '⑦': '15:30～24:00',
            '__custom__10_00_15_00': '10:00～15:00',
        }));
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'SUCCESS', shifts: { emp_0: [], emp_1: [] } }) });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        const customIds = body.shift_types.filter(s => s.id.startsWith('__custom__')).map(s => s.id);
        expect(customIds).toEqual(['__custom__10_00_15_00']);
        const fixedCustom = body.fixed_assignments.find(fa => fa.employee_id === 'emp_0' && fa.day_index === 0);
        expect(fixedCustom).toEqual({ employee_id: 'emp_0', day_index: 0, shift_id: '__custom__10_00_15_00' });
    });

    it('空欄自動作成では、固定セルで参照中の自由時間IDだけがshift_typesへ含まれる(未使用IDは除外)', async () => {
        const row0 = [{ shift: '__custom__10_00_15_00', isFixed: true, isError: false }, ...blankRow().slice(1)];
        seedSmallFixture([row0, blankRow()]);
        window.localStorage.setItem('shift_custom_master', JSON.stringify({
            '①': '8:15～12:15', '④': '8:15～17:30', '⑦': '15:30～24:00',
            '__custom__10_00_15_00': '10:00～15:00', // 使用中
            '__custom__09_00_12_00': '09:00～12:00', // 未使用(過去に作られただけ)
        }));
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'SUCCESS', shifts: { emp_0: [], emp_1: [] } }) });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /空欄自動作成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        const customIds = body.shift_types.filter(s => s.id.startsWith('__custom__')).map(s => s.id);
        expect(customIds).toEqual(['__custom__10_00_15_00']);
    });

    // CCクルー指摘: allowed_shiftsが空だとバックエンドは「全シフト可」と解釈し
    // (shift_solver.py:184-187)、shift_typesに残った自由時間IDまで対象に含まれ得る。
    // employees[].shiftsが空の従業員には、自由時間を除いた通常IDを明示送信することで、
    // バックエンドの「空=全シフト可」フォールバックを発生させないことを確認する。
    it('allowed_shiftsが空の従業員には、自由時間を除いた通常のshiftMaster IDが明示的に送られる', async () => {
        const row0 = [{ shift: '__custom__10_00_15_00', isFixed: true, isError: false }, ...blankRow().slice(1)];
        const employees = [
            { name: '太郎', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④', '⑦'], requests: '', targetHours: null },
            { name: '花子', type: '準社員', isRS: false, isKeyHolder: false, days: 23, shifts: [], requests: '', targetHours: null }, // allowed_shifts空
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix: [row0, blankRow()], hasError: false, warnings: [], isWarningDraft: false, violations: [] }));
        window.localStorage.setItem('shift_custom_master', JSON.stringify({
            '①': '8:15～12:15', '④': '8:15～17:30', '⑦': '15:30～24:00',
            '__custom__10_00_15_00': '10:00～15:00',
        }));
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'SUCCESS', shifts: { emp_0: [], emp_1: [] } }) });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /空欄自動作成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        const emp1AllowedShifts = body.employees[1].allowed_shifts;
        expect(emp1AllowedShifts.length).toBeGreaterThan(0); // 空のまま送らない
        expect(emp1AllowedShifts.some(id => id.startsWith('__custom__'))).toBe(false); // 自由時間は含まない
    });
});

describe('Take3 P1-1: 削除済み/未知IDだけの場合も「全シフト可」フォールバックを防ぐ', () => {
    // ルール設定でシフトパターンを削除しても、それを参照していたemployees[].shiftsは
    // 更新されない。この状態でも「元配列は非空」なのでTake2実装では素通りしてしまい、
    // バックエンドは有効ID0件を「全シフト可」と誤解釈していた(Dex P4差し戻し)。
    function seedWithShifts(emp1Shifts) {
        const employees = [
            { name: '太郎', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④', '⑦'], requests: '', targetHours: null },
            { name: '花子', type: '準社員', isRS: false, isKeyHolder: false, days: 23, shifts: emp1Shifts, requests: '', targetHours: null },
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        window.localStorage.setItem('shift_custom_master', JSON.stringify({
            '①': '8:15～12:15', '④': '8:15～17:30', '⑦': '15:30～24:00',
        }));
    }

    it('shifts=["削除済みID"]だけの従業員にも、通常IDのみが明示的に送られる(全シフト可フォールバックを防ぐ)', async () => {
        seedWithShifts(['⑨_削除済み']); // shiftMasterに存在しないID
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'SUCCESS', shifts: { emp_0: [], emp_1: [] } }) });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        const emp1AllowedShifts = body.employees[1].allowed_shifts;
        expect(emp1AllowedShifts).not.toContain('⑨_削除済み');
        expect(emp1AllowedShifts.length).toBeGreaterThan(0);
        expect(emp1AllowedShifts.some(id => id.startsWith('__custom__'))).toBe(false);
    });

    it('shifts=["④","削除済みID","④"]では、存在する④だけが重複なく1件送られる', async () => {
        seedWithShifts(['④', '⑨_削除済み', '④']);
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'SUCCESS', shifts: { emp_0: [], emp_1: [] } }) });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.employees[1].allowed_shifts).toEqual(['④']);
    });

    it('空欄自動作成でも、削除済みIDだけの従業員には通常IDのみが明示的に送られる', async () => {
        seedWithShifts(['⑨_削除済み']);
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'SUCCESS', shifts: { emp_0: [], emp_1: [] } }) });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /空欄自動作成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        const emp1AllowedShifts = body.employees[1].allowed_shifts;
        expect(emp1AllowedShifts).not.toContain('⑨_削除済み');
        expect(emp1AllowedShifts.length).toBeGreaterThan(0);
    });

    // Take4(Dex差し戻し): 「最適化シフトを生成」だけでなく「空欄自動作成」でも同じ安全停止が
    // 必要。matrixだけでなくshift_generatedResult全体、およびUndo/Redoボタンの状態
    // (履歴を追加・消去しない)が実行前後で変わらないことも直接検証する。
    it.each([
        ['最適化シフトを生成', /最適化シフトを生成/],
        ['空欄自動作成', /空欄自動作成/],
    ])('通常シフトが1件も無い場合、「%s」はfetchせずに安全停止し、生成結果・Undo\\/Redo履歴・isGeneratingを変更しない', (_label, buttonNameRegex) => {
        seedSmallFixture([blankRow(), blankRow()]);
        // shiftMasterを空にする(通常シフト0件の状態)
        window.localStorage.setItem('shift_custom_master', JSON.stringify({}));

        render(<App />);

        // 事前に1件セル編集し、Undoが有効な状態(historyPastが1件)を作っておく。
        // これにより「安全停止時に既存の履歴が消去されない」ことまで検証できる。
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '休' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        expect(readMatrix()[0][0].shift).toBe('休');

        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(window, 'alert').mockImplementation(() => {});

        // 生成前の状態を実行前後比較用に記録する。
        const generatedResultBefore = window.localStorage.getItem('shift_generatedResult');
        const undoDisabledBefore = screen.getByRole('button', { name: '元に戻す(Undo)' }).disabled;
        const redoDisabledBefore = screen.getByRole('button', { name: 'やり直す(Redo)' }).disabled;
        expect(undoDisabledBefore).toBe(false); // 事前のセル編集でUndoが有効になっている

        fireEvent.click(screen.getByRole('button', { name: buttonNameRegex }));

        expect(fetchMock).not.toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalled();
        expect(screen.queryByText(/最適化を実行中/)).not.toBeInTheDocument(); // isGeneratingが有効にならない
        expect(readMatrix()[0][0].shift).toBe('休'); // 事前編集した内容も含めmatrixは変更されない
        // shift_generatedResult全体(matrix以外の付随情報も含む)が実行前後で完全に同一であること。
        expect(window.localStorage.getItem('shift_generatedResult')).toBe(generatedResultBefore);
        // Undo/Redo履歴が追加・消去されていないこと(ボタンのdisabled状態が不変)。
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' }).disabled).toBe(undoDisabledBefore);
        expect(screen.getByRole('button', { name: 'やり直す(Redo)' }).disabled).toBe(redoDisabledBefore);
    });
});

describe('Take2 P2-1: 往復スワイプの誤判定修正', () => {
    it('30px移動後に開始点付近(2px)へ戻してpointerupしても、編集画面は開かない', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        fireEvent.pointerDown(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerMove(btn, { pointerId: 1, clientX: 130, clientY: 100 }); // 30px移動
        fireEvent.pointerUp(btn, { pointerId: 1, clientX: 102, clientY: 100 }); // 開始点付近へ戻る
        expect(screen.queryByText(/太郎.*の勤務を編集/)).not.toBeInTheDocument();
    });

    it('8px未満の移動だけなら往復しても短タップとして開く', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        fireEvent.pointerDown(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerMove(btn, { pointerId: 1, clientX: 103, clientY: 100 });
        fireEvent.pointerMove(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn, { pointerId: 1, clientX: 101, clientY: 100 });
        expect(screen.getByText(/太郎.*の勤務を編集/)).toBeInTheDocument();
    });
});

describe('Take2 P2-2: INFEASIBLE再試行は最新render状態を使う', () => {
    it('INFEASIBLE表示後にUndoで状態が変わっても、再試行は最新のemployees/matrixで送信する', async () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);

        // 先に1件セル編集し、Undo可能な履歴を1つ作っておく
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        expect(readMatrix()[0][0].shift).toBe('④');

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'INFEASIBLE', message: 'テスト不可能', violations: ['違反A'] }),
        });
        vi.stubGlobal('fetch', fetchMock);

        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(screen.getByText(/自動生成を停止しました/)).toBeInTheDocument());

        // INFEASIBLE表示中にUndoで状態を変える(古いrenderのclosureに閉じ込められていないか検証)
        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(readMatrix()[0][0]).toEqual({});

        const successFetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'SUCCESS', shifts: { emp_0: Array(31).fill('休'), emp_1: Array(31).fill('休') } }),
        });
        vi.stubGlobal('fetch', successFetchMock);

        fireEvent.click(screen.getByRole('button', { name: /違反一覧を確認のうえ/ }));
        await vi.waitFor(() => expect(successFetchMock).toHaveBeenCalledTimes(1));
        await vi.waitFor(() => expect(readMatrix()[0][0]?.shift).toBe('休'));

        // 再試行が古いrenderのemployees(④固定済み)ではなく、Undo後の最新状態を使ったこと、
        // かつallow_warning_draft:trueで呼ばれたことを確認する。
        const body = JSON.parse(successFetchMock.mock.calls[0][1].body);
        expect(body.allow_warning_draft).toBe(true);
        expect(readMatrix()[0][0].shift).toBe('休'); // 古い'④'ではなく最新の生成結果が反映される
    });
});
