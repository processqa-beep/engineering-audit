import * as XLSX from 'xlsx';
import { AuditHeader, AuditResult, ActionItem } from './types';

export function generateAuditExcelReport(
  header: AuditHeader,
  results: AuditResult[],
  actions: ActionItem[]
): void {
  const wb = XLSX.utils.book_new();

  // 1. Audit Header Sheet
  const headerData = [
    { Property: 'Audit ID', Value: header.auditId },
    { Property: 'Date', Value: header.date },
    { Property: 'Time', Value: header.time },
    { Property: 'Section', Value: header.sectionName },
    { Property: 'Line', Value: header.lineName },
    { Property: 'Equipment', Value: header.equipmentName },
    { Property: 'Auditor', Value: header.auditorName },
    { Property: 'Overall Status', Value: header.overallStatus },
    { Property: 'Compliance %', Value: `${header.compliancePercent.toFixed(1)}%` },
    { Property: 'Total Points', Value: header.totalCheckpoints },
    { Property: 'OK Count', Value: header.okCount },
    { Property: 'NG Count', Value: header.ngCount },
    { Property: 'Observation Count', Value: header.obsCount },
    { Property: 'N/A Count', Value: header.naCount },
  ];
  const wsHeader = XLSX.utils.json_to_sheet(headerData);
  XLSX.utils.book_append_sheet(wb, wsHeader, 'Audit_Summary');

  // 2. Audit Results Sheet
  const resultsData = results.map((r) => ({
    'Audit ID': r.auditId,
    Level: r.level,
    Component: r.componentName,
    Checkpoint: r.checkpointText,
    'Standard Range': r.standardRange,
    'Actual Observation': r.actualValue,
    FPR: r.fpr,
    Status: r.status,
    'Observation Notes': r.observationNotes || '',
    'Recommended Action': r.recommendedAction || '',
    'Is Critical': r.isCritical ? 'YES' : 'NO',
    Timestamp: r.timestamp,
  }));
  const wsResults = XLSX.utils.json_to_sheet(resultsData);
  XLSX.utils.book_append_sheet(wb, wsResults, 'Audit_Results');

  // 3. Action Items Sheet
  if (actions.length > 0) {
    const actionsData = actions.map((a) => ({
      'Action ID': a.actionId,
      'Audit ID': a.auditId,
      Component: a.componentName,
      Checkpoint: a.checkpointText,
      Observation: a.observation,
      'Recommended Action': a.recommendedAction,
      'Responsible Person': a.responsiblePerson,
      'Target Date': a.targetDate,
      Priority: a.priority,
      Status: a.status,
      'Closure Remark': a.closureRemark || '',
      'Closed Date': a.closedDate || '',
    }));
    const wsActions = XLSX.utils.json_to_sheet(actionsData);
    XLSX.utils.book_append_sheet(wb, wsActions, 'Actions');
  }

  XLSX.writeFile(wb, `Audit_Data_${header.auditId}.xlsx`);
}
