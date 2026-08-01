import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

// Take2(Dex P4差戻し): 通常UIでは`disabled={isGenerating}`によりネイティブbuttonへの
// click自体が(jsdomでも)発火しないため、2つ目の要求をUI操作だけで開始させられない。
// requestTokenガードの実挙動(古い応答が後から届いてもstateへ反映されない)を
// DOM/state観測で直接証明するため、Reactが内部に保持しているイベントハンドラを
// (disabled判定を経由するネイティブdispatchではなく)直接呼び出すヘルパーを使う。
// これはハンドラの実体(onClick propそのもの)を呼ぶだけであり、本番の
// generateShift/fillBlanksの処理自体は一切変更していない。
function invokeClickHandlerDirectly(element) {
    const propsKey = Object.keys(element).find(k => k.startsWith('__reactProps'));
    act(() => { element[propsKey].onClick(); });
}

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

    // Take2(Dex P4差戻し): ソース文字列確認だけでは実挙動を証明できないという指摘に対応。
    // 通常UIの`disabled`ガードを意図的に外して2要求(generateShift→fillBlanks)を強制的に
    // 開始させ、後発の要求(B)を先に解決、先発の要求(A)を後から解決させることで、
    // 「古い応答(A)が後から届いてもstateへ反映されない」ことをDOM/localStorage観測で証明する。
    it('generateShiftとfillBlanksをまたぐ2要求で、古い応答(先発)が後から解決してもstateを上書きしない', async () => {
        seedFixture([blankRow(), blankRow()]);
        let resolveA, resolveB;
        const fetchMock = vi.fn()
            .mockImplementationOnce(() => new Promise(res => { resolveA = res; }))
            .mockImplementationOnce(() => new Promise(res => { resolveB = res; }));
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        const genBtn = screen.getByRole('button', { name: /最適化シフトを生成/ });
        fireEvent.click(genBtn); // 要求A(generateShift)開始・未解決
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(genBtn).toBeDisabled();

        // 通常UIではdisabledのため2件目を開始できない(jsdomはネイティブbuttonの
        // disabled中click抑止をReactのイベント委譲層でも再現するため、DOM属性を
        // 直接書き換えるだけではclickが発火しないことを別途確認済み)。
        // requestTokenガードの実挙動(古い応答の破棄)自体を検証するため、
        // テストでは意図的にReactのonClickハンドラを直接呼び出し、
        // Aが未解決のままBを強制的に開始させる。
        const fillBtn = screen.getByRole('button', { name: /空欄自動作成/ });
        invokeClickHandlerDirectly(fillBtn); // 要求B(fillBlanks)開始・Aより後に開始・未解決
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

        // Bを先に解決させる(後発の要求が先に完了するケース)
        resolveB({ ok: true, json: async () => ({ status: 'SUCCESS', shifts: { emp_0: ['①'], emp_1: [] } }) });
        await vi.waitFor(() => expect(readStoredResult()?.matrix?.[0]?.[0]?.shift).toBe('①'));

        // Aが後から解決しても、Bより古い(先発の)要求なのでstateへ反映されない
        resolveA({ ok: true, json: async () => ({ status: 'SUCCESS', shifts: { emp_0: ['⑦'], emp_1: [] } }) });
        await new Promise(r => setTimeout(r, 30));
        expect(readStoredResult().matrix[0][0].shift).toBe('①');
    });
});

