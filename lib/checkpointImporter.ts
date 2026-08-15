/**
 * Parses an uploaded Excel file, validates rows, detects duplicates,
 * and returns an ImportPreviewSummary for user review before import.
 */
import * as XLSX from 'xlsx';
import { Checkpoint, CheckpointImportRow, ImportPreviewSummary, ImportAction } from './types';

// ──────────────────────────────────────────────────────────────────────────────
// COLUMN ALIASES  (handles minor header variations)
// ──────────────────────────────────────────────────────────────────────────────
const COL_ALIASES: Record<string, string> = {
  'sr no.': 'srNo',
  'sr no': 'srNo',
  'sr.no': 'srNo',
  'sr.no.': 'srNo',
  'no.': 'srNo',
  section: 'section',
  'sub section': 'subSection',
  'sub-section': 'subSection',
  subsection: 'subSection',
  'line / machine': 'lineMachine',
  'line/machine': 'lineMachine',
  'line': 'lineMachine',
  machine: 'lineMachine',
  'component name': 'componentName',
  component: 'componentName',
  'function of component': 'functionOfComponent',
  function: 'functionOfComponent',
  'what impact if this part fails': 'failureImpact',
  'failure impact': 'failureImpact',
  'impact if fails': 'failureImpact',
  checkpoint: 'checkpoint',
  'activities to be followed (audit point)': 'checkpoint',
  'audit point': 'checkpoint',
  activity: 'checkpoint',
  'standard parameter': 'standardParameter',
  standard: 'standardParameter',
  specification: 'standardParameter',
  spec: 'standardParameter',
  min: 'min',
  minimum: 'min',
  max: 'max',
  maximum: 'max',
  unit: 'unit',
  criticality: 'criticality',
  severity: 'criticality',
  'applicable lines': 'applicableLines',
  'applicable line': 'applicableLines',
  lines: 'applicableLines',
  active: 'active',
  status: 'active',
};

// ──────────────────────────────────────────────────────────────────────────────
// SPEC DISPLAY FORMATTER
// ──────────────────────────────────────────────────────────────────────────────
export function formatSpec(
  min: number | undefined,
  max: number | undefined,
  unit: string | undefined,
  standardParameter: string
): string {
  const u = (unit || '').trim();
  if (min !== undefined && max !== undefined) {
    return `${min} – ${max}${u ? ' ' + u : ''}`;
  }
  if (min === undefined && max !== undefined) {
    return `≤ ${max}${u ? ' ' + u : ''}`;
  }
  if (min !== undefined && max === undefined) {
    return `≥ ${min}${u ? ' ' + u : ''}`;
  }
  // No numeric limits — use standard parameter text
  return standardParameter || (u ? `Visual (${u})` : 'Visual Check');
}

// ──────────────────────────────────────────────────────────────────────────────
// IDENTITY KEY — used for duplicate detection
// Composite: section|subSection|componentName|checkpoint
// ──────────────────────────────────────────────────────────────────────────────
function identityKey(row: Partial<Checkpoint>): string {
  return [
    (row.sectionName || row.sectionId || '').toLowerCase().trim(),
    (row.subSectionName || row.subSectionId || '').toLowerCase().trim(),
    (row.componentName || '').toLowerCase().trim(),
    (row.checkpointText || '').toLowerCase().trim(),
  ].join('|');
}

