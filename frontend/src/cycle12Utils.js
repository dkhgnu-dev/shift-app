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

// 5.1: スタンプ候補パレット。勤務時間入力が必要な特殊シフト(有休/応援/店長会/研修/勉強会)は
// shiftMasterに元々含まれないため、この関数の対象にも自然に含まれない。
export function buildStampCandidates(shiftMaster) {
    const master = shiftMaster || {};
    const normalIds = Object.keys(master).filter(id => !id.startsWith('__custom__'));
    const customIds = Object.keys(master).filter(id => id.startsWith('__custom__'));
    const normalCandidates = normalIds.map(id => ({ shiftId: id, label: `${id} ${master[id] || ''}`.trim() }));
    const customCandidates = customIds.map(id => ({ shiftId: id, label: `自由 ${master[id] || ''}`.trim() }));
    return [
        { shiftId: '休', label: '休' },
        { shiftId: '希望休', label: '希望休' },
        ...normalCandidates,
        ...customCandidates,
    ];
}

// 5.2: 通常シフトは対象従業員の有効な許可シフトだけ塗れる。休/希望休/自由時間は常に許可する。
export function isStampAllowedForEmployee(shiftId, allowedShiftIds) {
    if (shiftId === '休' || shiftId === '希望休') return true;
    if (typeof shiftId === 'string' && shiftId.startsWith('__custom__')) return true;
    return Array.isArray(allowedShiftIds) && allowedShiftIds.includes(shiftId);
}

// 5.2: 同じシフトを同じセルへ重ねた場合はno-op(matrix・履歴・Redo・noteを変更しない)。
export function isStampNoOp(existingCell, shiftId) {
    return !!(existingCell && existingCell.shift === shiftId);
}

// 5.2: スタンプで書き込むセルオブジェクト(常にisFixed:trueの手動確定セルとして作る)。
export function buildStampedCell(shiftId) {
    return { shift: shiftId, isFixed: true, isError: false };
}
