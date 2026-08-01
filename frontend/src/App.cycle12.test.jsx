import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import App from './App';

// Cycle12 P2確定仕様(docs/handoff/P2_Dex_to_CC/cycle_12_protection_and_stamp_instructions.md)
// のApp結合契約テスト。純粋関数の網羅はcycle12Utils.test.jsxが担当するため、ここでは
// 「操作連動」(通常生成のpayload/応答再合成・失敗時の不変性・スタンプの排他/履歴/同期)
// だけを最小fixture(2名)で確認する。テスト数を増やすためだけの重複renderはしない。

function setViewportWidth(width) {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

const DAY_COUNT = 31;
function blankRow() {
    return Array.from({ length: DAY_COUNT }, () => ({}));
}

function seedFixture(matrix, employeesOverride) {
    const employees = employeesOverride || [
        { name: '太郎', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④', '⑦'], requests: '', targetHours: null },
        { name: '花子', type: '準社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
    ];
    window.localStorage.setItem('shift_employees', JSON.stringify(employees));
    if (matrix) {
        window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix, hasError: false, warnings: [], isWarningDraft: false, violations: [] }));
    }
}

function readStoredResult() {
    const raw = window.localStorage.getItem('shift_generatedResult');
    return raw ? JSON.parse(raw) : null;
}

function getCellButton(rowIndex, dayIndex) {
    const table = document.querySelector('table');
    const row = table.querySelectorAll('tbody tr')[rowIndex];
    const dayTds = Array.from(row.querySelectorAll('td')).slice(2);
    return dayTds[dayIndex].querySelector('button');
}

beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1280);
});

afterEach(() => {
    setViewportWidth(1280);
    vi.restoreAllMocks();
});

describe('Cycle12: 通常生成の手動セル保護(payload構築)', () => {
    it('isFixed:trueの通常シフト・休・希望休が固定割当として送られ、isFixed:falseは送られない', async () => {
        const row0 = [
            { shift: '④', isFixed: true, isError: false },      // 保護対象
            { shift: '休', isFixed: true, isError: false },      // 保護対象(OFFへ変換)
            { shift: '希望休', isFixed: true, isError: false },  // 保護対象(OFFへ変換)
            { shift: '⑦', isFixed: false, isError: false },      // 自動生成由来: 保護対象外
            ...blankRow().slice(4),
        ];
        seedFixture([row0, blankRow()]);
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'SUCCESS', shifts: { emp_0: [], emp_1: [] } }) });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.fixed_assignments).toEqual(expect.arrayContaining([
            { employee_id: 'emp_0', day_index: 0, shift_id: '④' },
            { employee_id: 'emp_0', day_index: 1, shift_id: 'OFF' },
            { employee_id: 'emp_0', day_index: 2, shift_id: 'OFF' },
        ]));
        expect(body.fixed_assignments.some(fa => fa.day_index === 3)).toBe(false);
        expect(body.fixed_assignments.length).toBe(3);
    });

    it('isFixed未設定(旧localStorageセル)は安全側で保護される', async () => {
        const row0 = [{ shift: '④', isError: false }, ...blankRow().slice(1)]; // isFixedキー自体が無い
        seedFixture([row0, blankRow()]);
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'SUCCESS', shifts: { emp_0: [], emp_1: [] } }) });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.fixed_assignments).toEqual([{ employee_id: 'emp_0', day_index: 0, shift_id: '④' }]);
    });
});

