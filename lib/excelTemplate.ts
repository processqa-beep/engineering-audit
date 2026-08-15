/**
 * Generates and triggers download of the Audit Point Setup Excel template.
 * Uses SheetJS (xlsx) which is already installed.
 */
import * as XLSX from 'xlsx';

const COLUMNS = [
  'Sr No.',
  'Section',
  'Sub Section',
  'Line / Machine',
  'Component Name',
  'Function of Component',
  'What Impact If This Part Fails',
  'Checkpoint',
  'Standard Parameter',
  'Min',
  'Max',
  'Unit',
  'Criticality',
  'Applicable Lines',
  'Active',
];

const EXAMPLE_ROW = [
  1,
  'Grinding',
  'M1',
  'BL#1',
  'Vacuum Belt',
  'Holds and transports glass on the grinding bed',
  'Glass slipping / missing grinding / chipping defects',
  'Check vacuum belt tension — stretch limit max 1 mm / 1000 mm',
  'Stretch ≤ 1 mm per 1000 mm',
  '',   // Min (blank for visual check)
  '',   // Max (blank for visual check)
  'Visual',
  'Critical',
  'BL#1, BL#2, BL#3, BL#4, BL#6, BL#7, BL#8',
  'Yes',
];

const EXAMPLE_ROW_2 = [
  2,
  'Grinding',
  'M1',
  'BL#1',
  'Vacuum Pressure',
  'Maintains suction to hold glass firmly',
  'Glass drop, production stop',
  'Check vacuum pressure at inlet manifold',
  'Vacuum pressure',
  -0.9,
  -0.8,
  'bar',
  'Critical',
  'ALL',
  'Yes',
];

const EXAMPLE_ROW_3 = [
  3,
  'Tempering',
  'Furnace',
  'TL#1',
  'Heating Element',
  'Heats glass to tempering temperature',
  'Glass breakage or insufficient tempering',
  'Check furnace set temperature vs actual',
  'Furnace temperature',
  680,
  720,
  '°C',
  'Critical',
  'TL#1, TL#2',
  'Yes',
];

const INSTRUCTIONS = [
  ['ENGINEERING AUDIT POINT SETUP — EXCEL TEMPLATE INSTRUCTIONS'],
  [''],
  ['HOW TO USE THIS TEMPLATE:'],
  ['1. Fill the "Audit Points" sheet with your audit checkpoints.'],
  ['2. Do NOT change column headers.'],
  ['3. Upload this file in the Web App → Master Data Admin → Upload Excel.'],
  ['4. Review the Import Preview before confirming.'],
  [''],
  ['COLUMN GUIDE:'],
  ['Sr No.', 'Sequential number (auto-assigned on import if blank).'],
  ['Section', 'Engineering area: Grinding, Tempering, Arc Lehr, Cutting, Washing, Robot, Furnace, Packing, Utilities, Conveyor, Compressor, etc.'],
  ['Sub Section', 'Sub-area: M1, M1A, M2, Furnace, Lehr, Cutting Machine, KUKA Robot, etc.'],
  ['Line / Machine', 'Specific machine: BL#1, BL#2, TL#1, SG#2 Robot-1, etc. (for reference only — use Applicable Lines for multi-machine)'],
  ['Component Name', 'Part being inspected: Vacuum Belt, Heating Element, Drive Motor, etc.'],
  ['Function of Component', 'What this part does.'],
  ['What Impact If This Part Fails', 'Consequences if this part fails.'],
  ['Checkpoint', 'The exact audit activity / check to perform.'],
  ['Standard Parameter', 'The reference value or condition (e.g. "Vacuum pressure", "No leakage", "Properly tightened").'],
  ['Min', 'Minimum acceptable value (leave BLANK for visual / non-numerical checks).'],
  ['Max', 'Maximum acceptable value (leave BLANK for visual / non-numerical checks).'],
  ['Unit', 'Unit of measurement: bar, °C, mm, mbar, %, Hz, Visual, etc.'],
  ['Criticality', 'Critical / Major / Minor'],
  ['Applicable Lines', 'Comma-separated list of machines this checkpoint applies to. Use ALL for every machine under this Sub Section. Example: BL#1, BL#2, BL#3 or ALL'],
  ['Active', 'Yes = include in audits.  No = exclude from future audits (historical data preserved).'],
  [''],
  ['NUMERICAL SPEC EXAMPLES:'],
  ['Min=-0.9, Max=-0.8, Unit=bar', '→ Displays: -0.9 – -0.8 bar'],
  ['Min=blank, Max=80, Unit=°C', '→ Displays: ≤ 80 °C'],
  ['Min=100, Max=blank, Unit=mbar', '→ Displays: ≥ 100 mbar'],
  ['Min=blank, Max=blank, Unit=Visual', '→ Displays: Standard Parameter text as-is (OK / NOT OK result)'],
];

export function downloadAuditPointTemplate(): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Audit Points (data entry) ──────────────────────────────────────
  const wsData: any[][] = [
    COLUMNS,
    EXAMPLE_ROW,
    EXAMPLE_ROW_2,
    EXAMPLE_ROW_3,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 8 },   // Sr No.
    { wch: 16 },  // Section
    { wch: 16 },  // Sub Section
    { wch: 16 },  // Line / Machine
    { wch: 22 },  // Component Name
    { wch: 35 },  // Function
    { wch: 40 },  // Failure Impact
    { wch: 55 },  // Checkpoint
    { wch: 30 },  // Standard Parameter
    { wch: 8 },   // Min
    { wch: 8 },   // Max
    { wch: 10 },  // Unit
    { wch: 12 },  // Criticality
    { wch: 38 },  // Applicable Lines
    { wch: 8 },   // Active
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Audit Points');

  // ── Sheet 2: Instructions ───────────────────────────────────────────────────
  const wsInst = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  wsInst['!cols'] = [{ wch: 45 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions');

  // ── Write & download ────────────────────────────────────────────────────────
  XLSX.writeFile(wb, 'Engineering_Audit_Point_Template.xlsx');
}
