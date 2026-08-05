// Cycle12: 通常生成の手動セル保護とスタンプ(一括塗り)モードのための純粋関数群。
// App.jsxのUIコンポーネントとテストの両方から利用する(DOM・イベントに依存しない)。

// 2.1: 通常の「最適化シフトを生成」で保護するセルの判定。
// isFixed:trueは手動セルとして保護し、isFixed:falseは自動生成由来として再最適化を許可する。
// 古いlocalStorageのisFixed未設定セル(undefined)は、データ損失防止を優先して保護する。
export function isProtectedCellForGenerate(cell) {
    return !!(cell && cell.shift && cell.isFixed !== false);
}

// 2.1/2.2: matrix全体から保護セルを抽出し、fixed_assignments payloadと
// 座標→元セルオブジェクトのスナップショット(応答再合成用)を同時に構築する。
// 休/希望休はバックエンドの独立シフト種別ではなく'OFF'として送る。
export function buildProtectedFixedAssignments(matrix, employeeIds) {
    const protectedCellsByCoord = {};
    const fixedAssignments = [];
    (matrix || []).forEach((row, idx) => {
        const employeeId = employeeIds[idx];
        (row || []).forEach((cell, d) => {
            if (isProtectedCellForGenerate(cell)) {
                if (!protectedCellsByCoord[idx]) protectedCellsByCoord[idx] = {};
                protectedCellsByCoord[idx][d] = cell;
                const shiftId = (cell.shift === '休' || cell.shift === '希望休') ? 'OFF' : cell.shift;
                fixedAssignments.push({ employee_id: employeeId, day_index: d, shift_id: shiftId });
            }
        });
    });
    return { fixedAssignments, protectedCellsByCoord };
}

// 2.3: バックエンド応答(従業員ごとのshift配列)から、保護座標だけをスナップショットの
// 元オブジェクトへ丸ごと差し替えてmatrixを再合成する(shiftだけでなくhours/note/
// isFixed/isError等の全属性を保持する)。
export function reconcileGeneratedMatrix(empShiftsList, protectedCellsByCoord) {
    return (empShiftsList || []).map((empShifts, idx) => (empShifts || []).map((s, d) => {
        const protectedCell = protectedCellsByCoord[idx] && protectedCellsByCoord[idx][d];
        if (protectedCell) return protectedCell;
        return { shift: s, isError: false, isFixed: false };
    }));
}

// Cycle13 4: 消しゴムスタンプの特殊ID。通常・自由時間IDと衝突しない定数として1箇所で定義し、
// 文字列を複数箇所へ直書きしない。
export const ERASE_STAMP_ID = '__erase__';
export function isEraseStamp(shiftId) {
    return shiftId === ERASE_STAMP_ID;
}

// Cycle13 4-1: 最初から使える特殊シフトスタンプ4種。研修・公休など今回指定されていない
// 既存の特殊シフトは含めない(従来どおりセル編集からのみ入力可能)。
export const SPECIAL_STAMP_SHIFT_IDS = ['有休', '応援', '勉強会', '店長会'];
export function isSpecialStampShift(shiftId) {
    return SPECIAL_STAMP_SHIFT_IDS.includes(shiftId);
}

// 5.1: スタンプ候補パレット。消しゴムと4種類の特殊シフトスタンプは、shiftMasterの内容や
// 通常シフト許可リストに関わらず常に候補へ含まれる。
export function buildStampCandidates(shiftMaster) {
    const master = shiftMaster || {};
    const normalIds = Object.keys(master).filter(id => !id.startsWith('__custom__'));
    const customIds = Object.keys(master).filter(id => id.startsWith('__custom__'));
    const normalCandidates = normalIds.map(id => ({ shiftId: id, label: `${id} ${master[id] || ''}`.trim() }));
    const customCandidates = customIds.map(id => ({ shiftId: id, label: `自由 ${master[id] || ''}`.trim() }));
    const specialCandidates = SPECIAL_STAMP_SHIFT_IDS.map(id => ({ shiftId: id, label: id, isSpecial: true }));
    // 「休」を先頭に維持する(スタンプモードON時の既定選択候補として使われる)。
    return [
        { shiftId: '休', label: '休' },
        { shiftId: '希望休', label: '希望休' },
        { shiftId: ERASE_STAMP_ID, label: '消しゴム（空欄にする）', isErase: true },
        ...specialCandidates,
        ...normalCandidates,
        ...customCandidates,
    ];
}

// 5.2: 通常シフトは対象従業員の有効な許可シフトだけ塗れる。休/希望休/自由時間/消しゴム/
// 特殊シフトスタンプ4種は常に許可する(通常シフト用の許可判定で拒否しない)。
export function isStampAllowedForEmployee(shiftId, allowedShiftIds) {
    if (isEraseStamp(shiftId)) return true;
    if (shiftId === '休' || shiftId === '希望休') return true;
    if (isSpecialStampShift(shiftId)) return true;
    if (typeof shiftId === 'string' && shiftId.startsWith('__custom__')) return true;
    return Array.isArray(allowedShiftIds) && allowedShiftIds.includes(shiftId);
}

// Cycle13 3: 同値スタンプ判定(トグル空欄化用)。同じshiftIdが既に入っていれば消去対象。
// 通常シフトの許可判定より先に呼ぶことで、許可外になった通常シフトでも消去だけは常に成功する。
export function isStampToggleClear(existingCell, shiftId) {
    return !!(existingCell && existingCell.shift === shiftId);
}

// Cycle13 4: 消しゴムで空欄セルを選んだ場合だけの真のno-op(履歴・Redo・matrix・requestsを変えない)。
export function isEraseNoOp(existingCell) {
    return !(existingCell && existingCell.shift);
}

// Cycle13 4-1: 早番①の時間帯から特殊シフトスタンプの初期計上時間(h)を安全に算出する。
// shiftMasterに①が無い/不正な形式/終了<=開始の場合は、呼び出し側が渡すfallbackHoursへ
// フォールバックする(固定の4を散在させない)。
export function computeEarlyShiftHours(shiftMaster, fallbackHours) {
    const timeStr = shiftMaster && shiftMaster['①'];
    if (typeof timeStr !== 'string' || !timeStr.includes('～')) return fallbackHours;
    const [startStr, endStr] = timeStr.split('～');
    const toMinutes = (t) => {
        if (typeof t !== 'string') return null;
        const parts = t.split(':');
        if (parts.length !== 2) return null;
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        return h * 60 + m;
    };
    const startMin = toMinutes(startStr);
    const endMin = toMinutes(endStr);
    if (startMin === null || endMin === null) return fallbackHours;
    const diffMin = endMin - startMin;
    if (!(diffMin > 0)) return fallbackHours;
    return diffMin / 60;
}

// 5.2/Cycle13 4-1: スタンプで書き込むセルオブジェクト(常にisFixed:trueの手動確定セルとして作る)。
// hoursが有限数の場合だけ明示保存する(特殊シフトスタンプ用)。
export function buildStampedCell(shiftId, hours) {
    const cell = { shift: shiftId, isFixed: true, isError: false };
    if (typeof hours === 'number' && Number.isFinite(hours)) cell.hours = hours;
    return cell;
}