describe('Cycle12 Take2(main統合P1): 全画面表示中もスタンプ開始・筆選択・終了が操作できる', () => {
    // Dex P4差戻しP1: main側の全画面表示(.matrix-glass-cardがposition:fixed;
    // z-index:9999で画面全体を覆う)とスタンプUIが機能衝突していた。スタンプ
    // トグル・パレットを、全画面表示の閉じるボタンと同じ手法(position:fixed +
    // より高いz-index:10000)で浮かせることで解消したことを固定する。
    it('全画面表示ON時、スタンプトグルとパレットがposition:fixed・z-index:10000になる', async () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);

        const fsToggle = screen.getByRole('button', { name: '画面いっぱいに全画面表示する' });
        fireEvent.click(fsToggle);

        const stampToggle = screen.getByRole('button', { name: 'スタンプモードを開始する' });
        expect(stampToggle.style.position).toBe('fixed');
        expect(stampToggle.style.zIndex).toBe('10000');

        fireEvent.click(stampToggle);
        const palette = document.querySelector('.stamp-palette');
        expect(palette.style.position).toBe('fixed');
        expect(palette.style.zIndex).toBe('10000');

        // 全画面表示中でも実際にスタンプできる(連続スタンプ・操作継続の確認)
        const btn0 = getCellButton(0, 0);
        fireEvent.pointerDown(btn0, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn0, { pointerId: 1, clientX: 101, clientY: 100 });
        expect(readStoredResult().matrix[0][0]).toEqual({ shift: '休', isFixed: true, isError: false });

        // jsdomは<style>タグ除去後もCSSOMルールを保持し続けることがあるため、
        // 他テストへの汚染を防ぐ目的で全画面表示を明示的にOFFへ戻してから終える
        // (mainの全画面表示機能がテスト内で注入するグローバルCSSに起因する、
        // このテストファイル固有の後始末であり、本番の挙動には影響しない)。
        fireEvent.click(fsToggle);
    });

    it('全画面表示OFF時は、スタンプトグルとパレットに固定配置スタイルが付かない(通常配置)', () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);

        const stampToggle = screen.getByRole('button', { name: 'スタンプモードを開始する' });
        expect(stampToggle.style.position).not.toBe('fixed');
        fireEvent.click(stampToggle);
        const palette = document.querySelector('.stamp-palette');
        expect(palette.style.position).not.toBe('fixed');
    });
});

describe('Cycle12 Take3(P4差戻しFinding2): 全画面表示中、背面の不可視UIへTabフォーカスが移らない', () => {
    // Dex P4差戻しFinding2: 全画面表示中、Undo/Redo・氏名列トグル・警告パネル等は
    // `.matrix-glass-card`(position:fixed; z-index:9999)の背面に視覚的に隠れるが、
    // display:noneで非表示にはしていないためTabキーでフォーカスが到達し得る状態だった。
    // inert属性でフォーカス・操作対象外にし、全画面解除後は通常操作へ戻すことを固定する。
    it('全画面表示ON時、Undo/Redo・氏名列トグルがinertになり、全画面用コントロール・スタンプUIはinertにならない', () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);

        const fsToggle = screen.getByRole('button', { name: '画面いっぱいに全画面表示する' });
        const undoBtn = screen.getByRole('button', { name: '元に戻す(Undo)' });
        const redoBtn = screen.getByRole('button', { name: 'やり直す(Redo)' });
        const nameColToggle = screen.getByRole('button', { name: '氏名列を折りたたむ' });
        const stampToggle = screen.getByRole('button', { name: 'スタンプモードを開始する' });

        expect(undoBtn.hasAttribute('inert')).toBe(false);
        expect(redoBtn.hasAttribute('inert')).toBe(false);
        expect(nameColToggle.hasAttribute('inert')).toBe(false);

        fireEvent.click(fsToggle);

        expect(undoBtn.hasAttribute('inert')).toBe(true);
        expect(redoBtn.hasAttribute('inert')).toBe(true);
        expect(nameColToggle.hasAttribute('inert')).toBe(true);
        // 全画面を閉じるボタン自身とスタンプ開始ボタンは、全画面中も操作対象であり続ける
        expect(screen.getByRole('button', { name: '全画面表示を解除する' }).hasAttribute('inert')).toBe(false);
        expect(stampToggle.hasAttribute('inert')).toBe(false);

        // 全画面解除後は、通常のフォーカス・操作対象へ戻る
        fireEvent.click(screen.getByRole('button', { name: '全画面表示を解除する' }));
        expect(undoBtn.hasAttribute('inert')).toBe(false);
        expect(redoBtn.hasAttribute('inert')).toBe(false);
        expect(nameColToggle.hasAttribute('inert')).toBe(false);
    });

    it('全画面表示ON時、警告パネル(infeasible-panel)もinertになる', () => {
        seedFixture([blankRow(), blankRow()]);
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'INFEASIBLE', shifts: {}, warnings: ['条件を満たす配置が見つかりません'] }) });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        return vi.waitFor(() => {
            const panel = document.querySelector('.infeasible-panel');
            expect(panel).toBeInTheDocument();
        }).then(() => {
            const panel = document.querySelector('.infeasible-panel');
            expect(panel.hasAttribute('inert')).toBe(false);

            fireEvent.click(screen.getByRole('button', { name: '画面いっぱいに全画面表示する' }));
            expect(document.querySelector('.infeasible-panel').hasAttribute('inert')).toBe(true);

            fireEvent.click(screen.getByRole('button', { name: '全画面表示を解除する' }));
            expect(document.querySelector('.infeasible-panel').hasAttribute('inert')).toBe(false);
        });
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