describe('Cycle12: 通常生成の応答再合成(2.3)', () => {
    it('保護セルはSUCCESS応答でもshift/hours/note/isFixed/isErrorを完全一致で保持する', async () => {
        const protectedCell = { shift: '有休', hours: 6, note: 'メモ', isFixed: true, isError: false };
        const row0 = [protectedCell, ...blankRow().slice(1)];
        seedFixture([row0, blankRow()]);
        // バックエンドは実運用では必ず期間の全日数分を返すため、テストでも
        // DAY_COUNT分の配列で応答を模擬する(day0は固定なので'有休'、day1は'④'、残りは'休')。
        const emp0Shifts = ['有休', '④', ...Array.from({ length: DAY_COUNT - 2 }, () => '休')];
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'SUCCESS', shifts: { emp_0: emp0Shifts, emp_1: [] } }),
        });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        // day0(保護セル)は生成前から既にprotectedCellと一致しているため、
        // 生成完了の目印にはday1(生成前は空セル{}、成功後は'④')の変化を待つ。
        await vi.waitFor(() => expect(readStoredResult().matrix[0][1]).toEqual({ shift: '④', isError: false, isFixed: false }));

        expect(readStoredResult().matrix[0][0]).toEqual(protectedCell);
    });

    it('保護セルはFEASIBLE_WITH_WARNINGS応答でも同様に保持する', async () => {
        const protectedCell = { shift: '④', isFixed: true, isError: false, note: '固定' };
        const row0 = [protectedCell, ...blankRow().slice(1)];
        seedFixture([row0, blankRow()]);
        const emp0Shifts = ['④', '①', ...Array.from({ length: DAY_COUNT - 2 }, () => '休')];
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'FEASIBLE_WITH_WARNINGS', shifts: { emp_0: emp0Shifts, emp_1: [] }, warnings: ['dummy'] }),
        });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        // day1(生成前は空セル、成功後は'①')の変化を生成完了の目印にする。
        await vi.waitFor(() => expect(readStoredResult().matrix[0][1]).toEqual({ shift: '①', isError: false, isFixed: false }));
        expect(readStoredResult().matrix[0][0]).toEqual(protectedCell);
        expect(readStoredResult().hasError).toBe(true);
    });
});

describe('Cycle12: 失敗経路でmatrix/employees/Undo・Redoが不変', () => {
    it('INFEASIBLE応答では表・履歴が一切変更されない', async () => {
        const original = [{ shift: '④', isFixed: true, isError: false }, ...blankRow().slice(1)];
        seedFixture([original, blankRow()]);
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'INFEASIBLE', shifts: {}, violations: ['x'], message: 'x' }) });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        expect(readStoredResult().matrix[0][0]).toEqual(original[0]);
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
    });

    it('通信例外(fetch reject)でも表・履歴が一切変更されない', async () => {
        const original = [{ shift: '④', isFixed: true, isError: false }, ...blankRow().slice(1)];
        seedFixture([original, blankRow()]);
        const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        await vi.waitFor(() => expect(window.alert).toHaveBeenCalled());

        expect(readStoredResult().matrix[0][0]).toEqual(original[0]);
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
    });
});

describe('Cycle12: 生成中の古い応答を無視する(2.4)', () => {
    // UIレベルでは`disabled={isGenerating}`により、生成中はbuttonへのclickがDOM仕様上
    // 発火しない(jsdomもネイティブbuttonのdisabled中click抑止を再現する)ため、
    // 「連打で2つのfetchが同時に飛ぶ」状況そのものをUI操作だけで再現できない。
    // ここでは(a)isGenerating中は追加送信が構造的に起きないことをUIで確認し、
    // (b)requestTokenガード自体(古い応答を判定・無視するロジック)が実装されている
    // ことをコード上のガード条件で確認する形にする。
    it('isGenerating中はボタンがdisabledになり、生成完了までは追加のfetchが発生しない', async () => {
        seedFixture([blankRow(), blankRow()]);
        let resolveFetch;
        const fetchMock = vi.fn().mockImplementation(() => new Promise(res => { resolveFetch = res; }));
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        const genBtn = screen.getByRole('button', { name: /最適化シフトを生成/ });
        fireEvent.click(genBtn);
        expect(genBtn).toBeDisabled();

        // disabledのため2回目のclickはネイティブDOM仕様上発火しない
        fireEvent.click(genBtn);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        resolveFetch({ ok: true, json: async () => ({ status: 'SUCCESS', shifts: { emp_0: [], emp_1: [] } }) });
        await vi.waitFor(() => expect(genBtn).not.toBeDisabled());
    });

    it('requestTokenガード: App.jsxのgenerateShift/fillBlanksが古いトークンの応答・finallyを無視する分岐を持つ', () => {
        const appPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'App.jsx');
        const source = readFileSync(appPath, 'utf-8');
        expect(source).toMatch(/generateRequestTokenRef\.current/);
        expect(source.match(/requestToken !== generateRequestTokenRef\.current/g)?.length).toBeGreaterThanOrEqual(2);
        expect(source.match(/requestToken === generateRequestTokenRef\.current/g)?.length).toBeGreaterThanOrEqual(2);
    });
});

