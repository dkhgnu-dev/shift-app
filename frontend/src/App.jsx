import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, Users, Settings, Plus, X, Edit, Trash2, AlertCircle, Wand2, Menu, GripVertical, ArrowUp, ArrowDown, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { computeHourChange, computeMinuteChange, formatTime, isValidSpecialHours, parseFourDigitTime, parseStrictNumber } from './timeUtils';
import {
    classifyPointerUp,
    buildFreeTimeShiftId,
    isValidFreeTimeRange,
    buildCellForSave,
    buildRequestsFromMatrix,
    restoreRequestedOffInMatrix,
    swapMatrixCells,
    pushSnapshot,
    undoStep,
    redoStep,
} from './cycle9Utils';
import { buildHealthAlerts, formatRestMinutesAsLabel, extractSurname } from './cycle11Utils';

const SHIFT_MASTER = {
    '①': '8:15～12:15', '②': '8:15～14:15', '③': '8:15～16:15',
    '④': '8:15～17:30', '⑤': '11:00～19:00', '⑥': '14:00～19:00', '⑦': '15:30～24:00', '⑧': '17:00～24:00',
    '⑨': '17:00～22:00', '⑩': '19:00～24:00', '⑪': '21:00～24:00'
};

// 特殊シフト: 個人の出勤日数・時間には計上するが、店舗人数・登録販売者・鍵持ち集計からは除外する
const SPECIAL_SHIFTS = ['有休', '応援', '店長会', '研修', '勉強会', '希望休', '公休'];
// 希望休/公休は時間0扱い（実質「休」と同じ）。有休/応援/店長会/研修/勉強会は既定8h計上
const SPECIAL_OFF_LIKE = new Set(['希望休', '公休']);
const DEFAULT_SPECIAL_HOURS = 8;
const BUSINESS_START_LABEL = '8:15';
const BUSINESS_END_LABEL = '24:00';

const timeToMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};
const minToLabel = (mins) => {
    const m = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h === 0 ? 24 : h}:${String(mm).padStart(2, '0')}`;
};

// 前月16日〜当月15日締めの対象期間（Dateの配列）を返す
const getPeriodDates = (year, month) => {
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }
    const start = new Date(prevYear, prevMonth - 1, 16);
    const end = new Date(year, month - 1, 15);
    const dayCount = Math.round((end - start) / 86400000) + 1;
    return Array.from({ length: dayCount }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
};

const formatDateLabel = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const safeParse = (raw, fallback) => {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (e) {
        return fallback;
    }
};

// Cycle8 Take2: targetHours(月間目標計上時間)の保存契約。number | null のみ許可。
// 読み込み時は既存データ互換のため、無い/null/空文字/0/負数/非有限値/上限超過を
// すべて黙って未設定(null)へ正規化する(新規入力時のエラー表示とは別扱い)。
const TARGET_HOURS_MIN = 0.5;
const TARGET_HOURS_MAX = 744;
const normalizeStoredTargetHours = (raw) => {
    if (raw === null || raw === undefined || raw === '') return null;
    const parsed = parseStrictNumber(raw);
    if (!Number.isFinite(parsed)) return null;
    if (parsed < TARGET_HOURS_MIN || parsed > TARGET_HOURS_MAX) return null;
    return parsed;
};

const DEFAULT_DAYS = {
    '正社員': 23, '時間限定社員': 23, '準社員': 23,
    '早パート': 16, '中パート': 16, '遅パート': 16, 
    '早ロングパート': 20, '中ロングパート': 20, '遅ロングパート': 20
};

const INITIAL_DATA = [
    { name: 'K.D.', type: '正社員', isRS: true, days: 23, shifts: ['④', '⑦'], requests: '', isKeyHolder: true },
    { name: 'N.E.', type: '時間限定社員', isRS: true, days: 23, shifts: ['④'], requests: '', isKeyHolder: true },
    { name: 'N.K.', type: '正社員', isRS: true, days: 23, shifts: ['④', '⑦'], requests: '', isKeyHolder: true },
    { name: 'T.S.', type: '準社員', isRS: false, days: 23, shifts: ['④'], requests: '', isKeyHolder: false },
    { name: 'S.M.', type: '準社員', isRS: false, days: 23, shifts: ['④'], requests: '', isKeyHolder: false },
    { name: 'J.R.', type: '準社員', isRS: false, days: 23, shifts: ['⑦'], requests: '', isKeyHolder: false },
    { name: 'O.T.', type: '早ロングパート', isRS: false, days: 20, shifts: ['③'], requests: '', isKeyHolder: false },
    { name: 'K.T.', type: '早ロングパート', isRS: false, days: 20, shifts: ['③'], requests: '', isKeyHolder: false },
    { name: 'T.Y.', type: '中ロングパート', isRS: false, days: 20, shifts: ['⑤'], requests: '', isKeyHolder: false },
    { name: 'T.M.(1)', type: '遅ロングパート', isRS: false, days: 20, shifts: ['⑧'], requests: '', isKeyHolder: false },
    { name: 'O.K.', type: '早パート', isRS: false, days: 16, shifts: ['②'], requests: '', isKeyHolder: false },
    { name: 'T.M.(2)', type: '早パート', isRS: false, days: 16, shifts: ['①'], requests: '', isKeyHolder: false },
    { name: 'I.K.(1)', type: '早パート', isRS: false, days: 16, shifts: ['①'], requests: '', isKeyHolder: false },
    { name: 'M.T.', type: '早パート', isRS: false, days: 16, shifts: ['①'], requests: '', isKeyHolder: false },
    { name: 'H.M.', type: '早パート', isRS: false, days: 16, shifts: ['①'], requests: '', isKeyHolder: false },
    { name: 'Y.M.', type: '中パート', isRS: false, days: 16, shifts: ['⑥'], requests: '', isKeyHolder: false },
    { name: 'Y.I.', type: '遅パート', isRS: false, days: 16, shifts: ['⑨'], requests: '', isKeyHolder: false },
    { name: 'K.Y.', type: '遅パート', isRS: false, days: 16, shifts: ['⑨'], requests: '', isKeyHolder: false },
    { name: 'M.R.', type: '遅パート', isRS: false, days: 16, shifts: ['⑨'], requests: '', isKeyHolder: false },
    { name: 'O.Y.', type: '遅パート', isRS: false, days: 16, shifts: ['⑩'], requests: '', isKeyHolder: false },
    { name: 'I.H.', type: '遅パート', isRS: false, days: 16, shifts: ['⑩'], requests: '', isKeyHolder: false },
    { name: 'T.A.', type: '遅パート', isRS: false, days: 16, shifts: ['⑩'], requests: '', isKeyHolder: false },
    { name: 'I.K.(2)', type: '遅パート', isRS: false, days: 16, shifts: ['⑪'], requests: '', isKeyHolder: false },
    { name: 'N.H.', type: '遅パート', isRS: false, days: 16, shifts: ['⑪'], requests: '', isKeyHolder: false },
];

// ぽちぽちタイムピッカー: ▲▼刻み調整 + 中央表示タップで4桁直打ちに対応。
// 営業終了時刻として24:00を保持できるようにする（24を0に丸め込まない）。
// 矢印は従来通り時±1・分±15の個別ステップを維持し、中央表示だけを
// 単一のinputに切り替えて「0930」「1500」等の4桁直接入力を受け付ける(Cycle2 Take2)。
// 編集中(isEditing)は矢印ボタンをdisabledにする。理由(Cycle2 Take3):
// 編集中に矢印を押すと、blurで確定した入力値を、旧h/mを基準にした矢印の
// setH/setMが上書きしてしまう競合があった(Dex Take2差戻し)。disabledのボタンは
// クリックイベント自体を発火しない(フォーカスも奪わない)ため、
// 「編集完了(Enter/blur/Escape)してから矢印を押す」という順序を構造的に強制する。
export function TimePicker({ value, onChange }) {
    const [h, m] = (value && value.includes(':')) ? value.split(':').map(Number) : [9, 0];
    const [isEditing, setIsEditing] = useState(false);
    const [editingText, setEditingText] = useState('');

    const setH = (nh) => {
        const next = computeHourChange(m, nh);
        onChange(formatTime(next.h, next.m));
    };
    const setM = (nm) => {
        const next = computeMinuteChange(h, nm);
        onChange(formatTime(next.h, next.m));
    };

    const startEditing = () => {
        setIsEditing(true);
        setEditingText(`${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`);
    };
    const commitEditing = () => {
        // parseFourDigitTimeがnull(不正値・空欄)を返した場合は何もせず、
        // 表示は編集前のvalueへ戻る(Escapeと同じ結果になる)。
        const parsed = parseFourDigitTime(editingText);
        if (parsed) {
            onChange(formatTime(parsed.h, parsed.m));
        }
        setIsEditing(false);
        setEditingText('');
    };
    const cancelEditing = () => {
        setIsEditing(false);
        setEditingText('');
    };

    return (
        <div className="time-picker">
            <div className="time-picker-display">
                <div className="time-picker-col">
                    <button type="button" className="time-picker-step" disabled={isEditing} onClick={() => setH(h + 1)}><ArrowUp size={14} /></button>
                    <button type="button" className="time-picker-step" disabled={isEditing} onClick={() => setH(h - 1)}><ArrowDown size={14} /></button>
                </div>
                {isEditing ? (
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        autoFocus
                        className="time-picker-input"
                        value={editingText}
                        onChange={e => setEditingText(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                        onBlur={commitEditing}
                        onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); commitEditing(); }
                            if (e.key === 'Escape') { e.preventDefault(); cancelEditing(); }
                        }}
                        onFocus={e => e.target.select()}
                    />
                ) : (
                    <div className="time-picker-value" onClick={startEditing} title="タップして「0930」のように4桁で直接入力">
                        {formatTime(h, m)}
                    </div>
                )}
                <div className="time-picker-col">
                    <button type="button" className="time-picker-step" disabled={isEditing} onClick={() => setM(m + 15)}><ArrowUp size={14} /></button>
                    <button type="button" className="time-picker-step" disabled={isEditing} onClick={() => setM(m - 15)}><ArrowDown size={14} /></button>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [employees, setEmployees] = useState(() => {
        const loaded = safeParse(localStorage.getItem('shift_employees'), INITIAL_DATA);
        // Cycle8 Take2: 既存データ(targetHoursが無い/不正値)を安全に補完する。他項目は変更しない。
        return loaded.map(emp => ({ ...emp, targetHours: normalizeStoredTargetHours(emp.targetHours) }));
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState(() => safeParse(localStorage.getItem('shift_generatedResult'), null));
    // INFEASIBLE時(通常出力を停止した場合)の違反一覧。表は更新せず、この情報だけを表示する。
    const [infeasibleInfo, setInfeasibleInfo] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);

    // シフトパターンマスター（カスタムシフト対応）
    const [shiftMaster, setShiftMaster] = useState(() => {
        const saved = safeParse(localStorage.getItem('shift_custom_master'), null);
        return (saved && typeof saved === 'object') ? saved : SHIFT_MASTER;
    });

    useEffect(() => {
        localStorage.setItem('shift_custom_master', JSON.stringify(shiftMaster));
    }, [shiftMaster]);

    // Settings State
    const [thickDays, setThickDays] = useState(() => safeParse(localStorage.getItem('shift_thickDays'), []));
    const [weekdayRanks, setWeekdayRanks] = useState(() => safeParse(localStorage.getItem('shift_weekdayRanks'), { 6: 1, 5: 2, 1: 3, 2: 4, 4: 5, 3: 6, 0: 7 }));
    const [weekdayMinStaff, setWeekdayMinStaff] = useState(() => safeParse(localStorage.getItem('shift_weekdayMinStaff'), { 6: 0, 5: 0, 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }));

    useEffect(() => {
        localStorage.setItem('shift_weekdayRanks', JSON.stringify(weekdayRanks));
    }, [weekdayRanks]);

    useEffect(() => {
        localStorage.setItem('shift_weekdayMinStaff', JSON.stringify(weekdayMinStaff));
    }, [weekdayMinStaff]);

    // Date State
    const [currentYear, setCurrentYear] = useState(() => {
        const saved = localStorage.getItem('shift_year');
        return saved ? parseInt(saved, 10) : new Date().getFullYear();
    });
    const [currentMonth, setCurrentMonth] = useState(() => {
        const saved = localStorage.getItem('shift_month');
        return saved ? parseInt(saved, 10) : new Date().getMonth() + 1;
    });

    useEffect(() => {
        localStorage.setItem('shift_year', currentYear);
        localStorage.setItem('shift_month', currentMonth);
    }, [currentYear, currentMonth]);

    const changeMonth = (offset) => {
        let newMonth = currentMonth + offset;
        let newYear = currentYear;
        if (newMonth > 12) { newMonth = 1; newYear++; }
        if (newMonth < 1) { newMonth = 12; newYear--; }
        setCurrentYear(newYear);
        setCurrentMonth(newMonth);
        setGeneratedResult(null);
        clearHistory(); // Cycle9: 月変更はUndo/Redo履歴をクリアする
        closeInteractiveState();
    };
    
    // Mobile View State
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
    const [isNarrowViewport, setIsNarrowViewport] = useState(window.innerWidth <= 768);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Drag and Drop (行の並べ替え専用)
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);
    // Cycle9: 行drag('employee')とセルdrag('cell')を同時発火させないための種別ref。
    const dragKindRef = useRef(null);
    // Cycle9: PCのセル交換drag&drop用(交換元セル座標)。
    const cellDragSourceRef = useRef(null);

    // Cycle9: Undo/Redo履歴(メモリ内のみ、localStorageへは保存しない・再読込で0件に戻る)。
    const [historyPast, setHistoryPast] = useState([]);
    const [historyFuture, setHistoryFuture] = useState([]);

    // Cycle9: セル編集画面(短タップ/クリック/Enter/Spaceで開く)。
    const [cellEditor, setCellEditor] = useState(null); // { i, d } | null
    const [cellDraft, setCellDraft] = useState(null);
    // Cycle9: スマホ2点タップ交換・PCキーボード2点交換の「交換元」待ち状態。
    const [swapPending, setSwapPending] = useState(null); // { i, d } | null

    // Cycle9: pointerdown〜pointerupで短タップ/スワイプを判定するための追跡状態(refのみ、stateにしない)。
    const pointerTrackRef = useRef(null);
    const activePointersRef = useRef(new Set());

    // Cycle9: 変更前スナップショットを記録してから関連stateを1トランザクションとして
    // 更新する共通commit関数。すべてのmatrix変更操作(セル編集・交換・希望休ランダム・
    // 行並べ替え・自動生成成功・空欄自動作成成功)はこれを経由する。
    const commitHistory = (label, applyFn) => {
        const snapshot = {
            generatedResult: structuredClone(generatedResult),
            employees: structuredClone(employees),
            shiftMaster: structuredClone(shiftMaster),
            label
        };
        setHistoryPast(prev => pushSnapshot(prev, snapshot));
        setHistoryFuture([]);
        applyFn();
    };

    const clearHistory = () => {
        setHistoryPast([]);
        setHistoryFuture([]);
    };

    // 進行中のセル編集・交換待ち・drag状態をすべて閉じる(月変更・タブ変更・生成開始・
    // 従業員構成変更・リセット・Undo/Redoで共通して呼ぶ)。
    const closeInteractiveState = () => {
        setCellEditor(null);
        setSwapPending(null);
        dragItem.current = null;
        dragOverItem.current = null;
        dragKindRef.current = null;
        cellDragSourceRef.current = null;
        pointerTrackRef.current = null;
    };

    const currentHistorySnapshot = () => ({
        generatedResult: structuredClone(generatedResult),
        employees: structuredClone(employees),
        shiftMaster: structuredClone(shiftMaster),
        label: 'current'
    });

    const applyHistorySnapshot = (snap) => {
        setGeneratedResult(snap.generatedResult);
        setEmployees(snap.employees);
        setShiftMaster(snap.shiftMaster);
        closeInteractiveState();
    };

    const handleUndo = () => {
        if (isGenerating) return;
        const result = undoStep(historyPast, historyFuture, currentHistorySnapshot());
        if (!result) return;
        setHistoryPast(result.past);
        setHistoryFuture(result.future);
        applyHistorySnapshot(result.restored);
    };

    const handleRedo = () => {
        if (isGenerating) return;
        const result = redoStep(historyPast, historyFuture, currentHistorySnapshot());
        if (!result) return;
        setHistoryPast(result.past);
        setHistoryFuture(result.future);
        applyHistorySnapshot(result.restored);
    };

    // Ctrl/Cmd+Z(Undo)、Ctrl/Cmd+Shift+Z または Ctrl+Y(Redo)。input/textarea/select/
    // contenteditable内やセル編集draft入力中はブラウザ標準Undoを横取りしない。
    // 実際にUndo/Redoできる場合だけpreventDefault()する。
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Cycle9: Escapeでdrag状態(行drag/セル交換drag)とスワイプ待ちを必ず消す。
            if (e.key === 'Escape') {
                dragItem.current = null;
                dragOverItem.current = null;
                dragKindRef.current = null;
                cellDragSourceRef.current = null;
                if (swapPending) setSwapPending(null);
                return;
            }

            if (!(e.ctrlKey || e.metaKey)) return;
            const key = e.key.toLowerCase();
            const isUndoKey = key === 'z' && !e.shiftKey;
            const isRedoKey = (key === 'z' && e.shiftKey) || key === 'y';
            if (!isUndoKey && !isRedoKey) return;

            const target = e.target;
            const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable)) return;
            if (cellEditor) return; // 編集画面のdraft入力中はグローバルUndo/Redoを発火させない
            if (isGenerating) return;

            if (isUndoKey) {
                if (historyPast.length === 0) return;
                e.preventDefault();
                handleUndo();
            } else if (isRedoKey) {
                if (historyFuture.length === 0) return;
                e.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyPast, historyFuture, cellEditor, isGenerating, generatedResult, employees, shiftMaster, swapPending]);

    // Cycle5: ダッシュボードのマトリクス表(横スクロール領域)を左右ボタンから操作するためのref。
    const tableContainerRef = useRef(null);
    const scrollTableBy = (offset) => {
        tableContainerRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
    };

    // Cycle6: 上部の大きな矢印ボタンを廃止し、表の左右の切れ目にフロートする半透明ボタンへ変更。
    // scrollLeftが既に端に達している方向のボタンはフェードアウトさせる(「隠れている方向にだけ導く」仕様)。
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const updateScrollButtons = () => {
        const el = tableContainerRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    
    // Cycle9: 行の並べ替えはUndo/Redo履歴対象(行dragハンドル専用、dragKindRef==='employee'の
    // 場合だけ処理する。セル交換drag('cell')と干渉しない)。
    const handleSort = () => {
        const isEmployeeDrag = dragKindRef.current === 'employee';
        if (isEmployeeDrag && !isGenerating && dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            const from = dragItem.current;
            const to = dragOverItem.current;
            commitHistory(`${employees[from]?.name || ''}の並び替え`, () => {
                let _employees = [...employees];
                const draggedItemContent = _employees.splice(from, 1)[0];
                _employees.splice(to, 0, draggedItemContent);
                setEmployees(_employees);

                if (generatedResult?.matrix) {
                    let _matrix = [...generatedResult.matrix];
                    const draggedMatrixContent = _matrix.splice(from, 1)[0];
                    _matrix.splice(to, 0, draggedMatrixContent);
                    setGeneratedResult(prev => ({ ...(prev || {}), matrix: _matrix }));
                }
            });
        }
        dragItem.current = null;
        dragOverItem.current = null;
        dragKindRef.current = null;
    };

    const moveEmployee = (index, direction) => {
        if (isGenerating) return;
        if (direction === -1 && index === 0) return;
        if (direction === 1 && index === employees.length - 1) return;

        const newIndex = index + direction;

        commitHistory(`${employees[index]?.name || ''}の並び替え`, () => {
            let _employees = [...employees];
            const item = _employees.splice(index, 1)[0];
            _employees.splice(newIndex, 0, item);
            setEmployees(_employees);

            if (generatedResult?.matrix) {
                let _matrix = [...generatedResult.matrix];
                const matrixItem = _matrix.splice(index, 1)[0];
                _matrix.splice(newIndex, 0, matrixItem);
                setGeneratedResult(prev => ({ ...(prev || {}), matrix: _matrix }));
            }
        });
    };

    useEffect(() => {
        localStorage.setItem('shift_employees', JSON.stringify(employees));
    }, [employees]);

    useEffect(() => {
        if (generatedResult) {
            localStorage.setItem('shift_generatedResult', JSON.stringify(generatedResult));
        } else {
            localStorage.removeItem('shift_generatedResult');
        }
    }, [generatedResult]);

    useEffect(() => {
        localStorage.setItem('shift_thickDays', JSON.stringify(thickDays));
    }, [thickDays]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth <= 768);
            setIsNarrowViewport(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Modal Form State
    const [empName, setEmpName] = useState('');
    const [empType, setEmpType] = useState('正社員');
    const [empRS, setEmpRS] = useState(false);
    const [empIsKeyHolder, setEmpIsKeyHolder] = useState(false);
    const [empDays, setEmpDays] = useState(23);
    const [empRequests, setEmpRequests] = useState('');
    const [empTargetHours, setEmpTargetHours] = useState(''); // Cycle8 Take2: 文字列で保持し、空欄=未設定
    const [selectedShifts, setSelectedShifts] = useState(['④', '⑦']);

    // Cycle7: スマホでは氏名セルのサブ情報(属性・累積実績)を常時非表示にする代わりに、
    // 氏名セルタップで詳細ポップオーバーを表示する。
    const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState(null); // 従業員index | null
    // Cycle7 Take2(Dex差戻し): ダイアログを閉じたとき、開いた起動元(氏名セル)へ
    // フォーカスを戻すために、開いた瞬間のトリガー要素を保持しておく。
    const employeeDetailTriggerRef = useRef(null);
    const employeeDetailCloseBtnRef = useRef(null);
    const openEmployeeDetail = (i, triggerEl) => {
        employeeDetailTriggerRef.current = triggerEl;
        setSelectedEmployeeForDetail(i);
    };
    const closeEmployeeDetail = () => {
        setSelectedEmployeeForDetail(null);
        employeeDetailTriggerRef.current?.focus();
    };
    // ダイアログが開いたら、まず閉じるボタンへフォーカスを移す(必須修正2)。
    useEffect(() => {
        if (selectedEmployeeForDetail !== null) {
            employeeDetailCloseBtnRef.current?.focus();
        }
    }, [selectedEmployeeForDetail]);

    // Cycle11 5.1: 氏名列の折りたたみはUI専用state。localStorage/Undo/Redo/generatedResultへ
    // 保存しない(仕様上、リロードやUndo/Redoで常にfalseへ戻ってよい)。
    const [isNameColumnCollapsed, setIsNameColumnCollapsed] = useState(false);
    // スマホ専用: 全画面フルスクリーン表示モード
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Cycle7: PC版のズームコントロール(スマホでは常に100%固定・zoom未適用)。
    const ZOOM_STEP = 10;
    const ZOOM_MIN = 50;
    const ZOOM_MAX = 150;
    const [zoomLevel, setZoomLevel] = useState(100);
    const zoomIn = () => setZoomLevel((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
    const zoomOut = () => setZoomLevel((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));

    // Cycle7 Take3(Dex差戻し): Take2では現在のzoom比率で`table.scrollWidth`を
    // 除算して自然幅を逆算していたが、実ブラウザでは`table.scrollWidth`をCSS
    // zoom適用後の値として単純に扱えない(かつ`table { min-width: 100% }`の影響で
    // 広いコンテナではレイアウト幅自体が広がる)ため、この逆算は自然幅を過大評価し、
    // 「フィット済みのまま操作すると縮む」「コンテナを広げても倍率が下がる」という
    // 不具合を引き起こしていた(Dex実機確認で発覚)。
    // 対策として、測定の瞬間だけ`zoom`を100%へ戻してから`scrollWidth`を読み、
    // 直後に元のzoomへ戻す。これにより現在の倍率に依存しない「本当の自然幅」を
    // 都度直接測定でき、逆算・推測が一切不要になる(React state更新を介さない
    // 同期的なDOMスタイルの読み書きのため、ちらつきは発生しない)。
    //
    // Cycle7 Take4(Dex差戻し): 測定中(`scrollWidth`読み取り含む)に例外が
    // 発生した場合でも、必ず元のzoomへ復元する(`try/finally`)。また、
    // 測定できない/失敗した場合はnullを返し、呼び出し側はその場合
    // `setZoomLevel`を呼ばない設計にする。closureに残った古いzoomLevelを
    // フォールバック値として適用しないため、失敗時は現在の表示状態を保持する。
    const computeFitZoom = () => {
        const container = tableContainerRef.current;
        const table = container?.querySelector('table');
        if (!container || !table || !container.clientWidth) return null;
        const previousZoom = table.style.zoom;
        try {
            table.style.zoom = '100%';
            const naturalWidth = table.scrollWidth;
            if (!naturalWidth) return null;
            const fit = Math.floor((container.clientWidth / naturalWidth) * 100);
            return Math.max(ZOOM_MIN, Math.min(100, fit));
        } catch {
            return null;
        } finally {
            table.style.zoom = previousZoom;
        }
    };
    const zoomFit = () => {
        const fit = computeFitZoom();
        if (fit !== null) setZoomLevel(fit);
    };

    // 自由時間指定（従業員編集モーダル用）
    const [useCustomTime, setUseCustomTime] = useState(false);
    const [customStartTime, setCustomStartTime] = useState('09:00');
    const [customEndTime, setCustomEndTime] = useState('18:00');

    const addCustomShiftToEmployee = () => {
        if (!customStartTime || !customEndTime) return;
        const timeStr = `${customStartTime}～${customEndTime}`;
        setShiftMaster(prev => ({ ...prev, [timeStr]: timeStr }));
        setSelectedShifts(prev => prev.includes(timeStr) ? prev : [...prev, timeStr]);
        setCustomStartTime('09:00');
        setCustomEndTime('18:00');
    };

    // シフトパターン管理（ルール設定タブ用）
    const [newShiftName, setNewShiftName] = useState('');
    const [newShiftStart, setNewShiftStart] = useState('09:00');
    const [newShiftEnd, setNewShiftEnd] = useState('18:00');

    const addShiftPattern = () => {
        if (!newShiftName || !newShiftStart || !newShiftEnd) return;
        setShiftMaster(prev => ({ ...prev, [newShiftName]: `${newShiftStart}～${newShiftEnd}` }));
        setNewShiftName('');
        setNewShiftStart('09:00');
        setNewShiftEnd('18:00');
        clearHistory(); // Cycle9: シフトマスターの手動構成変更は履歴をクリアする
    };

    const deleteShiftPattern = (id) => {
        const newMaster = { ...shiftMaster };
        delete newMaster[id];
        setShiftMaster(newMaster);
        clearHistory(); // Cycle9: シフトマスターの手動構成変更は履歴をクリアする
    };

    const handleTypeChange = (type, updateDays = true) => {
        setEmpType(type);
        if (updateDays) setEmpDays(DEFAULT_DAYS[type]);
        
        if (type === '正社員') setSelectedShifts(['④', '⑦']);
        else if (type === '時間限定社員' || type === '準社員') {
            if (!selectedShifts.includes('④') && !selectedShifts.includes('⑦')) setSelectedShifts(['④']);
            else if (selectedShifts.length > 1) setSelectedShifts([selectedShifts[0]]);
        }
        else if (type === '早パート') setSelectedShifts(['①']);
        else if (type === '早ロングパート') setSelectedShifts(['③']);
        else if (type === '中パート') setSelectedShifts(['⑥']);
        else if (type === '中ロングパート') setSelectedShifts(['⑤']);
        else if (type === '遅パート') setSelectedShifts(['⑨']);
        else if (type === '遅ロングパート') setSelectedShifts(['⑧']);
    };

    const openModal = (index = null) => {
        if (index !== null) {
            const emp = employees[index];
            setEditingIndex(index);
            setEmpName(emp.name);
            setEmpType(emp.type);
            setEmpRS(emp.isRS);
            setEmpIsKeyHolder(!!emp.isKeyHolder);
            setEmpDays(emp.days);
            setEmpRequests(emp.requests || '');
            setEmpTargetHours(typeof emp.targetHours === 'number' && Number.isFinite(emp.targetHours) ? String(emp.targetHours) : '');
            setSelectedShifts([...emp.shifts]);
        } else {
            setEditingIndex(null);
            setEmpName('');
            setEmpRS(false);
            setEmpIsKeyHolder(false);
            setEmpRequests('');
            setEmpTargetHours('');
            handleTypeChange('正社員', true);
        }
        setUseCustomTime(false);
        setCustomStartTime('09:00');
        setCustomEndTime('18:00');
        setShowModal(true);
    };

    // Cycle8 Take2: 生成条件(氏名/雇用区分/資格/鍵/契約日数/希望休/勤務可能シフト)が
    // 変化した場合だけgeneratedResultを破棄する。targetHoursだけの変更では保持する。
    const isGenerationRelevantChange = (oldEmp, newEmp) => {
        if (!oldEmp) return true; // 新規追加相当
        if (oldEmp.name !== newEmp.name) return true;
        if (oldEmp.type !== newEmp.type) return true;
        if (oldEmp.isRS !== newEmp.isRS) return true;
        if (!!oldEmp.isKeyHolder !== !!newEmp.isKeyHolder) return true;
        if (oldEmp.days !== newEmp.days) return true;
        if ((oldEmp.requests || '') !== (newEmp.requests || '')) return true;
        const oldShifts = oldEmp.shifts || [];
        const newShifts = newEmp.shifts || [];
        if (oldShifts.length !== newShifts.length) return true;
        if (oldShifts.some((s, idx) => s !== newShifts[idx])) return true;
        return false;
    };

    const saveEmployee = () => {
        const rawTargetHours = empTargetHours.trim();
        let targetHours = null;
        if (rawTargetHours !== '') {
            const parsed = parseStrictNumber(rawTargetHours);
            if (!Number.isFinite(parsed) || parsed < TARGET_HOURS_MIN || parsed > TARGET_HOURS_MAX) {
                alert(`月間目標計上時間は${TARGET_HOURS_MIN}〜${TARGET_HOURS_MAX}の範囲の数値で入力してください（空欄で未設定にできます）。`);
                return;
            }
            targetHours = parsed;
        }

        const emp = {
            name: empName || '名称未設定',
            type: empType,
            isRS: empRS,
            isKeyHolder: empIsKeyHolder,
            days: parseInt(empDays, 10),
            shifts: [...selectedShifts],
            requests: empRequests,
            targetHours
        };
        const previousEmp = editingIndex !== null ? employees[editingIndex] : null;
        const newData = [...employees];
        if (editingIndex !== null) newData[editingIndex] = emp;
        else newData.push(emp);

        setEmployees(newData);
        setShowModal(false);
        if (isGenerationRelevantChange(previousEmp, emp)) {
            setGeneratedResult(null); // 生成条件が変わった場合だけ結果を破棄する
        }
        clearHistory(); // Cycle9: 従業員の追加・編集は無条件で履歴をクリアする
        closeInteractiveState();
    };

    const deleteEmployee = (index) => {
        if(window.confirm(`「${employees[index].name}」を削除してもよろしいですか？`)) {
            const newData = [...employees];
            newData.splice(index, 1);
            setEmployees(newData);
            setGeneratedResult(null);
            clearHistory(); // Cycle9: 従業員の削除は履歴をクリアする
            closeInteractiveState();
        }
    };

    const API_URL = 'https://shift-app-rw01.onrender.com/api/generate_shift';

    // Take2 P1-2: 自由時間(__custom__prefixのID)はそのセルだけの即席勤務であり、通常の
    // 自動生成候補ではない。既定では全件除外し、空欄自動作成が固定セルとして参照中の
    // IDだけをallowedCustomIdsで明示的に許可する(通常生成では常に除外=allowedCustomIds省略)。
    const buildShiftTypesPayload = (allowedCustomIds = []) => {
        const allowedSet = new Set(allowedCustomIds);
        const realShifts = Object.entries(shiftMaster)
            .filter(([id]) => !id.startsWith('__custom__') || allowedSet.has(id))
            .map(([id, timeStr]) => {
                const [start, end] = timeStr.split('～');
                return { id, start_time: start, end_time: end, is_special: false };
            });
        // 希望休はバックエンドへ独立シフト種別として送らない。既存のrequests_off(希望休テキスト欄)
        // 経由のOFF強制ハード制約に一本化し、セル手動固定との二重管理・衝突を構造的に防ぐ。
        const specialShifts = SPECIAL_SHIFTS.filter(s => s !== '希望休').map(id => ({ id, start_time: '0:00', end_time: '0:00', is_special: true }));
        return [...realShifts, ...specialShifts];
    };

    // Take3 P1-1(Dex差戻し): 元配列が非空でも、中身が削除済み/未知IDだけの場合、
    // バックエンドは「現在のshift_typesに対する有効ID0件」を「全シフト可」と解釈し
    // (shift_solver.py:184-187)、自由時間IDまで対象に含まれてしまう。deleteShiftPattern()は
    // shiftMasterから削除するだけで、参照中のemployees[].shiftsは更新しないため、
    // 「④だけ選択→ルール設定で④を削除」という通常操作だけでこの状態に到達できる。
    // 「元配列の長さ」ではなく「現在の通常shiftMasterに実在するIDが1件以上か」で判定する。
    const normalShiftIds = () => Object.keys(shiftMaster).filter(id => !id.startsWith('__custom__'));
    const resolveAllowedShifts = (shifts) => {
        const normalSet = new Set(normalShiftIds());
        const valid = [...new Set(Array.isArray(shifts) ? shifts : [])].filter(id => normalSet.has(id));
        return valid.length > 0 ? valid : normalShiftIds();
    };

    const buildRequestsOff = (periodDatesForSubmit) => {
        let allRequestsOff = [];
        employees.forEach((e, idx) => {
            if (e.requests) {
                const days = e.requests.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                days.forEach(day => {
                    const dateObj = periodDatesForSubmit[day - 1];
                    if (dateObj) {
                        allRequestsOff.push({
                            employee_id: `emp_${idx}`,
                            date: toISODate(dateObj)
                        });
                    }
                });
            }
        });
        return allRequestsOff;
    };

    const generateShift = async (allowWarningDraft = false) => {
        // Take3 P1-1: 通常シフトが1件も無い場合、allowed_shiftsを明示しようがなく、
        // solverが必ず「全シフト可」へフォールバックしてしまう。fetch自体を送らず、
        // 表・履歴・生成結果を一切変更せずに理由を表示して安全停止する。
        if (normalShiftIds().length === 0) {
            alert('通常のシフトパターンが1件もありません。ルール設定でシフトパターンを追加してから実行してください。');
            return;
        }
        setIsGenerating(true);
        closeInteractiveState(); // Cycle9: 生成中はセル編集・交換・drag状態を発生させない
        // P4 Take4指摘: 応答を受け取る前に表を消してはいけない。INFEASIBLE・HTTPエラー・
        // 通信例外のいずれでも、既存の表(手編集済みセル含む)とlocalStorageの内容を保持する。
        // 表の置換は、成功した通常生成、または利用者が明示選択した警告付き仮シフトの
        // 応答を受け取った時点(下のSUCCESS/FEASIBLE_WITH_WARNINGS分岐)でのみ行う。

        try {
            const periodDatesForSubmit = getPeriodDates(currentYear, currentMonth);
            const payload = {
                year: currentYear,
                month: currentMonth,
                employees: employees.map((e, idx) => ({
                    id: `emp_${idx}`,
                    name: e.name,
                    employment_type: e.type,
                    contract_days: e.days,
                    is_registered_seller: e.isRS,
                    allowed_shifts: resolveAllowedShifts(e.shifts)
                })),
                shift_types: buildShiftTypesPayload(),
                requests_off: buildRequestsOff(periodDatesForSubmit),
                thick_staffing_days: thickDays,
                weekday_ranks: weekdayRanks,
                weekday_min_staff: weekdayMinStaff,
                fixed_assignments: [],
                allow_warning_draft: allowWarningDraft
            };

            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && data.status === "INFEASIBLE") {
                // Kazumax確定仕様: 通常出力は停止し、現在の表は更新しない。
                // 違反箇所を提示し、利用者が明示選択した場合のみ警告付き仮シフトを表示する。
                // Take2 P2-2: 関数自体をstateへ保存すると、Undo等で状態が変わった後に
                // 再試行しても古いrenderのemployees/matrix/shiftMasterを使ってしまうため、
                // 種別(kind)だけを保存し、再試行ボタン押下時に最新renderから呼び出す。
                setInfeasibleInfo({ violations: data.violations || [], message: data.message, kind: 'generate' });
            } else if (res.ok && (data.status === "SUCCESS" || data.status === "FEASIBLE_WITH_WARNINGS")) {
                setInfeasibleInfo(null);
                const rawMatrix = employees.map((emp, idx) => {
                    const empShifts = data.shifts[`emp_${idx}`] || [];
                    return empShifts.map(s => ({ shift: s, isError: false, isFixed: false }));
                });
                // Take2 P1-1: バックエンドは希望休を常に'休'として返すため、生成開始時点の
                // 希望休日(employees[].requests、生成前のclosure値)を、成功レスポンスの
                // 該当セルが'休'であれば'希望休'へ戻してから履歴コミットする。
                const newMatrix = restoreRequestedOffInMatrix(rawMatrix, employees);
                // Cycle9: 自動生成の成功だけを1履歴として記録する(通信開始時には記録しない)。
                commitHistory('最適化シフトの生成', () => {
                    setGeneratedResult({
                        matrix: newMatrix,
                        hasError: data.status === "FEASIBLE_WITH_WARNINGS",
                        warnings: data.warnings || [],
                        isWarningDraft: !!data.is_warning_draft,
                        violations: data.violations || []
                    });
                    setEmployees(prevEmployees => buildRequestsFromMatrix(newMatrix, prevEmployees));
                });
            } else {
                alert("シフト生成に失敗しました: \n" + (data.detail || data.message || "制約が厳しすぎるため解が見つかりませんでした。希望休や登録販売者の数を見直してください。"));
            }
        } catch (e) {
            alert("通信エラーが発生しました: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // 「空欄自動作成」: 既に値が入っているセル(手動編集/前回生成結果)はそのまま固定し、
    // 空欄セルのみをバックエンドへ送って穴埋めする
    const fillBlanks = async (allowWarningDraft = false) => {
        // Take3 P1-1: 通常シフトが1件も無い場合はfetchせず安全停止する(generateShiftと同様)。
        if (normalShiftIds().length === 0) {
            alert('通常のシフトパターンが1件もありません。ルール設定でシフトパターンを追加してから実行してください。');
            return;
        }
        setIsGenerating(true);
        closeInteractiveState(); // Cycle9: 生成中はセル編集・交換・drag状態を発生させない

        try {
            const periodDatesForSubmit = getPeriodDates(currentYear, currentMonth);
            let fixedAssignments = [];
            employees.forEach((e, idx) => {
                (generatedResult?.matrix?.[idx] || []).forEach((cell, d) => {
                    if (cell && cell.shift) {
                        // 希望休はバックエンド未登録の独立シフト種別ではないため、OFFとして送る
                        // （表示上は引き続き「希望休」のまま保護される）
                        const shiftId = (cell.shift === '休' || cell.shift === '希望休') ? 'OFF' : cell.shift;
                        fixedAssignments.push({
                            employee_id: `emp_${idx}`,
                            day_index: d,
                            shift_id: shiftId
                        });
                    }
                });
            });
            // Take2 P1-2: 固定セルとして現に参照中の自由時間IDだけをshift_typesへ許可する
            // (それ以外の自由時間IDは通常の自動生成候補へ含めない)。
            const referencedCustomIds = fixedAssignments
                .map(fa => fa.shift_id)
                .filter(id => typeof id === 'string' && id.startsWith('__custom__'));

            const payload = {
                year: currentYear,
                month: currentMonth,
                employees: employees.map((e, idx) => ({
                    id: `emp_${idx}`,
                    name: e.name,
                    employment_type: e.type,
                    contract_days: e.days,
                    is_registered_seller: e.isRS,
                    allowed_shifts: resolveAllowedShifts(e.shifts)
                })),
                shift_types: buildShiftTypesPayload(referencedCustomIds),
                requests_off: buildRequestsOff(periodDatesForSubmit),
                thick_staffing_days: thickDays,
                weekday_ranks: weekdayRanks,
                weekday_min_staff: weekdayMinStaff,
                fixed_assignments: fixedAssignments,
                allow_warning_draft: allowWarningDraft
            };

            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && data.status === "INFEASIBLE") {
                // 通常出力は停止し、現在の表(保護セルを含む)は一切変更しない。
                // Take2 P2-2: 関数自体をstateへ保存せず、種別(kind)だけを保存する。
                setInfeasibleInfo({ violations: data.violations || [], message: data.message, kind: 'fill' });
            } else if (res.ok && (data.status === "SUCCESS" || data.status === "FEASIBLE_WITH_WARNINGS")) {
                setInfeasibleInfo(null);
                const rawMatrix = employees.map((emp, idx) => {
                    const empShifts = data.shifts[`emp_${idx}`] || [];
                    if (!generatedResult || !generatedResult.matrix || !generatedResult.matrix[idx]) return empShifts.map(s => ({ shift: s, isError: false, isFixed: false }));
                    return generatedResult.matrix[idx].map((cell, d) => {
                        if (cell && cell.shift) return cell; // 保護セルはそのまま維持
                        const s = empShifts[d];
                        return { shift: s === undefined ? '休' : s, isError: false, isFixed: false };
                    });
                });
                // Take2 P1-1: 空欄自動作成でも、生成開始時点の希望休日は'休'ではなく
                // '希望休'として画面へ戻す(保護セル以外の新規空欄埋め分が対象)。
                const newMatrix = restoreRequestedOffInMatrix(rawMatrix, employees);
                // Cycle9: 空欄自動作成の成功だけを1履歴として記録する。
                commitHistory('空欄自動作成', () => {
                    setGeneratedResult({
                        matrix: newMatrix,
                        hasError: data.status === "FEASIBLE_WITH_WARNINGS",
                        warnings: data.warnings || [],
                        isWarningDraft: !!data.is_warning_draft,
                        violations: data.violations || []
                    });
                    setEmployees(prevEmployees => buildRequestsFromMatrix(newMatrix, prevEmployees));
                });
            } else {
                alert("空欄自動作成に失敗しました: \n" + (data.detail || data.message || "制約が厳しすぎるため解が見つかりませんでした。"));
            }
        } catch (e) {
            alert("通信エラーが発生しました: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // Cycle9: セル同士の内容比較(no-op判定用)。両者ともshiftが無ければ等価として扱う。
    const cellsAreEquivalent = (a, b) => {
        const na = a && a.shift ? a : {};
        const nb = b && b.shift ? b : {};
        return JSON.stringify(na) === JSON.stringify(nb);
    };

    const getCurrentMatrixOrBlank = () => {
        return generatedResult ? generatedResult.matrix : employees.map(() => periodDates.map(() => ({})));
    };

    // Cycle9: セルbutton(短タップ/クリック/Enter/Space)を開く。交換待ち中は
    // 有効な操作を「交換確定」または「同じセル再タップ=キャンセル」として処理する。
    const openCellEditor = (i, d) => {
        if (isGenerating) return;
        if (swapPending) {
            if (swapPending.i === i && swapPending.d === d) {
                setSwapPending(null);
            } else {
                performSwap(swapPending.i, swapPending.d, i, d);
                setSwapPending(null);
            }
            return;
        }
        const cell = generatedResult?.matrix?.[i]?.[d] || null;
        const isFreeTime = !!(cell && typeof cell.shift === 'string' && cell.shift.startsWith('__custom__'));
        const freeRange = isFreeTime && shiftMaster[cell.shift] ? shiftMaster[cell.shift].split('～') : null;
        setCellDraft({
            useFreeTime: isFreeTime,
            shiftId: isFreeTime ? '' : (cell?.shift || ''),
            freeStart: freeRange ? freeRange[0] : '09:00',
            freeEnd: freeRange ? freeRange[1] : '18:00',
            hours: cell?.hours ?? DEFAULT_SPECIAL_HOURS,
            note: cell?.note || ''
        });
        setCellEditor({ i, d });
    };

    const closeCellEditor = () => {
        setCellEditor(null);
        setCellDraft(null);
    };

    // Cycle9: 「保存」。キャンセル・不正入力・同値保存ではセルも履歴も変更しない。
    const saveCellDraft = () => {
        if (!cellEditor || !cellDraft) return;
        const { i, d } = cellEditor;
        let shiftId;

        if (cellDraft.useFreeTime) {
            if (!isValidFreeTimeRange(cellDraft.freeStart, cellDraft.freeEnd)) {
                alert('自由時間は 00:00 <= 開始 < 終了 <= 24:00 の形式で入力してください（開始に24:00は使えません）。');
                return;
            }
            shiftId = buildFreeTimeShiftId(cellDraft.freeStart, cellDraft.freeEnd);
        } else {
            shiftId = cellDraft.shiftId || '';
        }

        const isSpecial = shiftId !== '' && SPECIAL_SHIFTS.includes(shiftId) && !SPECIAL_OFF_LIKE.has(shiftId);
        if (isSpecial && !isValidSpecialHours(cellDraft.hours)) {
            alert('勤務時間は0〜24の範囲の数値で入力してください。');
            return;
        }

        const mode = shiftId === '' ? 'empty' : (isSpecial ? 'special' : 'normal');
        const newCell = buildCellForSave({
            mode,
            shiftId,
            hours: isSpecial ? parseStrictNumber(cellDraft.hours) : undefined,
            note: cellDraft.note
        });

        const currentMatrix = getCurrentMatrixOrBlank();
        const currentCell = currentMatrix?.[i]?.[d] || {};
        if (cellsAreEquivalent(currentCell, newCell)) {
            closeCellEditor();
            return; // 同値保存では変更しない
        }

        const empName = employees[i]?.name || '';
        const dateLabel = periodDates[d] ? formatDateLabel(periodDates[d]) : '';
        commitHistory(`${empName} ${dateLabel}の勤務変更`, () => {
            const newMatrix = currentMatrix.map(row => [...row]);
            newMatrix[i][d] = newCell;
            if (cellDraft.useFreeTime) {
                setShiftMaster(prev => ({ ...prev, [shiftId]: `${cellDraft.freeStart}～${cellDraft.freeEnd}` }));
            }
            setGeneratedResult(prev => ({ ...(prev || {}), matrix: newMatrix }));
            setEmployees(prevEmployees => buildRequestsFromMatrix(newMatrix, prevEmployees));
        });
        closeCellEditor();
    };

    // 「セルを空にする」: draftを経由せず直接空セルとして保存する。
    const clearCellFromEditor = () => {
        if (!cellEditor) return;
        const { i, d } = cellEditor;
        const currentMatrix = getCurrentMatrixOrBlank();
        const currentCell = currentMatrix?.[i]?.[d] || {};
        if (cellsAreEquivalent(currentCell, {})) {
            closeCellEditor();
            return;
        }
        const empName = employees[i]?.name || '';
        const dateLabel = periodDates[d] ? formatDateLabel(periodDates[d]) : '';
        commitHistory(`${empName} ${dateLabel}を空にする`, () => {
            const newMatrix = currentMatrix.map(row => [...row]);
            newMatrix[i][d] = {};
            setGeneratedResult(prev => ({ ...(prev || {}), matrix: newMatrix }));
            setEmployees(prevEmployees => buildRequestsFromMatrix(newMatrix, prevEmployees));
        });
        closeCellEditor();
    };

    // 「このシフトを交換」: 編集画面を閉じ、交換元として待機する。
    const startSwapFromEditor = () => {
        if (!cellEditor) return;
        setSwapPending({ i: cellEditor.i, d: cellEditor.d });
        closeCellEditor();
    };

    // Cycle9: セル同士を交換する(セルオブジェクト全体)。同じセルはno-op。
    const performSwap = (i1, d1, i2, d2) => {
        if (i1 === i2 && d1 === d2) return;
        const currentMatrix = getCurrentMatrixOrBlank();
        const name1 = employees[i1]?.name || '';
        const name2 = employees[i2]?.name || '';
        commitHistory(`${name1}⇔${name2}のシフト交換`, () => {
            const newMatrix = swapMatrixCells(currentMatrix, i1, d1, i2, d2);
            setGeneratedResult(prev => ({ ...(prev || {}), matrix: newMatrix }));
            setEmployees(prevEmployees => buildRequestsFromMatrix(newMatrix, prevEmployees));
        });
    };

    // --- Cycle9: Pointer Eventsによる短タップ/スワイプ判定(座標・時刻はrefで追跡し、
    // pointermoveごとにstateやlocalStorageを書き換えない) ---
    const handleCellPointerDown = (e, i, d) => {
        if (isGenerating) return;
        activePointersRef.current.add(e.pointerId);
        pointerTrackRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startTime: Date.now(),
            i, d,
            // Take2 P2-1: 開始点からの最大移動距離をrefで追跡する(state更新はしない)。
            maxDistancePx: 0,
            hadMultiplePointersAtStart: activePointersRef.current.size > 1
        };
    };

    // Take2 P2-1: pointermoveのたびに開始点からの最大移動距離だけをrefへ書き込む。
    // 「30px移動後に開始点付近へ戻す」ような往復スワイプでも、終了位置ではなく
    // 移動中の最大距離で判定するため、短タップとして誤検知しない。
    const handleCellPointerMove = (e) => {
        const state = pointerTrackRef.current;
        if (!state || state.pointerId !== e.pointerId) return;
        const distancePx = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
        if (distancePx > state.maxDistancePx) state.maxDistancePx = distancePx;
    };

    const handleCellPointerUp = (e, i, d) => {
        const state = pointerTrackRef.current;
        activePointersRef.current.delete(e.pointerId);
        pointerTrackRef.current = null;
        if (!state || state.pointerId !== e.pointerId) return;
        const upDistancePx = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
        const distancePx = Math.max(state.maxDistancePx, upDistancePx);
        const durationMs = Date.now() - state.startTime;
        const verdict = classifyPointerUp({
            distancePx,
            durationMs,
            wasCancelled: false,
            hadMultiplePointers: state.hadMultiplePointersAtStart || activePointersRef.current.size > 0,
            pointerIdMismatch: false
        });
        if (verdict === 'tap' && state.i === i && state.d === d) {
            openCellEditor(i, d);
        }
    };

    const handleCellPointerCancel = (e) => {
        activePointersRef.current.delete(e.pointerId);
        if (pointerTrackRef.current && pointerTrackRef.current.pointerId === e.pointerId) {
            pointerTrackRef.current = null;
        }
    };

    // キーボード操作(Enter/Space)によるnative buttonのclickだけを処理する。
    // マウス/タッチのクリックはdetail>=1になるため、pointerup側で既に処理済み(二重発火防止)。
    const handleCellButtonClick = (e, i, d) => {
        if (e.detail !== 0) return;
        openCellEditor(i, d);
    };

    // --- Cycle9: PC専用のセル交換drag&drop(行の並べ替えdragとは別種別として扱う) ---
    const handleCellDragStart = (e, i, d) => {
        if (isMobileView || isGenerating) { e.preventDefault(); return; }
        dragKindRef.current = 'cell';
        cellDragSourceRef.current = { i, d };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'cell');
    };
    const handleCellDragOver = (e) => {
        if (dragKindRef.current === 'cell') e.preventDefault();
    };
    const handleCellDrop = (e, i, d) => {
        if (dragKindRef.current !== 'cell') return;
        e.preventDefault();
        const src = cellDragSourceRef.current;
        cellDragSourceRef.current = null;
        dragKindRef.current = null;
        if (!src) return;
        performSwap(src.i, src.d, i, d);
    };
    const handleCellDragEnd = () => {
        cellDragSourceRef.current = null;
        dragKindRef.current = null;
    };

    // 従業員1名分の出勤日数・合計時間（特殊シフトも規定通り集計）
    const computeEmployeeStats = (i) => {
        if (!generatedResult?.matrix?.[i]) return { days: 0, hours: 0 };
        let days = 0, hours = 0;
        generatedResult.matrix[i].forEach(cell => {
            if (!cell || !cell.shift) return;
            if (cell.shift === '休') return;
            if (SPECIAL_SHIFTS.includes(cell.shift)) {
                if (SPECIAL_OFF_LIKE.has(cell.shift)) return;
                days += 1;
                hours += (cell.hours ?? DEFAULT_SPECIAL_HOURS);
                return;
            }
            const timeStr = shiftMaster[cell.shift];
            if (timeStr && timeStr.includes('～')) {
                const [s, e] = timeStr.split('～');
                hours += (timeToMin(e) - timeToMin(s)) / 60;
            }
            days += 1;
        });
        return { days, hours };
    };

    // 指定日の「登録販売者スキマ不在」と「開店/閉店の鍵持ち充足」を判定
    const analyzeDay = (d) => {
        if (!generatedResult) return { gaps: [], openerOk: true, closerOk: true, minStart: null, maxEnd: null, openerIdx: [], closerIdx: [] };
        const businessStart = timeToMin(BUSINESS_START_LABEL);
        const businessEnd = timeToMin(BUSINESS_END_LABEL);
        let rsIntervals = [];
        let allIntervals = [];
        employees.forEach((emp, i) => {
            const cell = generatedResult?.matrix?.[i]?.[d] || null;
            if (!cell || !cell.shift || cell.shift === '休' || SPECIAL_SHIFTS.includes(cell.shift)) return;
            const timeStr = shiftMaster[cell.shift];
            if (!timeStr || !timeStr.includes('～')) return;
            const [s, e] = timeStr.split('～');
            const range = [timeToMin(s), timeToMin(e)];
            allIntervals.push({ idx: i, range });
            if (emp.isRS) rsIntervals.push(range);
        });

        rsIntervals.sort((a, b) => a[0] - b[0]);
        let gaps = [];
        let cursor = businessStart;
        rsIntervals.forEach(([s, e]) => {
            if (s > cursor) gaps.push([cursor, Math.min(s, businessEnd)]);
            cursor = Math.max(cursor, e);
        });
        if (cursor < businessEnd) gaps.push([cursor, businessEnd]);
        gaps = gaps.filter(([s, e]) => e > s);

        let openerOk = true, closerOk = true, minStart = null, maxEnd = null, openerIdx = [], closerIdx = [];
        if (allIntervals.length > 0) {
            minStart = Math.min(...allIntervals.map(x => x.range[0]));
            maxEnd = Math.max(...allIntervals.map(x => x.range[1]));
            const openers = allIntervals.filter(x => x.range[0] === minStart);
            const closers = allIntervals.filter(x => x.range[1] === maxEnd);
            openerIdx = openers.map(x => x.idx);
            closerIdx = closers.map(x => x.idx);
            openerOk = openers.some(x => employees[x.idx] && employees[x.idx].isKeyHolder);
            closerOk = closers.some(x => employees[x.idx] && employees[x.idx].isKeyHolder);
        }
        return { gaps, openerOk, closerOk, minStart, maxEnd, openerIdx, closerIdx };
    };

    const periodDates = getPeriodDates(currentYear, currentMonth);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayAnalyses = generatedResult ? periodDates.map((_, d) => analyzeDay(d)) : [];

    // Cycle11 3.4: generatedResult.matrixとshiftMasterだけから警告を派生計算する。
    // 直接編集・スワップ・ランダム入力・自動生成・Undo/Redoはすべてmatrixの参照が
    // 変わるため、setStateするeffectを作らずuseMemoで自動的に再計算される。
    // 警告自体はgeneratedResult/localStorage/履歴スナップショットへは一切保存しない。
    const healthAlerts = useMemo(() => {
        if (!generatedResult?.matrix) return [];
        return buildHealthAlerts(generatedResult.matrix, shiftMaster);
    }, [generatedResult, shiftMaster]);
    // Cycle9: 日付ラベルは列(日)ごとに1回だけ計算し、従業員行×日のループ内で
    // 毎セルformatDateLabel()を呼び直さない(24名×31日の再計算を避ける軽量化)。
    const dayLabels = periodDates.map(formatDateLabel);

    // Cycle8 Take2: 空きセルを先に列挙し、Fisher-Yatesで一度だけシャッフルしてから
    // 先頭N件を採用することで、乱数運に左右されず抽選を必ず終了させる。
    const shuffleArray = (arr) => {
        const result = [...arr];
        for (let idx = result.length - 1; idx > 0; idx--) {
            const j = Math.floor(Math.random() * (idx + 1));
            [result[idx], result[j]] = [result[j], result[idx]];
        }
        return result;
    };

    // Cycle8/Take2: 検証用テストジェネレーター。既存の確定シフト(希望休/休以外)は保持したまま、
    // 「希望休」「休」セルだけをクリアし、正社員系は2〜4日・パート/アルバイト系は5〜8日を
    // ランダムに再配置する。maxPerDayは「優先条件」であり、上限未満の空き日を使い切ったら
    // 残りの空き日も候補にするため、空きが十分にあれば必ず目標数を満たす。空きセル自体が
    // 必要数未満の場合だけ、配置可能数までを反映し不足として1件にまとめて通知する。
    const randomizeHolidayRequests = () => {
        if (!window.confirm('現在の各従業員の「休」設定をクリアして、テスト用のリアルな希望休（「休」）を自動で散りばめますか？')) {
            return;
        }
        const dayCount = periodDates.length;
        const isStandardStaff = (type) => (type || '').includes('社員');
        let currentMatrix = generatedResult ? generatedResult.matrix : null;
        if (!currentMatrix) {
            currentMatrix = employees.map(() => periodDates.map(() => ({})));
        }
        // 既存の希望休/休セルだけをクリアし、それ以外の確定シフトは維持する
        const newMatrix = currentMatrix.map(row => row.map(cell => {
            if (cell && (cell.shift === '希望休' || cell.shift === '休')) return {};
            return cell;
        }));

        const dayLoadCount = new Array(dayCount).fill(0);
        const maxPerDay = Math.max(1, Math.ceil(employees.length * 0.4));
        const shortages = [];

        const newEmployees = employees.map((emp, i) => {
            const min = isStandardStaff(emp.type) ? 2 : 5;
            const max = isStandardStaff(emp.type) ? 4 : 8;
            const desiredCount = Math.min(Math.floor(Math.random() * (max - min + 1)) + min, dayCount);

            const availableDays = [];
            for (let d = 0; d < dayCount; d++) {
                if (!(newMatrix[i][d] && newMatrix[i][d].shift)) availableDays.push(d);
            }
            const underCap = availableDays.filter(d => dayLoadCount[d] < maxPerDay);
            const atOrOverCap = availableDays.filter(d => dayLoadCount[d] >= maxPerDay);
            const orderedCandidates = [...shuffleArray(underCap), ...shuffleArray(atOrOverCap)];
            const chosenDays = orderedCandidates.slice(0, desiredCount);

            chosenDays.forEach(d => {
                newMatrix[i][d] = { shift: '希望休', isError: false, isFixed: true };
                dayLoadCount[d] += 1;
            });

            if (chosenDays.length < desiredCount) {
                shortages.push({ name: emp.name, targetDays: desiredCount, actualDays: chosenDays.length });
            }

            return emp;
        });

        // Cycle9: requestsはmatrixの「希望休」セルから再構築する共通関数を通し、常に完全一致させる。
        commitHistory('希望休ランダム入力', () => {
            setGeneratedResult(prev => ({ ...(prev || {}), matrix: newMatrix }));
            setEmployees(buildRequestsFromMatrix(newMatrix, newEmployees));
        });

        if (shortages.length > 0) {
            const lines = shortages.map(s => `・${s.name}: 目標${s.targetDays}日 → 実際${s.actualDays}日`);
            window.alert(`希望休の配置数が一部不足しました（既存確定シフトを保護したため空き日が不足）。\n\n${lines.join('\n')}`);
        }
    };

    // Cycle8 Take2: 目標計上時間(targetHours、従業員ごとの任意入力・null=未設定)と
    // 累積実績(休憩控除前のシフト時間合計)の差分を判定する。法定労働時間・給与・
    // 残業判定ではなく、あくまで「目標計上時間との差分」の目安表示。
    // 契約日数×8hという推測値は使わない(Take1差戻し対応)。
    const OVERTIME_DIFF_THRESHOLD = 2.0;
    const computeOvertimeDiff = (i) => {
        const emp = employees[i];
        const stats = computeEmployeeStats(i);
        const targetHours = emp?.targetHours;
        if (typeof targetHours !== 'number' || !Number.isFinite(targetHours)) {
            return { targetHours: null, diff: null, status: 'unset' };
        }
        const diff = stats.hours - targetHours;
        let status = 'ok';
        if (diff > OVERTIME_DIFF_THRESHOLD) status = 'over';
        else if (diff < -OVERTIME_DIFF_THRESHOLD) status = 'under';
        return { targetHours, diff, status };
    };

    const OVERTIME_DIFF_STYLES = {
        over: { color: '#DC2626', background: '#FEF2F2' },
        under: { color: '#2563EB', background: '#EFF6FF' },
        ok: { color: '#059669', background: 'transparent' },
        unset: { color: '#6B7280', background: '#F3F4F6' }
    };

    // PC/スマホ双方で同じ判定関数・同じ文言を使う(表示先だけがsizeで変わる)。
    const formatOvertimeDiffLabel = (diffInfo) => {
        if (diffInfo.status === 'unset') return '目標未設定';
        if (diffInfo.status === 'over') return `+${diffInfo.diff.toFixed(1)}h (超過⚠️)`;
        if (diffInfo.status === 'under') return `${diffInfo.diff.toFixed(1)}h (不足)`;
        return `±${Math.abs(diffInfo.diff).toFixed(1)}h (標準)`;
    };

    const renderOvertimeDiffTag = (i, size = 'small') => {
        const diffInfo = computeOvertimeDiff(i);
        const label = formatOvertimeDiffLabel(diffInfo);
        const c = OVERTIME_DIFF_STYLES[diffInfo.status];
        if (size === 'large') {
            return (
                <div style={{marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: c.background === 'transparent' ? '#F9FAFB' : c.background, color: c.color, fontWeight: 700, fontSize: '0.95rem'}}>
                    【目標計上時間との差分】 {label}
                </div>
            );
        }
        return (
            <span style={{fontSize: '0.7rem', color: c.color, background: c.background, padding: '1px 4px', borderRadius: '4px', marginLeft: '4px'}}>
                ({label})
            </span>
        );
    };

    // Cycle6: 表の幅(日数)や行数が変わるとスクロール可否も変わるため、都度再判定する。
    // Cycle7 Take2(Dex差戻し): 「初期表示・resize・タブ復帰・対象期間や従業員数の
    // 変更後」にフィット倍率を再計算して適用する(zoomLevelが変わると下のeffectが
    // 追随してオーバーフロー状態も再判定する)。zoomLevel自体はこのeffectの依存に
    // 含めない(自分でzoomLevelを更新するため、含めると無限ループになる)。
    useEffect(() => {
        // Cycle6 Take2(Dex差戻し): ダッシュボードは`activeTab`で条件付き描画されており、
        // 他タブへ移動すると`table-container`ごとアンマウントされ、戻ると新しいDOM
        // (scrollLeft=0)として再マウントされる。`activeTab`を依存に含めないと、
        // 離脱前の古いボタン表示状態が復帰後も残ってしまっていた(Dex実機確認で発覚)。
        // refのアタッチはReactのコミット後・エフェクト実行前に完了しているため、
        // 通常のuseEffectで確実に新しいtable-containerを計測できる。
        const recalc = () => {
            if (!isMobileView) {
                const fit = computeFitZoom();
                // Cycle7 Take4: 測定失敗時は倍率stateを変更しない(古いclosure値を
                // フォールバックとして適用しない)。ただし、算出したfitが直前の
                // zoomLevelと同値だった場合、Reactはstate更新をbailoutして
                // 再レンダーせず、zoomLevel依存の別effect(updateScrollButtons呼び出し)
                // が発火しない。タブ復帰直後にfitが偶然直前と同値になるケースで、
                // オーバーフロー状態(canScrollLeft/Right)が新しいtable-containerに対して
                // 再計測されず古いままになる回帰が発生したため、fitの変化有無に関わらず
                // 必ずupdateScrollButtons()を呼び直す。
                if (fit !== null) {
                    setZoomLevel(fit);
                }
                updateScrollButtons();
            } else {
                updateScrollButtons();
            }
        };
        recalc();
        window.addEventListener('resize', recalc);
        return () => window.removeEventListener('resize', recalc);
        // Cycle11 5.4: 折りたたみ切替でtable幅が変わるため、既存の再計測effectの依存へ
        // isNameColumnCollapsedを追加する(DOM反映後に1回だけ再計測される)。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodDates.length, employees.length, generatedResult, activeTab, isMobileView, isNameColumnCollapsed]);

    // zoomLevelが変わるたび(手動+/-、フィットボタン、上のeffectによる自動フィット)
    // オーバーフロー状態を再計測する。
    useEffect(() => {
        updateScrollButtons();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoomLevel]);

    // 鍵持ちアイコン: 朝一番の開錠担当は☀️(オレンジ)、夜最後の施錠担当は🌙(パープル)。
    // 両方兼ねる日は☀️🌙を表示する。
    const keyHolderIcon = (empIdx, d) => {
        const da = dayAnalyses[d];
        const emp = employees[empIdx];
        if (!da || !emp || !emp.isKeyHolder) return null;
        const isOpener = da.openerIdx.includes(empIdx);
        const isCloser = da.closerIdx.includes(empIdx);
        if (!isOpener && !isCloser) return null;
        return (
            <div style={{fontSize: '0.75rem', lineHeight: 1}}>
                {isOpener && <span style={{color: '#EA580C'}}>☀️</span>}
                {isCloser && <span style={{color: '#7C3AED'}}>🌙</span>}
            </div>
        );
    };

    // Cycle11 4: 6連勤・休息不足の警告バッジ。既存のkeyHolderIcon/noteMarkと同様、
    // 非操作(pointer-events:none)の小要素として追加するだけで、既存のcell-hit-target
    // buttonやレイアウトを上書きしない。
    const healthAlertBadges = (empIdx, d) => {
        const alert = healthAlerts[empIdx]?.[d];
        if (!alert) return null;
        return (
            <>
                {alert.consecutiveDays ? (
                    <div className="health-alert-badge health-alert-consecutive" aria-hidden="true">⚠️{alert.consecutiveDays}連勤</div>
                ) : null}
                {alert.restShortMinutes != null ? (
                    <div className="health-alert-badge health-alert-rest" aria-hidden="true">⏰休息短</div>
                ) : null}
            </>
        );
    };

    const renderCellNode = (cell, empIdx, d) => {
        const icon = keyHolderIcon(empIdx, d);
        // Cycle9: 注記があるセルには小さな📝マーカーを添える(全文はbuttonのtitle/aria-labelで確認)。
        const noteMark = cell && cell.note ? <span style={{fontSize: '0.55rem'}}>📝</span> : null;
        const alertMarks = healthAlertBadges(empIdx, d);
        if (!cell || !cell.shift) return <>{icon}－{noteMark}{alertMarks}</>;
        if (cell.shift === '休' || SPECIAL_OFF_LIKE.has(cell.shift)) return <>{icon}{cell.shift === '休' ? '休' : cell.shift}{noteMark}{alertMarks}</>;
        if (SPECIAL_SHIFTS.includes(cell.shift)) {
            return <>{icon}{cell.shift}<br />{cell.hours ?? DEFAULT_SPECIAL_HOURS}h{noteMark}{alertMarks}</>;
        }
        const shiftText = shiftMaster[cell.shift] || cell.shift;
        const lines = shiftText.includes('～') ? shiftText.split('～') : [shiftText];
        return lines.length === 2 ? <>{icon}{lines[0]}<br />~{lines[1]}{noteMark}{alertMarks}</> : <>{icon}{cell.shift}{noteMark}{alertMarks}</>;
    };

    // Cycle11 3.3: 休息不足の表示文言(セルaria-label/title、編集モーダル共通)。
    const buildHealthAlertParts = (empIdx, d) => {
        const alert = healthAlerts[empIdx]?.[d];
        if (!alert) return [];
        const parts = [];
        if (alert.consecutiveDays) parts.push(`現在${alert.consecutiveDays}日以上の連続勤務中です（連続${alert.consecutiveDays}日目）`);
        if (alert.restShortMinutes != null) parts.push(`前日の勤務終了からの休息が${formatRestMinutesAsLabel(alert.restShortMinutes)}です（目安11時間未満）`);
        return parts;
    };

    const cellClassName = (emp, cell, empIdx, d) => {
        let cssClass = 'shift-cell ';
        if (!cell || !cell.shift) cssClass += 'off';
        else if (cell.shift === '休' || SPECIAL_OFF_LIKE.has(cell.shift)) cssClass += 'off';
        else if (SPECIAL_SHIFTS.includes(cell.shift)) cssClass += 'special';
        else if (emp.isRS) cssClass += 'rs';
        else cssClass += 'normal';
        if (cell && cell.isError) cssClass += ' error';
        if (cell && cell.isFixed) cssClass += ' fixed';
        const da = dayAnalyses[d];
        if (da) {
            if (da.openerIdx.includes(empIdx)) cssClass += ' key-open';
            if (da.closerIdx.includes(empIdx)) cssClass += ' key-close';
        }
        return cssClass;
    };

    const renderActions = () => {
        if (activeTab === 'dashboard') {
            return (
                <div style={{display: 'flex', gap: '8px', width: isNarrowViewport ? '100%' : 'auto', flexWrap: 'wrap'}}>
                    <button
                        className="btn"
                        style={{flex: isNarrowViewport ? 1 : 'none', justifyContent: 'center', minWidth: isNarrowViewport ? 'auto' : '160px', background: 'linear-gradient(135deg, #7C3AED, #1E3A8A)', color: '#fff', border: 'none'}}
                        onClick={randomizeHolidayRequests}
                        disabled={isGenerating}
                    >
                        🎲 希望休ランダム入力
                    </button>
                    <button className="btn outline" style={{flex: isNarrowViewport ? 1 : 'none', justifyContent: 'center'}} onClick={() => fillBlanks()} disabled={isGenerating}>
                        <Wand2 size={16}/> 空欄自動作成
                    </button>
                    <button className="btn" style={{flex: isNarrowViewport ? 1 : 'none', justifyContent: 'center'}} onClick={() => generateShift()} disabled={isGenerating}>
                        <Wand2 size={16}/> 最適化シフトを生成
                    </button>
                </div>
            );
        }
        if (activeTab === 'employees') {
            return (
                <div style={{display: 'flex', gap: '8px', width: isNarrowViewport ? '100%' : 'auto'}}>
                    <button
                        className="btn btn-secondary"
                        style={{flex: isNarrowViewport ? 1 : 'none', justifyContent: 'center', backgroundColor: '#F3F4F6', color: '#374151'}}
                        onClick={() => {
                            if (window.confirm('現在の従業員リストを破棄し、デフォルトの24名構成（鍵持ち権限等設定済）にリセットしますか？')) {
                                setEmployees(INITIAL_DATA.map(emp => ({ ...emp, shifts: [...emp.shifts], targetHours: null })));
                                // 従業員構成が変わると生成済みシフトの担当者情報(matrix)が古くなり
                                // 整合しなくなるため、リセット時は生成結果も一緒に破棄する(Take2)。
                                setGeneratedResult(null);
                                clearHistory(); // Cycle9: デフォルト構成リセットは履歴をクリアする
                                closeInteractiveState();
                            }
                        }}
                    >
                        <RotateCcw size={16}/> デフォルトリセット
                    </button>
                    <button className="btn" style={{flex: isNarrowViewport ? 1 : 'none', justifyContent: 'center'}} onClick={() => openModal()}><Plus size={16}/> 新規追加</button>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="app-container">
            {/* Mobile Header */}
            {isMobileView && (
                <div className="mobile-header">
                    <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu size={24} />
                    </button>
                    <div className="logo" style={{display: 'flex', alignItems: 'center'}}><Calendar size={20} /><span style={{fontSize: '0.75rem', marginLeft: '6px', background: '#EEF2FF', color: '#4F46E5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600}}>v4.40</span></div>
                </div>
            )}

            {/* Sidebar Overlay (Mobile) */}
            {isMobileView && isMobileMenuOpen && (
                <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Sidebar */}
            <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="logo pc-only" style={{display: 'flex', alignItems: 'center'}}><Calendar style={{color:'var(--primary)'}}/> Shift-Ag <span style={{fontSize: '0.75rem', marginLeft: '8px', background: '#EEF2FF', color: '#4F46E5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600}}>v4.40</span></div>
                <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false); closeInteractiveState();}}>
                    <Calendar size={18} /> 全体シフト表
                </div>
                <div className={`nav-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => {setActiveTab('employees'); setIsMobileMenuOpen(false); closeInteractiveState();}}>
                    <Users size={18} /> 従業員管理
                </div>
                <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false); closeInteractiveState();}}>
                    <Settings size={18} /> ルール設定
                </div>

                {/* Cycle10: スマホ表示では下部固定バーを廃止し、ダッシュボードの3アクションを
                    ハンバーガーメニュー内へ統合する(PC表示のrenderActions()は従来通り維持)。 */}
                {isMobileView && activeTab === 'dashboard' && (
                    <div className="sidebar-mobile-actions">
                        <div className="sidebar-section-label">シフト操作</div>
                        <button
                            type="button"
                            className="sidebar-action-btn primary"
                            onClick={() => { randomizeHolidayRequests(); setIsMobileMenuOpen(false); }}
                            disabled={isGenerating}
                        >
                            🎲 希望休ランダム入力
                        </button>
                        <button
                            type="button"
                            className="sidebar-action-btn"
                            onClick={() => { fillBlanks(); setIsMobileMenuOpen(false); }}
                            disabled={isGenerating}
                        >
                            <Wand2 size={16}/> 空欄自動作成
                        </button>
                        <button
                            type="button"
                            className="sidebar-action-btn"
                            onClick={() => { generateShift(); setIsMobileMenuOpen(false); }}
                            disabled={isGenerating}
                        >
                            <Wand2 size={16}/> 最適化シフトを生成
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content */}
            {/* Take2(Dex差戻し): 下部固定バーが実在するのは従業員管理タブのみ。
                その時だけ`has-mobile-bottom-bar`で余白を確保し、ダッシュボード/ルール設定は最小余白にする。 */}
            <div className={`main-content ${isMobileView && activeTab === 'employees' ? 'has-mobile-bottom-bar' : ''}`}>
                {activeTab === 'dashboard' && (
                    <div className="tab-content active">
                        <div className="header month-header">
                            <div className="month-header-nav">
                                <button className="btn outline" style={{padding: '4px 8px', flexShrink: 0}} onClick={() => changeMonth(-1)}>&lt;</button>
                                <div className="month-header-label">
                                    <span className="month-header-main">{currentYear}年{currentMonth}月度</span>
                                    <span className="month-header-sub">({formatDateLabel(periodDates[0])}〜{formatDateLabel(periodDates[periodDates.length - 1])})</span>
                                </div>
                                <button className="btn outline" style={{padding: '4px 8px', flexShrink: 0}} onClick={() => changeMonth(1)}>&gt;</button>
                            </div>
                            {!isNarrowViewport && renderActions()}
                        </div>

                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap'}}>
                            <button
                                type="button"
                                className="btn outline"
                                onClick={handleUndo}
                                disabled={historyPast.length === 0 || isGenerating}
                                aria-label="元に戻す(Undo)"
                                title={historyPast.length > 0 ? `元に戻す: ${historyPast[historyPast.length - 1].label}` : '元に戻す'}
                            >↩ 戻る</button>
                            <button
                                type="button"
                                className="btn outline"
                                onClick={handleRedo}
                                disabled={historyFuture.length === 0 || isGenerating}
                                aria-label="やり直す(Redo)"
                                title={historyFuture.length > 0 ? `やり直す: ${historyFuture[0].label}` : 'やり直す'}
                            >↪ 進む</button>
                        </div>

                        {swapPending && (
                            <div className="glass-card" style={{padding: '10px 16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', background: '#EEF2FF'}}>
                                <span style={{fontSize: '0.9rem'}}>🔄 {employees[swapPending.i]?.name} {periodDates[swapPending.d] ? formatDateLabel(periodDates[swapPending.d]) : ''} と交換する相手のセルをタップ/クリックしてください</span>
                                <button type="button" className="btn outline" onClick={() => setSwapPending(null)}>キャンセル</button>
                            </div>
                        )}

                        {infeasibleInfo && (
                            <div className="infeasible-panel" style={{marginBottom: '16px'}}>
                                <div className="infeasible-title"><AlertCircle size={18}/> 自動生成を停止しました（条件を満たせませんでした）</div>
                                <div style={{fontSize: '0.9rem', marginTop: '4px', marginBottom: '8px'}}>{infeasibleInfo.message}</div>
                                <ul style={{margin: '8px 0', paddingLeft: '20px'}}>
                                    {infeasibleInfo.violations.map((v, vIdx) => (
                                        <li key={vIdx} style={{fontSize: '0.85rem', marginBottom: '4px'}}>{v}</li>
                                    ))}
                                </ul>
                                <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
                                    <button className="btn outline" onClick={() => setInfeasibleInfo(null)}>閉じる</button>
                                    <button className="btn danger" onClick={() => {
                                        const kind = infeasibleInfo.kind;
                                        setInfeasibleInfo(null);
                                        // Take2 P2-2: 保存していた関数ではなく、押下時点の最新renderから
                                        // generateShift/fillBlanksを直接呼び出す(最新のemployees/matrix/
                                        // shiftMasterとUndoスナップショットを使うため)。
                                        if (kind === 'fill') fillBlanks(true);
                                        else generateShift(true);
                                    }} disabled={isGenerating}>
                                        違反一覧を確認のうえ、警告付き仮シフトを表示する
                                    </button>
                                </div>
                            </div>
                        )}

                        {generatedResult && (
                            <>
                                {generatedResult.isWarningDraft && (
                                    <div className="infeasible-panel" style={{marginBottom: '16px'}}>
                                        <div className="infeasible-title"><AlertCircle size={18}/> ⚠️ これは警告付き仮シフトです（未確定・条件未達あり）</div>
                                        <div style={{fontSize: '0.85rem', marginTop: '4px', marginBottom: '8px'}}>以下の条件が満たされていません。内容を確認のうえご利用ください。固定セル・希望休は変更していません。</div>
                                        <ul style={{margin: '8px 0', paddingLeft: '20px'}}>
                                            {(generatedResult.violations || []).map((v, vIdx) => (
                                                <li key={vIdx} style={{fontSize: '0.85rem', marginBottom: '4px'}}>{v}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {generatedResult.hasError && generatedResult.warnings && generatedResult.warnings.length > 0 && (
                                    <div className="warning-panel" style={{display: 'block', marginBottom: '16px'}}>
                                        <div className="warning-title"><AlertCircle size={18}/> 【AIシフト作成・自動診断アドバイス】</div>
                                        {generatedResult.warnings.map((warn, wIdx) => (
                                            <div key={wIdx} className="warning-item" style={{marginTop: '8px', fontSize: '0.9rem'}}>
                                                <div className="warning-msg">{warn}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                                {!isMobileView && (
                                    <div className="zoom-controls">
                                        <button type="button" className="btn outline" onClick={zoomOut} disabled={zoomLevel <= ZOOM_MIN} aria-label="縮小">➖</button>
                                        <span className="zoom-level-label">{zoomLevel}%</span>
                                        <button type="button" className="btn outline" onClick={zoomIn} disabled={zoomLevel >= ZOOM_MAX} aria-label="拡大">➕</button>
                                        <button type="button" className="btn outline" onClick={zoomFit}>画面にフィット</button>
                                    </div>
                                )}

                                {/* Cycle11 5.1: 氏名列とは独立した専用トグル。表の直上・左端に置き、
                                    28px折りたたみヘッダー内へ押し込んだり日付列に重ねたりしない。 */}
                                <div className="name-col-toggle-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                    <button type="button" className="btn outline" onClick={() => setIsFullScreen(v => !v)} style={{padding: '4px 12px', fontSize: '0.82rem', fontWeight: 600, background: isFullScreen ? '#DC2626' : '#EEF2FF', color: isFullScreen ? '#FFFFFF' : '#4F46E5', borderColor: isFullScreen ? '#DC2626' : '#C7D2FE'}} aria-label={isFullScreen ? '全画面表示を解除する' : '画面いっぱいに全画面表示する'}>{isFullScreen ? '❌ 全画面解除' : '⛶ 全画面表示'}</button>
                                    {isFullScreen && (<style>{`.mobile-header, .sidebar, .sidebar-overlay, .month-header, .zoom-controls { display: none !important; } .main-content { padding: 0 !important; margin: 0 !important; } .matrix-glass-card { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 9999 !important; border-radius: 0 !important; margin: 0 !important; background: #ffffff !important; padding: 8px !important; } .matrix-scroll-wrapper { height: calc(100vh - 40px) !important; overflow: auto !important; }`}</style>)}
                                    <button
                                        type="button"
                                        className="name-col-toggle-btn"
                                        onClick={() => setIsNameColumnCollapsed(v => !v)}
                                        aria-expanded={!isNameColumnCollapsed}
                                        aria-label={isNameColumnCollapsed ? '氏名列を展開する' : '氏名列を折りたたむ'}
                                        title={isNameColumnCollapsed ? '氏名列を展開する' : '氏名列を折りたたむ'}
                                    >
                                        {/* Take2(Dex P4差戻し): 独自の絵文字・記号ではなく、既にimport済みの
                                            Lucideアイコン(ChevronLeft/ChevronRight)を使う。見える日本語ラベルは維持する。 */}
                                        {isNameColumnCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                                        {isNameColumnCollapsed ? '展開' : '折畳'}
                                    </button>
                                </div>

                                <div className="glass-card matrix-glass-card" style={{padding: '16px'}}>
                                    <div className="matrix-scroll-wrapper">
                                        <div className="table-container" ref={tableContainerRef} onScroll={updateScrollButtons}>
                                        <table className={isNameColumnCollapsed ? 'name-col-collapsed' : ''} style={{ zoom: isMobileView ? '100%' : `${zoomLevel}%` }}>
                                            <thead>
                                                <tr>
                                                    <th className="drag-col" style={{width: '40px'}}></th>
                                                    <th className="name-col">{isNameColumnCollapsed ? '名' : (isMobileView ? '氏名' : '従業員')}</th>
                                                    {periodDates.map((d, i) => {
                                                        const dow = d.getDay();
                                                        const cls = dow === 0 ? 'sun' : dow === 6 ? 'sat' : '';
                                                        const da = dayAnalyses[i];
                                                        return (
                                                            <th key={i}>
                                                                {formatDateLabel(d)}<span className={`day-label ${cls}`}>({dayNames[dow]})</span>
                                                                {da && da.gaps.length > 0 && (
                                                                    <div className="day-alert" title={da.gaps.map(g => `${minToLabel(g[0])}～${minToLabel(g[1])}`).join(', ')}>❌登販</div>
                                                                )}
                                                                {da && !da.openerOk && da.minStart !== null && <div className="day-alert">❌朝鍵</div>}
                                                                {da && !da.closerOk && da.maxEnd !== null && <div className="day-alert">❌夜鍵</div>}
                                                            </th>
                                                        )
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {employees.map((emp, i) => {
                                                    const shortType = emp.type.replace('パート', 'パ').replace('ロング', 'L').substring(0,4);
                                                    return (
                                                        <tr
                                                            key={i}
                                                            onDragEnter={() => { if (dragKindRef.current === 'employee') dragOverItem.current = i; }}
                                                            onDragOver={(e) => { if (dragKindRef.current === 'employee') e.preventDefault(); }}
                                                        >
                                                            <td className="drag-col" style={{width: '40px', textAlign: 'center', color: '#9CA3AF'}}>
                                                                <span
                                                                    className="drag-handle-compact"
                                                                    draggable={!isMobileView && !isGenerating}
                                                                    onDragStart={() => { dragKindRef.current = 'employee'; dragItem.current = i; }}
                                                                    onDragEnd={handleSort}
                                                                >⋮⋮</span>
                                                            </td>
                                                            <td
                                                                className="name-col"
                                                                role="button"
                                                                tabIndex={0}
                                                                aria-haspopup="dialog"
                                                                aria-label={`${emp.name}の詳細を開く`}
                                                                title={emp.name}
                                                                onClick={(e) => openEmployeeDetail(i, e.currentTarget)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        openEmployeeDetail(i, e.currentTarget);
                                                                    }
                                                                }}
                                                            >
                                                                {/* Cycle11 5.3: 折りたたみ中はdisplay:noneで消さず、名字ヒントを
                                                                    うっすら表示する。フルネームはtitle/aria-labelに常時残す。 */}
                                                                {isNameColumnCollapsed ? (
                                                                    <div className="name-cell-text name-cell-collapsed">{extractSurname(emp.name)}</div>
                                                                ) : (
                                                                    <div className="name-cell-text">{emp.name}</div>
                                                                )}
                                                                {!isMobileView && !isNameColumnCollapsed && (
                                                                    <>
                                                                        <div style={{fontSize:'0.7rem', color:'#9CA3AF'}}>{emp.isRS ? '登販/' : ''}{emp.isKeyHolder ? '🔑/' : ''}{shortType}</div>
                                                                        <div className="staff-stat-badge">{(() => { const st = computeEmployeeStats(i); return `${st.days}日 / ${st.hours.toFixed(1)}h`; })()}{renderOvertimeDiffTag(i, 'small')}</div>
                                                                    </>
                                                                )}
                                                            </td>
                                                            {periodDates.map((_, d) => {
                                                                const cell = generatedResult?.matrix?.[i]?.[d] || null;
                                                                const cssClass = cellClassName(emp, cell, i, d);
                                                                const isSwapSource = swapPending && swapPending.i === i && swapPending.d === d;
                                                                const dateLabel = dayLabels[d];
                                                                const shiftLabel = cell?.shift ? (SPECIAL_SHIFTS.includes(cell.shift) ? cell.shift : (shiftMaster[cell.shift] || cell.shift)) : '未設定';
                                                                // Cycle11 4: 警告は色(バッジ)だけで伝えず、セルのaria-label/titleにも文言を含める。
                                                                const healthAlertParts = buildHealthAlertParts(i, d);
                                                                const cellAriaLabel = `${emp.name} ${dateLabel} ${shiftLabel}${cell?.note ? ` (${cell.note})` : ''}${healthAlertParts.length > 0 ? ` ${healthAlertParts.join(' ')}` : ''}`;
                                                                const cellTitleParts = [cell?.note || '', ...healthAlertParts].filter(Boolean);

                                                                return (
                                                                    <td
                                                                        key={d}
                                                                        style={{position: 'relative', width: '50px', outline: isSwapSource ? '2px dashed #7C3AED' : 'none'}}
                                                                        draggable={!isMobileView && !isGenerating}
                                                                        onDragStart={(e) => handleCellDragStart(e, i, d)}
                                                                        onDragOver={handleCellDragOver}
                                                                        onDrop={(e) => handleCellDrop(e, i, d)}
                                                                        onDragEnd={handleCellDragEnd}
                                                                    >
                                                                        <div className={cssClass} style={{ pointerEvents: 'none', textAlign: 'center', fontSize: '0.75rem', padding: '4px', borderRadius: '4px', lineHeight: '1.2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                                            {renderCellNode(cell, i, d)}
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            className="cell-hit-target"
                                                                            aria-label={cellAriaLabel}
                                                                            title={cellTitleParts.join(' / ')}
                                                                            disabled={isGenerating}
                                                                            style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0, zIndex: 1, background: 'transparent', touchAction: 'pan-x pan-y'}}
                                                                            onPointerDown={(e) => handleCellPointerDown(e, i, d)}
                                                                            onPointerMove={handleCellPointerMove}
                                                                            onPointerUp={(e) => handleCellPointerUp(e, i, d)}
                                                                            onPointerCancel={handleCellPointerCancel}
                                                                            onClick={(e) => handleCellButtonClick(e, i, d)}
                                                                        />
                                                                    </td>
                                                                )
                                                            })}
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Cycle6 Take2(Dex差戻し): 非表示側はdisabled+aria-hiddenで、
                                        ポインター操作・Tabフォーカス・Enter/Space実行・支援技術への露出を
                                        すべて防ぐ(opacity:0の見た目だけでは操作可能なままだった)。 */}
                                    <button
                                        type="button"
                                        className="matrix-float-btn matrix-float-btn-left"
                                        onClick={() => scrollTableBy(-350)}
                                        disabled={!canScrollLeft}
                                        tabIndex={canScrollLeft ? 0 : -1}
                                        aria-hidden={!canScrollLeft}
                                        aria-label="左へスクロール"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        type="button"
                                        className="matrix-float-btn matrix-float-btn-right"
                                        onClick={() => scrollTableBy(350)}
                                        disabled={!canScrollRight}
                                        tabIndex={canScrollRight ? 0 : -1}
                                        aria-hidden={!canScrollRight}
                                        aria-label="右へスクロール"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </div>
                                </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="tab-content active">
                        <div className="header">
                            <div>
                                <h1>店舗・ルール設定</h1>
                                <p style={{color: 'var(--text-sub)', marginTop: '4px'}}>シフト自動生成時にAIが考慮する「曜日ごとの目標出勤人数」を設定します</p>
                            </div>
                        </div>
                        <div className="glass-card">
                            <h3 style={{marginBottom: '16px', color: 'var(--text-main)'}}>曜日ごとの出勤優先順位（1位〜7位）</h3>
                            <p style={{fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '16px'}}>
                                ※曜日の優先度を1位（最優先で人を手厚くしたい）〜7位（最も少なくて良い）で設定できます。<br/>
                                AIが全体の出勤人数の平準化（バランス）を第一に保ちながら、この順位通りに人数を調整します。
                            </p>
                            <div style={{display: 'grid', gridTemplateColumns: isMobileView ? 'repeat(2, 1fr)' : 'repeat(7, 1fr)', gap: '10px', marginBottom: '24px'}}>
                                {[
                                    { key: 6, name: '日曜日' },
                                    { key: 0, name: '月曜日' },
                                    { key: 1, name: '火曜日' },
                                    { key: 2, name: '水曜日' },
                                    { key: 3, name: '木曜日' },
                                    { key: 4, name: '金曜日' },
                                    { key: 5, name: '土曜日' },
                                ].map(d => (
                                    <div key={d.key} style={{background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', textAlign: 'center'}}>
                                        <div style={{fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px'}}>{d.name}</div>
                                        <select
                                            value={weekdayRanks[d.key] ?? 4}
                                            style={{width: '100%', padding: '6px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #CBD5E1', cursor: 'pointer', textAlign: 'center'}}
                                            onChange={(e) => setWeekdayRanks({...weekdayRanks, [d.key]: parseInt(e.target.value, 10)})}
                                        >
                                            {[1, 2, 3, 4, 5, 6, 7].map(r => (
                                                <option key={r} value={r}>
                                                    {r}位 {r === 1 ? '(最高)' : r === 7 ? '(最低)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <h3 style={{marginBottom: '16px', color: 'var(--text-main)'}}>曜日ごとの最低出勤人数（個別設定）</h3>
                            <p style={{fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '16px'}}>
                                ※各曜日で「必ず〇名以上出勤させる」最低人数を設定できます。0 は制限なし。上限（平均+1名）を超えた場合は自動調整されます。
                            </p>
                            <div style={{display: 'grid', gridTemplateColumns: isMobileView ? 'repeat(2, 1fr)' : 'repeat(7, 1fr)', gap: '10px', marginBottom: '24px'}}>
                                {[
                                    { key: 6, name: '日曜日' },
                                    { key: 0, name: '月曜日' },
                                    { key: 1, name: '火曜日' },
                                    { key: 2, name: '水曜日' },
                                    { key: 3, name: '木曜日' },
                                    { key: 4, name: '金曜日' },
                                    { key: 5, name: '土曜日' },
                                ].map(d => (
                                    <div key={d.key} style={{background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', textAlign: 'center'}}>
                                        <div style={{fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px'}}>{d.name}</div>
                                        <input
                                            type="number"
                                            min="0"
                                            max="30"
                                            value={weekdayMinStaff[d.key] ?? 0}
                                            style={{width: '100%', padding: '6px', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid #CBD5E1', textAlign: 'center'}}
                                            onChange={(e) => setWeekdayMinStaff({...weekdayMinStaff, [d.key]: parseInt(e.target.value, 10) || 0})}
                                        />
                                        <div style={{fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: '4px'}}>{(weekdayMinStaff[d.key] ?? 0) === 0 ? '制限なし' : `最低 ${weekdayMinStaff[d.key]}名`}</div>
                                    </div>
                                ))}
                            </div>

                            <h3 style={{marginBottom: '16px', color: 'var(--text-main)'}}>人員を厚くしたい日（追加の個別指定）</h3>
                            <p style={{fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '12px'}}>※特売日などで通常よりシフトを手厚くしたい日付を選択してください。（複数選択可・{formatDateLabel(periodDates[0])}〜{formatDateLabel(periodDates[periodDates.length - 1])}の対象期間）</p>
                            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                {periodDates.map((d, i) => {
                                    const day = i + 1;
                                    const isSelected = thickDays.includes(day);
                                    return (
                                        <button
                                            key={day}
                                            className={`shift-badge-toggle ${isSelected ? 'selected' : ''}`}
                                            style={{width: '50px', textAlign: 'center', padding: '8px'}}
                                            onClick={() => {
                                                if(isSelected) setThickDays(thickDays.filter(x => x !== day));
                                                else setThickDays([...thickDays, day]);
                                            }}
                                        >
                                            {formatDateLabel(d)}
                                        </button>
                                    )
                                })}
                            </div>

                            <div style={{marginTop: '24px', fontSize: '0.88rem', color: 'var(--text-sub)', background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB', lineHeight: 1.7}}>
                                <strong style={{color: 'var(--primary)', fontSize: '0.95rem', display: 'block', marginBottom: '8px'}}>🤖 AI自動最適化ルール（現在適用中の一覧）</strong>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                    <div><strong style={{color: 'var(--text-main)'}}>【絶対禁止・絶対遵守ルール（ハード制約）】</strong></div>
                                    <div style={{paddingLeft: '12px'}}>
                                        ・<strong>希望休の絶対厳守：</strong> 申請された希望休は100%絶対に休みに設定します（連休制限の対象からも除外）。<br/>
                                        ・<strong>土日祝の全員50%以上出勤：</strong> 土曜日・日曜日・祝日は全従業員数の半分（50%）以上（例: 10名なら最低5名）を必ず出勤させます。<br/>
                                        ・<strong>連勤上限（社員5連勤/パート等4連勤）：</strong> 正社員・準社員は最大5連勤まで、パート・アルバイト等は最大4連勤までに厳しく制限します。<br/>
                                        ・<strong>連休制限（社員最大2連休/パート最大3連休）：</strong> 正社員・準社員は自動割り当てでの3連休以上を絶対禁止（最大2連休）、パート等は自動5連休以上を絶対禁止します。<br/>
                                        ・<strong>登録販売者の絶対配置：</strong> 営業時間（8:15～24:00）の全時間帯で登録販売者を1名以上確実に配置します。<br/>
                                        ・<strong>契約日数の厳守：</strong> 従業員ごとの契約日数に合わせてぴったり割り当てます。<br/>
                                        ・<strong>1日の出勤上限：</strong> どんな日でも総従業員数の70%以下（例: 10人なら最大7人）に自動制限します。<br/>
                                        ・<strong>出勤人数の厳格平準化（平均±1名制限）：</strong> 全員の契約日数から1日の平均人数を自動計算し、全曜日の出勤人数を「平均±1名以内」に強制固定します（10人対2人等の極端な偏りは絶対発生しません）。
                                    </div>
                                    <div style={{marginTop: '6px'}}><strong style={{color: 'var(--text-main)'}}>【自動評価・イベントルール（ソフト制約）】</strong></div>
                                    <div style={{paddingLeft: '12px'}}>
                                        ・<strong>連勤・連休のソフト抑制：</strong> 社員の5連勤・パートの4連勤・パートの4連休はペナルティ加算により極力回避します。<br/>
                                        ・<strong>時間帯区分（早番・中番・遅番）の自動均等配分：</strong> 各日において午前メイン（早番）と夕方メイン（遅番）の出勤人数の偏りを自動評価し、極力均等に分散配置します。<br/>
                                        ・<strong>曜日優先順位による人員配分（最大1名差）：</strong><br/>
                                        &nbsp;&nbsp;🥇 1位〜2位（上位）： 平均 +1名 / ⚪ 3位〜5位（中位）： 平均ピタリ / 🔴 6位〜7位（下位）： 平均 -1名<br/>
                                        ・<strong>月末の抽選会・大抽選会：</strong> 通常月は対象期間末4日間、7月・12月は「大抽選会」として末5日間の人員を自動的に手厚く配分します。<br/>
                                        ・<strong>人員を厚くしたい日：</strong> カレンダーで個別選択された特売日等の人員を優先配分します。<br/>
                                        ・<strong>営業時間：</strong> 8:15～24:00 で固定計算しています。
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card">
                            <h3 style={{marginBottom: '16px', color: 'var(--text-main)'}}>シフトパターン管理（カスタム追加）</h3>
                            <p style={{fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '12px'}}>「中番」など独自のシフトパターンを追加・削除できます。追加したパターンは従業員編集で選択できるようになります。</p>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px'}}>
                                {Object.entries(shiftMaster).map(([id, timeStr]) => (
                                    <div key={id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E5E7EB'}}>
                                        <span><strong>{id}</strong> : {timeStr}</span>
                                        <button className="btn danger" style={{padding: '4px 8px'}} onClick={() => deleteShiftPattern(id)}><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                                <input type="text" className="form-control" style={{width: '200px'}} placeholder="パターン名 (例: 中番)" value={newShiftName} onChange={e => setNewShiftName(e.target.value)}/>
                                <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
                                    <TimePicker value={newShiftStart || '09:00'} onChange={setNewShiftStart} />
                                    <span style={{paddingTop: '10px'}}>～</span>
                                    <TimePicker value={newShiftEnd || '18:00'} onChange={setNewShiftEnd} />
                                    <button className="btn" style={{alignSelf: 'flex-start', marginTop: '10px'}} onClick={addShiftPattern}><Plus size={16}/> 追加</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'employees' && (
                    <div className="tab-content active">
                        <div className="header">
                            <div>
                                <h1>従業員管理</h1>
                                <p style={{color: 'var(--text-sub)', marginTop: '4px'}}>スタッフの追加・編集・削除</p>
                            </div>
                            {!isNarrowViewport && renderActions()}
                        </div>
                        <div className="glass-card" style={{padding: isMobileView ? '0' : '0', overflow: 'hidden', background: isMobileView ? 'transparent' : 'var(--glass-bg)', border: isMobileView ? 'none' : '', boxShadow: isMobileView ? 'none' : ''}}>
                            {isMobileView ? (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                                    {employees.map((emp, i) => (
                                        <div key={i} style={{background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                        <button className="btn outline" style={{padding: '2px 4px'}} onClick={() => moveEmployee(i, -1)} disabled={i === 0 || isGenerating}><ArrowUp size={16}/></button>
                                                        <button className="btn outline" style={{padding: '2px 4px'}} onClick={() => moveEmployee(i, 1)} disabled={i === employees.length - 1 || isGenerating}><ArrowDown size={16}/></button>
                                                    </div>
                                                    <div style={{fontWeight: 700, fontSize: '1.1rem'}}>{emp.name}</div>
                                                </div>
                                                <div style={{display: 'flex', gap: '4px'}}>
                                                    {emp.isRS && <span style={{background: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600}}>登販</span>}
                                                    {emp.isKeyHolder && <span style={{background: '#FEF3C7', color: '#92400E', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600}}>🔑 鍵持ち</span>}
                                                </div>
                                            </div>
                                            <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
                                                <span style={{background: '#F3F4F6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem'}}>{emp.type}</span>
                                                <span style={{background: '#F3F4F6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem'}}>契約: {emp.days}日</span>
                                            </div>
                                            <div style={{marginBottom: '16px'}}>
                                                <div style={{fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '4px'}}>可能シフト / 希望休:</div>
                                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center'}}>
                                                    {emp.shifts.map(s => <span key={s} style={{background:'#DBEAFE', color:'#1E40AF', padding:'4px 6px', borderRadius:'4px', fontSize:'0.8rem'}}>{s}</span>)}
                                                    {emp.requests && <span style={{fontSize: '0.8rem', color: '#DC2626', background: '#FEE2E2', padding: '4px 6px', borderRadius: '4px', marginLeft: '4px'}}>休: {emp.requests}</span>}
                                                </div>
                                            </div>
                                            <div style={{display: 'flex', gap: '8px', borderTop: '1px solid #E5E7EB', paddingTop: '12px'}}>
                                                <button className="btn outline" style={{flex: 1, padding: '8px', justifyContent: 'center'}} onClick={() => openModal(i)}><Edit size={16}/> 編集</button>
                                                <button className="btn danger" style={{flex: 1, padding: '8px', justifyContent: 'center'}} onClick={() => deleteEmployee(i)}><Trash2 size={16}/> 削除</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <table style={{width: '100%', minWidth: 'unset'}}>
                                    <thead style={{background: '#F8FAFC'}}>
                                        <tr>
                                            <th style={{width: '40px'}}></th>
                                            <th style={{position: 'static', textAlign: 'left', padding: '16px'}}>氏名</th>
                                            <th style={{position: 'static', textAlign: 'left'}}>雇用区分</th>
                                            <th style={{position: 'static', textAlign: 'center'}}>登録販売者</th>
                                            <th style={{position: 'static', textAlign: 'center'}}>契約日数</th>
                                            <th style={{position: 'static', textAlign: 'left'}}>可能シフト (時間帯)</th>
                                            <th style={{position: 'static', textAlign: 'center', width: '140px'}}>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((emp, i) => (
                                            <tr
                                                key={i}
                                                onDragEnter={() => { if (dragKindRef.current === 'employee') dragOverItem.current = i; }}
                                                onDragOver={(e) => { if (dragKindRef.current === 'employee') e.preventDefault(); }}
                                            >
                                                <td style={{width: '40px', textAlign: 'center', color: '#9CA3AF'}}>
                                                    {/* Take2 P1-4: 行本体・編集/削除ボタンからdragを開始できないよう、
                                                        draggableを専用ハンドルだけへ限定する(ダッシュボード表と同じ方式)。 */}
                                                    <span
                                                        className="drag-handle-compact employee-row-drag-handle"
                                                        draggable={!isGenerating}
                                                        onDragStart={() => { dragKindRef.current = 'employee'; dragItem.current = i; }}
                                                        onDragEnd={handleSort}
                                                    >
                                                        <GripVertical size={16} className="drag-handle" />
                                                    </span>
                                                </td>
                                                <td style={{position: 'static', textAlign: 'left', padding: '16px', fontWeight: 600}}>
                                                    {emp.name}
                                                    {emp.isKeyHolder && <span title="鍵持ち" style={{marginLeft: '6px', background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600}}>🔑 鍵持ち</span>}
                                                </td>
                                                <td style={{position: 'static', textAlign: 'left'}}>{emp.type}</td>
                                                <td style={{position: 'static', textAlign: 'center'}}>
                                                    {emp.isRS ? <span style={{background: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600}}>あり</span> : <span style={{color: 'var(--text-sub)'}}>なし</span>}
                                                </td>
                                                <td style={{position: 'static', textAlign: 'center'}}>{emp.days}日</td>
                                                <td style={{position: 'static', textAlign: 'left', lineHeight: 1.6}}>
                                                    {emp.shifts.map(s => <span key={s} style={{display:'inline-block', background:'#F3F4F6', padding:'2px 6px', borderRadius:'4px', fontSize:'0.8rem', margin:'2px'}}>{shiftMaster[s] && shiftMaster[s] !== s ? `${s} ${shiftMaster[s]}` : s}</span>)}
                                                    {emp.requests && <div style={{color: '#DC2626', fontSize: '0.85rem', marginTop: '4px', fontWeight: 500}}>希望休: {emp.requests}</div>}
                                                </td>
                                                <td style={{position: 'static', textAlign: 'center'}}>
                                                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                                        <button className="btn outline" style={{padding: '6px'}} onClick={() => openModal(i)}><Edit size={16}/></button>
                                                        <button className="btn danger" style={{padding: '6px'}} onClick={() => deleteEmployee(i)}><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                            <h2>{editingIndex !== null ? '従業員を編集' : '従業員を追加'}</h2>
                            <X style={{cursor:'pointer', color: 'var(--text-sub)'}} onClick={() => setShowModal(false)}/>
                        </div>
                        
                        <div className="form-group">
                            <label>氏名</label>
                            <input type="text" className="form-control" value={empName} onChange={e => setEmpName(e.target.value)} placeholder="例: 山田 太郎"/>
                        </div>
                        
                        <div className="form-group">
                            <label>雇用区分</label>
                            <select className="form-control" value={empType} onChange={e => handleTypeChange(e.target.value)}>
                                {Object.keys(DEFAULT_DAYS).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="form-group" style={{marginTop: '24px', marginBottom: '12px'}}>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={empRS} onChange={e => setEmpRS(e.target.checked)}/>
                                登録販売者資格あり
                            </label>
                        </div>

                        <div className="form-group" style={{marginBottom: '24px'}}>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={empIsKeyHolder} onChange={e => setEmpIsKeyHolder(e.target.checked)}/>
                                🔑 鍵持ち（開店・閉店対応可）
                            </label>
                        </div>

                        <div className="form-group">
                            <label>希望休 (日付のみをカンマ区切りで入力)</label>
                            <input type="text" className="form-control" value={empRequests} onChange={e => setEmpRequests(e.target.value)} placeholder="例: 1, 15, 20"/>
                            <div style={{fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '4px'}}>※数字のみで入力してください</div>
                        </div>

                        <div className="form-group" style={{marginTop: '24px'}}>
                            <label>契約日数 (月間)</label>
                            <input type="number" className="form-control" value={empDays} onChange={e => setEmpDays(e.target.value)}/>
                        </div>

                        <div className="form-group">
                            <label>月間目標計上時間 (h・任意)</label>
                            <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="744"
                                className="form-control"
                                value={empTargetHours}
                                onChange={e => setEmpTargetHours(e.target.value)}
                                placeholder="未設定"
                            />
                            <div style={{fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '4px'}}>
                                ※16日から翌月15日までの目安。通常シフトの拘束時間と特殊勤務の計上時間を合計し、休憩時間は控除しません。空欄で未設定にできます。
                            </div>
                        </div>

                        <div className="form-group">
                            <label>勤務可能シフト設定</label>
                            <div style={{background: '#F8FAFC', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px'}}>
                                {empType === '正社員' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '4px'}}>正社員の固定シフト（切替可）</div>
                                        <div style={{fontSize: '0.9rem', color: 'var(--text-sub)'}}>・ ④ {SHIFT_MASTER['④']}<br/>・ ⑦ {SHIFT_MASTER['⑦']}</div>
                                    </>
                                )}
                                {['時間限定社員', '準社員'].includes(empType) && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '8px'}}>固定シフトを選択してください</div>
                                        <select className="form-control" value={selectedShifts[0]} onChange={e => setSelectedShifts([e.target.value])}>
                                            <option value="④">④ {SHIFT_MASTER['④']} (固定)</option>
                                            <option value="⑦">⑦ {SHIFT_MASTER['⑦']} (固定)</option>
                                        </select>
                                    </>
                                )}
                                {empType === '早パート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '8px'}}>固定シフトを選択してください</div>
                                        <select className="form-control" value={selectedShifts[0]} onChange={e => setSelectedShifts([e.target.value])}>
                                            <option value="①">① {SHIFT_MASTER['①']} (固定)</option>
                                            <option value="②">② {SHIFT_MASTER['②']} (固定)</option>
                                        </select>
                                    </>
                                )}
                                {empType === '早ロングパート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '4px'}}>早ロングパート固定シフト</div>
                                        <div style={{fontSize: '0.9rem', color: 'var(--text-sub)'}}>・ ③ {SHIFT_MASTER['③']}</div>
                                    </>
                                )}
                                {empType === '中パート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '4px'}}>中パート固定シフト</div>
                                        <div style={{fontSize: '0.9rem', color: 'var(--text-sub)'}}>・ ⑥ {SHIFT_MASTER['⑥']}</div>
                                    </>
                                )}
                                {empType === '中ロングパート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '4px'}}>中ロングパート固定シフト</div>
                                        <div style={{fontSize: '0.9rem', color: 'var(--text-sub)'}}>・ ⑤ {SHIFT_MASTER['⑤']}</div>
                                    </>
                                )}
                                {empType === '遅パート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '8px'}}>固定シフトを選択してください</div>
                                        <select className="form-control" value={selectedShifts[0]} onChange={e => setSelectedShifts([e.target.value])}>
                                            <option value="⑨">⑨ {SHIFT_MASTER['⑨']} (固定)</option>
                                            <option value="⑩">⑩ {SHIFT_MASTER['⑩']} (固定)</option>
                                            <option value="⑪">⑪ {SHIFT_MASTER['⑪']} (固定)</option>
                                        </select>
                                    </>
                                )}
                                {empType === '遅ロングパート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '4px'}}>遅ロングパート固定シフト</div>
                                        <div style={{fontSize: '0.9rem', color: 'var(--text-sub)'}}>・ ⑧ {SHIFT_MASTER['⑧']}</div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input type="checkbox" checked={useCustomTime} onChange={e => setUseCustomTime(e.target.checked)}/>
                                自由時間を入力
                            </label>
                            {useCustomTime && (
                                <div style={{marginTop: '8px'}}>
                                    <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
                                        <TimePicker value={customStartTime || '09:00'} onChange={setCustomStartTime} />
                                        <span style={{paddingTop: '10px'}}>～</span>
                                        <TimePicker value={customEndTime || '18:00'} onChange={setCustomEndTime} />
                                    </div>
                                    <button type="button" className="btn outline" style={{whiteSpace: 'nowrap', marginTop: '8px'}} onClick={addCustomShiftToEmployee}>この時間を追加</button>
                                </div>
                            )}
                            {selectedShifts.length > 0 && (
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px'}}>
                                    {selectedShifts.map(s => (
                                        <span key={s} style={{background: '#EEF2FF', color: '#4338CA', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                                            {shiftMaster[s] || s}
                                            <X size={12} style={{cursor: 'pointer'}} onClick={() => setSelectedShifts(selectedShifts.filter(x => x !== s))}/>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px'}}>
                            <button className="btn outline" onClick={() => setShowModal(false)}>キャンセル</button>
                            <button className="btn" onClick={saveEmployee}>保存する</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cycle9: セル編集画面(短タップ/クリック/Enter/Space/PC・スマホ共通データ) */}
            {cellEditor && cellDraft && employees[cellEditor.i] && (() => {
                const { i, d } = cellEditor;
                const emp = employees[i];
                const isSpecialSelected = !cellDraft.useFreeTime && cellDraft.shiftId !== '' && SPECIAL_SHIFTS.includes(cellDraft.shiftId) && !SPECIAL_OFF_LIKE.has(cellDraft.shiftId);
                return (
                    <div className="modal-overlay" onClick={closeCellEditor}>
                        <div className="modal" style={{maxWidth: '420px'}} role="dialog" aria-modal="true" aria-labelledby="cell-editor-title" onClick={e => e.stopPropagation()}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                                <h2 id="cell-editor-title" style={{fontSize: '1.1rem'}}>{emp.name} / {periodDates[d] ? formatDateLabel(periodDates[d]) : ''}の勤務を編集</h2>
                                <button type="button" className="modal-close-btn" aria-label="閉じる" onClick={closeCellEditor}><X size={18} /></button>
                            </div>

                            {/* Cycle11 5(4章): セル編集モーダルにも、そのセルの警告詳細を表示する */}
                            {buildHealthAlertParts(i, d).length > 0 && (
                                <div className="health-alert-panel" style={{marginBottom: '16px'}}>
                                    {buildHealthAlertParts(i, d).map((text, idx) => (
                                        <div key={idx} className="health-alert-panel-item">{text}</div>
                                    ))}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={cellDraft.useFreeTime}
                                        onChange={e => setCellDraft({ ...cellDraft, useFreeTime: e.target.checked })}
                                    />
                                    自由時間を入力する
                                </label>
                            </div>

                            {!cellDraft.useFreeTime && (
                                <div className="form-group">
                                    <label>シフト</label>
                                    <select
                                        className="form-control"
                                        value={cellDraft.shiftId}
                                        onChange={e => setCellDraft({ ...cellDraft, shiftId: e.target.value })}
                                    >
                                        <option value="">－ (未設定)</option>
                                        <option value="休">休</option>
                                        {emp.shifts.map(s => <option key={s} value={s}>{shiftMaster[s] || s}</option>)}
                                        <optgroup label="特殊シフト">
                                            {SPECIAL_SHIFTS.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                            )}

                            {cellDraft.useFreeTime && (
                                <div className="form-group">
                                    <label>自由時間 (開始〜終了)</label>
                                    <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
                                        <TimePicker value={cellDraft.freeStart} onChange={v => setCellDraft({ ...cellDraft, freeStart: v })} />
                                        <span style={{paddingTop: '10px'}}>～</span>
                                        <TimePicker value={cellDraft.freeEnd} onChange={v => setCellDraft({ ...cellDraft, freeEnd: v })} />
                                    </div>
                                    <div style={{fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '4px'}}>※開始に24:00は使用できません。終了は24:00まで指定できます。</div>
                                </div>
                            )}

                            {isSpecialSelected && (
                                <div className="form-group">
                                    <label>個人時間として計上する時間数 (h)</label>
                                    <input
                                        type="number" min="0" max="24" step="0.5" className="form-control"
                                        value={cellDraft.hours}
                                        onChange={e => setCellDraft({ ...cellDraft, hours: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>注記 (任意・最大40文字)</label>
                                <input
                                    type="text" className="form-control" maxLength={40}
                                    value={cellDraft.note}
                                    onChange={e => setCellDraft({ ...cellDraft, note: e.target.value })}
                                    placeholder="例: 早退18:00まで"
                                />
                            </div>

                            <div style={{display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '24px', flexWrap: 'wrap'}}>
                                <div style={{display: 'flex', gap: '8px'}}>
                                    <button type="button" className="btn outline" onClick={clearCellFromEditor}>セルを空にする</button>
                                    <button type="button" className="btn outline" onClick={startSwapFromEditor}>🔄 このシフトを交換</button>
                                </div>
                                <div style={{display: 'flex', gap: '12px'}}>
                                    <button type="button" className="btn outline" onClick={closeCellEditor}>キャンセル</button>
                                    <button type="button" className="btn" onClick={saveCellDraft}>保存する</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Cycle7: 氏名セルタップで開く従業員詳細ポップオーバー(スマホでサブ情報を常時非表示にした代替) */}
            {selectedEmployeeForDetail !== null && employees[selectedEmployeeForDetail] && (() => {
                const emp = employees[selectedEmployeeForDetail];
                const stats = computeEmployeeStats(selectedEmployeeForDetail);
                return (
                    <div
                        className="modal-overlay"
                        onClick={closeEmployeeDetail}
                        onKeyDown={(e) => { if (e.key === 'Escape') closeEmployeeDetail(); }}
                    >
                        <div
                            className="modal employee-detail-card"
                            style={{maxWidth: '360px'}}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="employee-detail-title"
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                                <h2 id="employee-detail-title" style={{fontSize: '1.1rem'}}>👤 {emp.name}</h2>
                                <button
                                    type="button"
                                    className="modal-close-btn"
                                    aria-label="閉じる"
                                    ref={employeeDetailCloseBtnRef}
                                    onClick={closeEmployeeDetail}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px'}}>
                                <span className="shift-cell normal">{emp.type}</span>
                                {emp.isRS && <span className="shift-cell rs">登販</span>}
                                {emp.isKeyHolder && <span className="shift-cell normal">🔑 鍵持ち</span>}
                            </div>
                            <div style={{marginBottom: '8px'}}>
                                🕒 出勤日数: <strong>{stats.days}日</strong> / 累積勤務時間: <strong>{stats.hours.toFixed(1)}時間</strong>
                            </div>
                            {renderOvertimeDiffTag(selectedEmployeeForDetail, 'large')}
                            {emp.requests && (
                                <div style={{color: '#DC2626', fontSize: '0.9rem'}}>📅 希望休: {emp.requests}</div>
                            )}
                            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '20px'}}>
                                <button className="btn outline" onClick={closeEmployeeDetail}>閉じる</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {isGenerating && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <h2 style={{color: 'var(--primary)'}}>最適化を実行中...</h2>
                </div>
            )}

            {/* Cycle10: ダッシュボードの3アクションはハンバーガーメニューへ移設したため、
                スマホ下部固定バーは従業員管理タブのアクションのみに限定する。 */}
            {isNarrowViewport && activeTab === 'employees' && (
                <div className="mobile-bottom-bar">
                    {renderActions()}
                </div>
            )}
        </div>
    );
}
