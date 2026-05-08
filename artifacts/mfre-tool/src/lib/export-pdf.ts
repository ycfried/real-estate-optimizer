import { jsPDF } from "jspdf";
import { SavedAnalysis, SavedAnalysisResults } from "@/hooks/use-saved-analyses";
import { InvestmentData } from "@/hooks/use-investment-calculations";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt$ = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v as number)) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v as number);
};
const fmtPct = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v as number)) return "N/A";
  return `${Number(v).toFixed(2)}%`;
};
const fmtNum = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v as number)) return "N/A";
  return Number(v).toFixed(2);
};
const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

// ── Color palette matching the app's light scheme ─────────────────────────────
const C = {
  blue:        [59, 130, 246]   as [number, number, number],
  blueMid:     [37, 99, 235]    as [number, number, number],
  blueLight:   [219, 234, 254]  as [number, number, number], // blue-100
  text:        [15, 23, 42]     as [number, number, number], // slate-900
  textMid:     [51, 65, 85]     as [number, number, number], // slate-700
  muted:       [100, 116, 139]  as [number, number, number], // slate-500
  mutedLight:  [148, 163, 184]  as [number, number, number], // slate-400
  white:       [255, 255, 255]  as [number, number, number],
  bgLight:     [248, 250, 252]  as [number, number, number], // slate-50
  bgMid:       [241, 245, 249]  as [number, number, number], // slate-100
  border:      [226, 232, 240]  as [number, number, number], // slate-200
  borderLight: [241, 245, 249]  as [number, number, number], // slate-100
  green:       [22, 163, 74]    as [number, number, number],
  greenLight:  [220, 252, 231]  as [number, number, number], // green-100
  red:         [220, 38, 38]    as [number, number, number],
  redLight:    [254, 226, 226]  as [number, number, number], // red-100
  yellow:      [161, 98, 7]     as [number, number, number], // amber-700
  yellowLight: [254, 243, 199]  as [number, number, number], // amber-100
  amber:       [245, 158, 11]   as [number, number, number],
  amberLight:  [255, 251, 235]  as [number, number, number], // amber-50
  amberBorder: [252, 211, 77]   as [number, number, number], // amber-300
};

function gradeColor(grade: string): [number, number, number] {
  if (grade === "Excellent") return C.green;
  if (grade === "Good") return C.yellow;
  if (grade === "Poor") return C.red;
  return C.muted;
}
function gradeBgColor(grade: string): [number, number, number] {
  if (grade === "Excellent") return C.greenLight;
  if (grade === "Good") return C.yellowLight;
  if (grade === "Poor") return C.redLight;
  return C.bgMid;
}
function cashFlowColor(v: number | null): [number, number, number] {
  if (v === null) return C.muted;
  return v >= 0 ? C.green : C.red;
}
function cocColor(v: number | null, minCoc: number, excellentCoc: number): [number, number, number] {
  if (v === null) return C.muted;
  if (v >= excellentCoc) return C.green;
  if (v < minCoc) return C.red;
  return C.yellow;
}
function dscrColor(v: number | null, min: number, excellent: number): [number, number, number] {
  if (v === null) return C.muted;
  if (v >= excellent) return C.green;
  if (v < min) return C.red;
  return C.yellow;
}

// ── Shared page header (smaller variant for page 2) ───────────────────────────
function drawPageHeader(doc: jsPDF, PW: number, ML: number, MR: number, small = false): number {
  // White background
  doc.setFillColor(...C.white);
  doc.rect(0, 0, PW, small ? 14 : 22, "F");

  // Blue top accent bar
  doc.setFillColor(...C.blue);
  doc.rect(0, 0, PW, small ? 2 : 3, "F");

  // Border bottom
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(0, small ? 14 : 22, PW, small ? 14 : 22);

  if (small) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text("MFRE", ML, 10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.mutedLight);
    doc.text("Terminal  —  Investment Analysis (continued)", ML + 14, 10);
    return 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...C.text);
  doc.text("MFRE", ML, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...C.mutedLight);
  doc.text("Terminal", ML + 22, 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.blue);
  doc.text("INVESTMENT ANALYSIS REPORT", PW - MR, 14, { align: "right" });

  return 28;
}

// ── Page footer ───────────────────────────────────────────────────────────────
function drawPageFooter(doc: jsPDF, PW: number, PH: number, ML: number, MR: number, page: number, total: number) {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(ML, PH - 12, PW - MR, PH - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.mutedLight);
  doc.text("MFRE Terminal  •  For informational purposes only. Not financial advice.", ML, PH - 6);
  doc.text(`Page ${page} of ${total}`, PW - MR, PH - 6, { align: "right" });
}