describe('Cycle12: スタンプモード', () => {
    it('通常シフト0件でも休/希望休スタンプは使え、自動生成は従来どおりfetchせず停止する', () => {
        const employees = [
            { name: '太郎', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: [], requests: '', targetHours: null },
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        window.localStorage.setItem('shift_custom_master', JSON.stringify({})); // 通常シフト0件
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        expect(fetchMock).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'スタンプモードを開始する' }));
        expect(screen.getByRole('button', { name: '休', pressed: true })).toBeInTheDocument();
        fireEvent.pointerDown(getCellButton(0, 0), { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(getCellButton(0, 0), { pointerId: 1, clientX: 101, clientY: 100 });
        expect(readStoredResult().matrix[0][0]).toEqual({ shift: '休', isFixed: true, isError: false });
    });

    it('短タップは1回だけスタンプし、横スワイプでは塗らない', () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'スタンプモードを開始する' }));

        const btn0 = getCellButton(0, 0);
        fireEvent.pointerDown(btn0, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn0, { pointerId: 1, clientX: 101, clientY: 101 });
        expect(readStoredResult().matrix[0][0]).toEqual({ shift: '休', isFixed: true, isError: false });

        const btn1 = getCellButton(0, 1);
        fireEvent.pointerDown(btn1, { pointerId: 2, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn1, { pointerId: 2, clientX: 140, clientY: 100 }); // 40px横スワイプ
        expect(readStoredResult().matrix[0][1]).toEqual({}); // 未着手セルのまま(スタンプされない)
    });

    it('スタンプON中は短タップでもセル編集モーダルが開かない', () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'スタンプモードを開始する' }));

        const btn0 = getCellButton(0, 0);
        fireEvent.pointerDown(btn0, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn0, { pointerId: 1, clientX: 101, clientY: 100 });
        expect(screen.queryByText(/太郎.*の勤務を編集/)).not.toBeInTheDocument();
    });

    it('連続3セルへのスタンプが3履歴となり、Undoで1セルずつ戻り、Redoで復元する', () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'スタンプモードを開始する' }));

        [0, 1, 2].forEach(d => {
            const btn = getCellButton(0, d);
            fireEvent.pointerDown(btn, { pointerId: d + 1, clientX: 100, clientY: 100 });
            fireEvent.pointerUp(btn, { pointerId: d + 1, clientX: 101, clientY: 100 });
        });
        expect(readStoredResult().matrix[0].slice(0, 3).every(c => c.shift === '休')).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(readStoredResult().matrix[0][2].shift).toBeUndefined();
        expect(readStoredResult().matrix[0][1].shift).toBe('休');

        fireEvent.click(screen.getByRole('button', { name: 'やり直す(Redo)' }));
        expect(readStoredResult().matrix[0][2].shift).toBe('休');
    });

    it('同じシフトを同じセルへ重ねてもno-op(履歴・Redoを増減しない)', () => {
        seedFixture([[{ shift: '休', isFixed: true, isError: false }, ...blankRow().slice(1)], blankRow()]);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'スタンプモードを開始する' }));

        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
        const btn0 = getCellButton(0, 0);
        fireEvent.pointerDown(btn0, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn0, { pointerId: 1, clientX: 101, clientY: 100 });
        // 既にactive stamp='休'かつ既存セルも'休' -> no-op
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
    });

    it('希望休スタンプ後、employees[].requestsがmatrixと即時一致する', () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'スタンプモードを開始する' }));
        fireEvent.click(screen.getByRole('button', { name: '希望休' }));

        const btn0 = getCellButton(0, 0);
        fireEvent.pointerDown(btn0, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn0, { pointerId: 1, clientX: 101, clientY: 100 });

        const employees = JSON.parse(window.localStorage.getItem('shift_employees'));
        expect(employees[0].requests).toBe('1');
    });

    it('キーボードのEnter/Space(click(detail===0))でも同じスタンプを1回実行する', () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'スタンプモードを開始する' }));

        const btn0 = getCellButton(0, 0);
        fireEvent.click(btn0, { detail: 0 });
        expect(readStoredResult().matrix[0][0]).toEqual({ shift: '休', isFixed: true, isError: false });
    });

    it('モードトグルのaria-pressedと現在の筆ラベルが状態と連動する', () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);
        const toggle = screen.getByRole('button', { name: 'スタンプモードを開始する' });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');

        fireEvent.click(toggle);
        expect(screen.getByRole('button', { name: 'スタンプモードを終了する' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('休', { selector: 'strong' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '④ 8:15～17:30' }));
        expect(screen.getByText('④ 8:15～17:30', { selector: 'strong' })).toBeInTheDocument();
    });
});