// ──────────────────────────────────────────────────────────────────────────────
// PARSE APPLICABLE LINES
// ──────────────────────────────────────────────────────────────────────────────
function parseApplicableLines(raw: string | undefined): string[] {
  if (!raw) return ['ALL'];
  const trimmed = raw.toString().trim();
  if (!trimmed || trimmed.toLowerCase() === 'all') return ['ALL'];
  return trimmed
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ──────────────────────────────────────────────────────────────────────────────
// PARSE NUMBER — returns undefined for blank/non-numeric cells
// ──────────────────────────────────────────────────────────────────────────────
function parseNum(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN PARSE FUNCTION
// ──────────────────────────────────────────────────────────────────────────────
export async function parseCheckpointExcel(
  file: File,
  existingCheckpoints: Checkpoint[]
): Promise<ImportPreviewSummary> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // Find first sheet that is NOT "Instructions"
  const sheetName =
    wb.SheetNames.find((n) => !n.toLowerCase().includes('instruct')) ||
    wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (rawRows.length < 2) {
    return {
      fileName: file.name,
      totalRows: 0,
      newCount: 0,
      updateCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      inactiveCount: 0,
      rows: [],
    };
  }

  // Build column map from header row
  const headerRow = rawRows[0].map((h: any) => (h || '').toString().toLowerCase().trim());
  const colMap: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    const mapped = COL_ALIASES[h];
    if (mapped && !(mapped in colMap)) {
      colMap[mapped] = i;
    }
  });

  // Build lookup from existing checkpoints for duplicate detection
  const existingByKey = new Map<string, Checkpoint>();
  existingCheckpoints.forEach((ck) => {
    existingByKey.set(identityKey(ck), ck);
  });

  const rows: CheckpointImportRow[] = [];
  let newCount = 0;
  let updateCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  let inactiveCount = 0;

  // Track keys seen in this import to detect intra-file duplicates
  const seenKeysThisImport = new Map<string, number>();

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    // Skip completely empty rows
    if (row.every((c: any) => c === '' || c === undefined || c === null)) continue;

    const get = (field: string): string => {
      const idx = colMap[field];
      return idx !== undefined ? (row[idx] ?? '').toString().trim() : '';
    };

    const section = get('section');
    const subSection = get('subSection');
    const lineMachine = get('lineMachine');
    const componentName = get('componentName');
    const functionOfComp = get('functionOfComponent');
    const failureImpact = get('failureImpact');
    const checkpoint = get('checkpoint');
    const standardParameter = get('standardParameter');
    const minRaw = colMap['min'] !== undefined ? row[colMap['min']] : undefined;
    const maxRaw = colMap['max'] !== undefined ? row[colMap['max']] : undefined;
    const unit = get('unit');
    const criticality = get('criticality') || 'Medium';
    const applicableLinesRaw = get('applicableLines');
    const activeRaw = get('active');

    const min = parseNum(minRaw);
    const max = parseNum(maxRaw);
    const applicableLines = parseApplicableLines(applicableLinesRaw || lineMachine);
    const active = !activeRaw || activeRaw.toLowerCase() === 'yes' || activeRaw.toLowerCase() === 'true';

    // Validate required fields
    const errors: string[] = [];
    if (!section) errors.push('Section is required');
    if (!componentName) errors.push('Component Name is required');
    if (!checkpoint) errors.push('Checkpoint is required');

    const partial: Partial<Checkpoint> = {
      sectionId: section,
      sectionName: section,
      subSectionId: subSection || 'General',
      subSectionName: subSection || 'General',
      lineId: lineMachine || 'ALL',
      lineName: lineMachine || 'ALL',
      componentName,
      functionOfComponent: functionOfComp || undefined,
      whatImpactIfThisPartGetsFail: failureImpact || undefined,
      checkpointText: checkpoint,
      standardParameter: standardParameter || 'Visual Check',
      parameterType: (min !== undefined || max !== undefined) ? 'NUMBER' : 'OK_NG',
      minimum: min,
      maximum: max,
      unit: unit || undefined,
      applicableLines,
      criticality: criticality || 'Medium',
      isCritical: (criticality || '').toLowerCase() === 'critical',
      active,
    };

    const specDisplay = formatSpec(min, max, unit, standardParameter);
    const key = identityKey(partial);

    let action: ImportAction;
    let existingId: string | undefined;
    let errorMessage: string | undefined;

    if (errors.length > 0) {
      action = 'ERROR';
      errorMessage = errors.join('; ');
      errorCount++;
    } else if (seenKeysThisImport.has(key)) {
      action = 'DUPLICATE';
      duplicateCount++;
    } else if (existingByKey.has(key)) {
      const existing = existingByKey.get(key)!;
      existingId = existing.id;
      // Check if spec changed
      const specChanged =
        existing.standardParameter !== partial.standardParameter ||
        existing.minimum !== partial.minimum ||
        existing.maximum !== partial.maximum ||
        existing.unit !== partial.unit ||
        existing.criticality !== partial.criticality ||
        existing.active !== partial.active ||
        JSON.stringify(existing.applicableLines?.sort()) !==
          JSON.stringify(partial.applicableLines?.sort());

      if (specChanged) {
        action = 'UPDATE';
        updateCount++;
      } else {
        action = 'DUPLICATE';
        duplicateCount++;
      }
    } else {
      action = 'NEW';
      newCount++;
    }

    seenKeysThisImport.set(key, i);

    if (!active && action !== 'ERROR') {
      inactiveCount++;
    }

    rows.push({
      rowIndex: i + 1,
      raw: partial,
      action,
      errorMessage,
      existingId,
      specDisplay,
    });
  }

  return {
    fileName: file.name,
    totalRows: rows.length,
    newCount,
    updateCount,
    duplicateCount,
    errorCount,
    inactiveCount,
    rows,
  };
}
