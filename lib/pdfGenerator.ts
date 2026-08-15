import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuditHeader, AuditResult, ActionItem } from './types';

export function generateAuditPdfReport(
  header: AuditHeader,
  results: AuditResult[],
  actions: ActionItem[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [15, 23, 42]; // Slate-900
  const accentColor = [79, 70, 229]; // Indigo-600

  // Top Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ENGINEERING AUDIT REPORT', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('EQUIPMENT HEALTH & COMPLIANCE ASSESSMENT', 14, 20);

  // Status Badge in Header Top Right
  let statusBg = [16, 185, 129]; // Green
  if (header.overallStatus === 'FAIL') statusBg = [239, 68, 68]; // Red
  if (header.overallStatus === 'PASS WITH OBSERVATIONS') statusBg = [245, 158, 11]; // Amber

  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.roundedRect(145, 8, 52, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(header.overallStatus, 171, 15.5, { align: 'center' });

  // Metadata Grid Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 32, 182, 34, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  doc.text('AUDIT ID:', 18, 39);
  doc.text('DATE & TIME:', 18, 46);
  doc.text('AUDITOR:', 18, 53);
  doc.text('COMPLIANCE:', 18, 60);

  doc.text('SECTION:', 110, 39);
  doc.text('LINE:', 110, 46);
  doc.text('EQUIPMENT:', 110, 53);
  doc.text('CHECKPOINTS:', 110, 60);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(header.auditId, 42, 39);
  doc.text(`${header.date} ${header.time}`, 42, 46);
  doc.text(header.auditorName, 42, 53);
  doc.text(`${header.compliancePercent.toFixed(1)}% (OK: ${header.okCount}, NG: ${header.ngCount})`, 42, 60);

  doc.text(header.sectionName, 134, 39);
  doc.text(header.lineName, 134, 46);
  doc.text(header.equipmentName, 134, 53);
  doc.text(`${header.totalCheckpoints} total (${header.okCount} OK, ${header.ngCount} NG)`, 134, 60);

  // Checkpoint Observations Section Title
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('CHECKPOINT OBSERVATIONS & EVALUATION', 14, 73);

  // Table Columns
  const tableHeaders = [
    ['Lvl', 'Component & Checkpoint', 'Standard Range', 'Actual', 'FPR', 'Status', 'Observation / Action'],
  ];

  const tableRows: string[][] = results.map((res) => [
    res.level || 'M1',
    `${res.componentName || 'Component'}\n• ${res.checkpointText || ''}`,
    res.standardRange || res.standardParameter || 'N/A',
    res.actualValue || 'OK',
    res.fpr ? res.fpr.toFixed(2) : '0.80',
    res.status || 'OK',
    `${res.observationNotes || '-'}\nRec: ${res.recommendedAction || '-'}`,
  ]);

  autoTable(doc, {
    startY: 76,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, fontStyle: 'bold', halign: 'center' }, // Lvl
      1: { cellWidth: 48 }, // Component & Checkpoint
      2: { cellWidth: 28 }, // Standard
      3: { cellWidth: 22 }, // Actual
      4: { cellWidth: 12, halign: 'center' }, // FPR
      5: { cellWidth: 16, fontStyle: 'bold', halign: 'center' }, // Status
      6: { cellWidth: 46 }, // Observation / Action
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const val = data.cell.raw as string;
        if (val === 'OK') data.cell.styles.textColor = [16, 185, 129];
        else if (val === 'NG') data.cell.styles.textColor = [239, 68, 68];
        else if (val === 'Observation') data.cell.styles.textColor = [245, 158, 11];
      }
    },
  });

  // Action Items Section if NG exist
  const finalY = (doc as any).lastAutoTable.finalY || 180;
  if (actions.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTOMATIC ACTION ITEMS (NG FINDINGS)', 14, finalY + 10);

    const actionHeaders = [['Action ID', 'Component', 'Finding / Observation', 'Assignee', 'Priority', 'Target Date']];
    const actionRows = actions.map((act) => [
      act.actionId,
      act.componentName,
      act.observation,
      act.responsiblePerson,
      act.priority,
      act.targetDate,
    ]);

    autoTable(doc, {
      startY: finalY + 13,
      head: actionHeaders,
      body: actionRows,
      theme: 'grid',
      headStyles: {
        fillColor: [185, 28, 28],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7.5,
      },
    });
  }

  // Footer Page Numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by Engineering Audit System | Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  doc.save(`Audit_Report_${header.auditId}.pdf`);
}