export function exportAnalysisPdf(name: string, data: InvestmentData, results: SavedAnalysisResults, savedAt?: number) {
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });

  const PW = 215.9;
  const PH = 279.4;
  const ML = 18;
  const MR = 18;
  const CW = PW - ML - MR;
  let y = 0;

  // ── PAGE 1 ──────────────────────────────────────────────────────────────────
  y = drawPageHeader(doc, PW, ML, MR, false);
  y += 8;

  // ── Property name + date + grade badges ──────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...C.text);
  doc.text(name, ML, y);

  const dateStr = savedAt ? fmtDate(savedAt) : fmtDate(Date.now());
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.mutedLight);
  doc.text(`Generated ${dateStr}`, PW - MR, y, { align: "right" });
  y += 5;

  // Thin blue underline beneath property name
  doc.setFillColor(...C.blue);
  doc.rect(ML, y, 28, 0.5, "F");
  y += 9;

  // Grade badges — two pill boxes side-by-side
  const bw = (CW - 6) / 2;
  const drawGradePill = (label: string, grade: string, x: number) => {
    const bg = gradeBgColor(grade);
    const fg = gradeColor(grade);
    doc.setFillColor(...bg);
    doc.roundedRect(x, y, bw, 12, 2, 2, "F");
    doc.setDrawColor(...fg);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, bw, 12, 2, 2, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text(label, x + bw / 2, y + 4, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...fg);
    doc.text(grade.toUpperCase(), x + bw / 2, y + 10, { align: "center" });
  };
  drawGradePill("INVESTMENT GRADE", results.investmentGrade, ML);
  drawGradePill("STRESS GRADE", results.stressGrade, ML + bw + 6);
  y += 18;

  // ── Section header helper ─────────────────────────────────────────────────────
  const sectionHeader = (label: string) => {
    doc.setFillColor(...C.bgMid);
    doc.rect(ML, y, CW, 8, "F");
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.line(ML, y, ML + CW, y);
    doc.line(ML, y + 8, ML + CW, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(label.toUpperCase(), ML + 4, y + 5.3);
    y += 15; // 8mm header + 7mm breathing room before first row
  };

  // ── Metric row helper ─────────────────────────────────────────────────────────
  const ROW_H = 6.5;
  const metricRow = (
    label: string,
    value: string,
    valueColor: [number, number, number] = C.textMid,
    bold = false,
    bgFill?: [number, number, number]
  ) => {
    if (bgFill) {
      doc.setFillColor(...bgFill);
      doc.rect(ML, y - 3, CW, ROW_H, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(label, ML + 4, y);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8);
    doc.setTextColor(...valueColor);
    doc.text(value, ML + CW - 4, y, { align: "right" });
    doc.setDrawColor(...C.borderLight);
    doc.setLineWidth(0.2);
    doc.line(ML, y + 2.5, ML + CW, y + 2.5);
    y += ROW_H;
  };

  // ── Half-width row ────────────────────────────────────────────────────────────
  const halfRow = (
    l1: string, v1: string, c1: [number, number, number],
    l2: string, v2: string, c2: [number, number, number]
  ) => {
    const mid = ML + CW / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(l1, ML + 4, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...c1);
    doc.text(v1, mid - 4, y, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(l2, mid + 4, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...c2);
    doc.text(v2, ML + CW - 4, y, { align: "right" });

    doc.setDrawColor(...C.borderLight);
    doc.setLineWidth(0.2);
    doc.line(ML, y + 2.5, ML + CW, y + 2.5);
    y += ROW_H;
  };

  // ── SECTION 1: Property & Financing ──────────────────────────────────────────
  sectionHeader("Property & Financing");
  metricRow("Purchase Price", fmt$(data.purchasePrice));
  metricRow(
    "Down Payment",
    `${data.downPaymentPercent}%  (${fmt$(data.purchasePrice * data.downPaymentPercent / 100)})`
  );
  metricRow("Loan", `${fmt$(results.loanAmount)}  •  ${data.interestRate}%  •  ${data.loanTerm}-yr`, C.textMid, true);
  metricRow("Annual Debt Service", fmt$(results.annualDebtService), C.textMid, true);
  y += 3;

  // ── SECTION 2: Income ────────────────────────────────────────────────────────
  sectionHeader("Rental Income");
  const occupiedUnits = data.units.filter(u => u.occupied).length;
  metricRow("Occupied / Total Units", `${occupiedUnits} of ${data.units.length}`);
  metricRow("Gross Potential Income (Annual)", fmt$(results.totalAnnualIncome));
  metricRow("Vacancy Rate", fmtPct(data.vacancyRatePercent));
  metricRow("Effective Gross Income (EGI)", fmt$(results.egi), C.textMid, true, C.bgLight);
  y += 3;

  // ── SECTION 3: Core Returns ───────────────────────────────────────────────────
  sectionHeader("Core Returns");
  metricRow("Total Operating Expenses (Annual)", fmt$(results.totalOperatingExpenses));
  metricRow("Net Operating Income (NOI)", fmt$(results.noi), C.text, true);
  metricRow(
    "Annual Cash Flow",
    fmt$(results.cashFlow),
    cashFlowColor(results.cashFlow),
    true,
    C.bgLight
  );
  halfRow(
    "Cash-on-Cash Return", fmtPct(results.coc),
    cocColor(results.coc, data.minCoc, data.excellentCoc),
    "Cap Rate", fmtPct(results.capRate), C.textMid
  );
  metricRow(
    "Debt Service Coverage Ratio (DSCR)",
    fmtNum(results.dscr),
    dscrColor(results.dscr, data.minDscr, data.excellentDscr),
    true
  );
  y += 3;

  // ── SECTION 4: Stressed Scenario ─────────────────────────────────────────────
  // Taller header: title on line 1, params on line 2
  const stressHeaderH = 16;
  doc.setFillColor(...C.amberLight);
  doc.rect(ML, y, CW, stressHeaderH, "F");
  doc.setDrawColor(...C.amberBorder);
  doc.setLineWidth(0.25);
  doc.line(ML, y, ML + CW, y);
  doc.line(ML, y + stressHeaderH, ML + CW, y + stressHeaderH);
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.amber);
  doc.text("STRESSED SCENARIO", ML + 4, y + 6);
  // Params centered on second line
  const stressParams = [
    `+${data.extraVacancyPercent}% vacancy`,
    `-${data.rentReductionPercent}% rent`,
    `+${data.insuranceIncreasePercent}% insurance`,
    `+${data.taxIncreasePercent}% taxes`,
    `+${data.maintenanceIncreasePercent}% maintenance`,
  ].join("   /   ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(stressParams, ML + CW / 2, y + 12.5, { align: "center" });
  y += stressHeaderH + 7; // header height + breathing room

  metricRow("Stressed NOI", fmt$(results.stressedNoi));
  metricRow("Stressed Cash Flow", fmt$(results.stressedCashFlow), cashFlowColor(results.stressedCashFlow), true, C.bgLight);
  halfRow(
    "Stressed DSCR", fmtNum(results.stressedDscr),
    dscrColor(results.stressedDscr, data.minStressDscr, data.excellentStressDscr),
    "Stressed Cap Rate", fmtPct(results.stressedCapRate), C.textMid
  );
  y += 2;

  drawPageFooter(doc, PW, PH, ML, MR, 1, 2);

  // ── PAGE 2 ───────────────────────────────────────────────────────────────────
  doc.addPage();
  y = drawPageHeader(doc, PW, ML, MR, true);
  y += 6;

  // ── Unit Breakdown ────────────────────────────────────────────────────────────
  sectionHeader("Unit Breakdown");

  // Table header
  doc.setFillColor(...C.bgMid);
  doc.rect(ML, y - 1, CW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  const col = { unit: ML + 4, rent: ML + 70, other: ML + 110, status: ML + 148 };
  doc.text("UNIT", col.unit, y + 3.5);
  doc.text("RENT / MONTH", col.rent, y + 3.5);
  doc.text("OTHER / MONTH", col.other, y + 3.5);
  doc.text("STATUS", col.status, y + 3.5);
  y += 8;

  data.units.forEach((unit, i) => {
    const rowBg = i % 2 === 0 ? C.white : C.bgLight;
    doc.setFillColor(...rowBg);
    doc.rect(ML, y - 1, CW, 6.5, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.textMid);
    doc.text(unit.name || `Unit ${i + 1}`, col.unit, y + 3);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.text);
    doc.text(fmt$(unit.rent), col.rent, y + 3);
    doc.text(unit.otherIncome > 0 ? fmt$(unit.otherIncome) : "—", col.other, y + 3);

    const statusColor = unit.occupied ? C.green : C.red;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...statusColor);
    doc.text(unit.occupied ? "OCCUPIED" : "VACANT", col.status, y + 3);

    doc.setDrawColor(...C.borderLight);
    doc.setLineWidth(0.2);
    doc.line(ML, y + 5.5, ML + CW, y + 5.5);
    y += 6.5;
  });
  y += 5;

  // ── Operating Expenses Breakdown ──────────────────────────────────────────────
  sectionHeader("Operating Expenses — Monthly Detail");

  const expenses: [string, number][] = (
    [
      ["Property Taxes", data.taxes],
      ["Insurance", data.insurance],
      ["Utilities", data.utilities],
      ["Trash & Snow Removal", data.trashSnow],
      ["Landscaping & Grounds", data.landscaping],
      ["Repairs & Maintenance", data.maintenance],
      ["Property Management", data.management],
      ["Accounting & Bookkeeping", data.accounting],
      ["CapEx Reserve", data.capex],
      ["Other", data.otherExpenses],
      ...(data.additionalExpenses || []).map(e => [e.name, e.amount] as [string, number]),
    ] as [string, number][]
  ).filter(([, v]) => v > 0);

  const monthlyTotal = expenses.reduce((s, [, v]) => s + (v as number), 0);

  expenses.forEach(([label, monthly], i) => {
    const rowBg = i % 2 === 0 ? C.white : C.bgLight;
    doc.setFillColor(...rowBg);
    doc.rect(ML, y - 1, CW, 6.5, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(label as string, ML + 4, y + 3);

    const pct = monthlyTotal > 0 ? (((monthly as number) / monthlyTotal) * 100).toFixed(0) : "0";
    doc.setTextColor(...C.mutedLight);
    doc.setFontSize(7);
    doc.text(`${pct}%`, ML + CW / 2, y + 3, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.textMid);
    doc.text(fmt$(monthly as number), ML + CW - 4, y + 3, { align: "right" });

    doc.setDrawColor(...C.borderLight);
    doc.setLineWidth(0.2);
    doc.line(ML, y + 5.5, ML + CW, y + 5.5);
    y += 6.5;
  });

  // Total row
  doc.setFillColor(...C.bgMid);
  doc.rect(ML, y - 1, CW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.text);
  doc.text("Total Monthly", ML + 4, y + 3.5);
  doc.text(fmt$(monthlyTotal), ML + CW - 4, y + 3.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(`(${fmt$(monthlyTotal * 12)} annually)`, ML + CW - 4, y + 8.5, { align: "right" });
  y += 16;

  // ── Grading Thresholds ────────────────────────────────────────────────────────
  sectionHeader("Grading Thresholds");

  // Use ASCII-only text — jsPDF's built-in Helvetica can't render >= or em-dash Unicode
  const thresholdRows: [string, string, string, string][] = [
    ["Cash-on-Cash Return",
      `>= ${data.excellentCoc}%`,
      `${data.minCoc}% to ${data.excellentCoc}%`,
      `< ${data.minCoc}%`],
    ["Debt Service Coverage Ratio",
      `>= ${data.excellentDscr}`,
      `${data.minDscr} to ${data.excellentDscr}`,
      `< ${data.minDscr}`],
    ["Stressed DSCR",
      `>= ${data.excellentStressDscr}`,
      `${data.minStressDscr} to ${data.excellentStressDscr}`,
      `< ${data.minStressDscr}`],
  ];

  // Column x positions
  const colMetric  = ML + 4;
  const colExc     = ML + CW * 0.42;
  const colGood    = ML + CW * 0.62;
  const colPoor    = ML + CW - 4;

  // Table header
  doc.setFillColor(...C.bgMid);
  doc.rect(ML, y - 1, CW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text("METRIC", colMetric, y + 3.5);
  doc.text("EXCELLENT", colExc, y + 3.5);
  doc.text("GOOD (RANGE)", colGood, y + 3.5);
  doc.text("POOR", colPoor, y + 3.5, { align: "right" });
  y += 8;

  thresholdRows.forEach(([metric, excellent, good, poor], i) => {
    const rowBg = i % 2 === 0 ? C.white : C.bgLight;
    doc.setFillColor(...rowBg);
    doc.rect(ML, y - 1, CW, 7, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.textMid);
    doc.text(metric, colMetric, y + 3.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.green);
    doc.text(excellent, colExc, y + 3.5);

    doc.setTextColor(...C.yellow);
    doc.text(good, colGood, y + 3.5);

    doc.setTextColor(...C.red);
    doc.text(poor, colPoor, y + 3.5, { align: "right" });

    doc.setDrawColor(...C.borderLight);
    doc.setLineWidth(0.2);
    doc.line(ML, y + 6, ML + CW, y + 6);
    y += 7;
  });

  y += 4;
  // Explanation note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.mutedLight);
  doc.text(
    "Investment grade is determined by Cash-on-Cash Return and DSCR together. Stress grade is determined by Stressed DSCR alone.",
    ML, y, { maxWidth: CW }
  );

  drawPageFooter(doc, PW, PH, ML, MR, 2, 2);

  const safeName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`mfre_${safeName}_analysis.pdf`);
}

export function exportFromSavedAnalysis(a: SavedAnalysis) {
  exportAnalysisPdf(a.name, a.data, a.results, a.savedAt);
}
