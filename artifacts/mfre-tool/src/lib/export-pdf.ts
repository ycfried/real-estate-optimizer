import { jsPDF } from "jspdf";
import { SavedAnalysis, SavedAnalysisResults } from "@/hooks/use-saved-analyses";
import { InvestmentData } from "@/hooks/use-investment-calculations";

const fmt$ = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v)) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
};

const fmtPct = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v)) return "N/A";
  return `${Number(v).toFixed(2)}%`;
};

const fmtNum = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v)) return "N/A";
  return Number(v).toFixed(2);
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const C = {
  navy: [15, 23, 42] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  light: [248, 250, 252] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  yellow: [217, 119, 6] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
};

function gradeColor(grade: string): [number, number, number] {
  if (grade === "Excellent") return C.green;
  if (grade === "Good") return C.yellow;
  if (grade === "Poor") return C.red;
  return C.muted;
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

export function exportAnalysisPdf(name: string, data: InvestmentData, results: SavedAnalysisResults, savedAt?: number) {
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });

  const PW = 215.9;
  const PH = 279.4;
  const ML = 18;
  const MR = 18;
  const CW = PW - ML - MR;
  let y = 0;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, 28, "F");

  doc.setFillColor(...C.blue);
  doc.rect(0, 0, 4, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...C.white);
  doc.text("MFRE", ML, 11);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text("Terminal", ML + 16, 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.white);
  doc.text("INVESTMENT ANALYSIS REPORT", ML, 20);

  const rightLabel = savedAt ? `Generated ${fmtDate(savedAt)}` : `Generated ${fmtDate(Date.now())}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 165, 185);
  doc.text(rightLabel, PW - MR, 20, { align: "right" });

  y = 36;

  // ── Property Name ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...C.text);
  doc.text(name, ML, y);
  y += 3;

  doc.setFillColor(...C.blue);
  doc.rect(ML, y, 40, 0.7, "F");
  y += 7;

  // Helper: section header
  const sectionHeader = (label: string) => {
    doc.setFillColor(...C.light);
    doc.rect(ML, y - 4, CW, 7, "F");
    doc.setFillColor(...C.blue);
    doc.rect(ML, y - 4, 2.5, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(label.toUpperCase(), ML + 5, y + 0.5);
    y += 6;
  };

  // Helper: two-column metric row
  const metricRow = (
    label: string,
    value: string,
    valueColor: [number, number, number] = C.text,
    bold = false,
    bgColor?: [number, number, number]
  ) => {
    if (bgColor) {
      doc.setFillColor(...bgColor);
      doc.rect(ML, y - 3.5, CW, 6.5, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.muted);
    doc.text(label, ML + 3, y);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...valueColor);
    doc.text(value, ML + CW - 3, y, { align: "right" });

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(ML, y + 2, ML + CW, y + 2);
    y += 6.5;
  };

  // Helper: half-width metric for side-by-side
  const halfMetricRow = (
    label1: string, value1: string, color1: [number, number, number],
    label2: string, value2: string, color2: [number, number, number]
  ) => {
    const col2 = ML + CW / 2 + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.muted);
    doc.text(label1, ML + 3, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color1);
    doc.text(value1, ML + CW / 2 - 3, y, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(label2, col2, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color2);
    doc.text(value2, ML + CW - 3, y, { align: "right" });

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(ML, y + 2, ML + CW, y + 2);
    y += 6.5;
  };

  // Helper: grade badge
  const gradeBadge = (label: string, grade: string, x: number, bw: number) => {
    const gc = gradeColor(grade);
    doc.setFillColor(gc[0], gc[1], gc[2]);
    doc.roundedRect(x, y - 4, bw, 8, 1.5, 1.5, "F");
    doc.setFillColor(255, 255, 255, 0.15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.text(`${label}: ${grade.toUpperCase()}`, x + bw / 2, y + 0.5, { align: "center" });
  };

  // ── Section 1: Property & Financing ─────────────────────────────────────────
  sectionHeader("Property & Financing");
  metricRow("Purchase Price", fmt$(data.purchasePrice));
  metricRow("Down Payment", `${data.downPaymentPercent}%  (${fmt$(data.purchasePrice * data.downPaymentPercent / 100)})`);
  metricRow("Interest Rate", `${data.interestRate}%  •  ${data.loanTerm}-year term`);
  metricRow("Loan Amount", fmt$(results.loanAmount), C.text, true);
  metricRow("Annual Debt Service", fmt$(results.annualDebtService), C.text, true);
  y += 2;

  // ── Section 2: Income ────────────────────────────────────────────────────────
  sectionHeader("Rental Income");
  const occupiedUnits = data.units.filter(u => u.occupied).length;
  metricRow("Occupied Units", `${occupiedUnits} / ${data.units.length}`);
  metricRow("Gross Potential Income", fmt$(results.totalAnnualIncome));
  metricRow("Vacancy Rate", `${data.vacancyRatePercent}%`);
  metricRow("Effective Gross Income (EGI)", fmt$(results.egi), C.text, true);
  y += 2;

  // ── Section 3: Operating Expenses ───────────────────────────────────────────
  sectionHeader("Operating Expenses (Annual)");
  metricRow("Property Taxes", fmt$(data.taxes * 12));
  metricRow("Insurance", fmt$(data.insurance * 12));
  metricRow("Utilities", fmt$(data.utilities * 12));
  metricRow("Repairs & Maintenance", fmt$(data.maintenance * 12));
  metricRow("Property Management", fmt$(data.management * 12));
  metricRow("CapEx Reserve", fmt$(data.capex * 12));
  const otherOpEx =
    (data.trashSnow + data.landscaping + data.accounting + data.otherExpenses) * 12;
  metricRow("Other (Trash, Landscaping, Accounting, Other)", fmt$(otherOpEx));
  metricRow("Total Operating Expenses", fmt$(results.totalOperatingExpenses), C.text, true, C.light);
  y += 2;

  // ── Section 4: Core Returns ──────────────────────────────────────────────────
  sectionHeader("Core Returns");
  metricRow("Net Operating Income (NOI)", fmt$(results.noi), C.text, true);
  metricRow("Cash Flow (Annual)", fmt$(results.cashFlow), cashFlowColor(results.cashFlow), true);
  halfMetricRow(
    "Cash-on-Cash Return", fmtPct(results.coc), cocColor(results.coc, data.minCoc, data.excellentCoc),
    "Cap Rate", fmtPct(results.capRate), C.text
  );
  metricRow("Debt Service Coverage Ratio (DSCR)", fmtNum(results.dscr), dscrColor(results.dscr, data.minDscr, data.excellentDscr), true);
  y += 2;

  // ── Section 5: Stressed Scenario ─────────────────────────────────────────────
  // Amber accent bar
  doc.setFillColor(...C.amber);
  doc.rect(ML, y - 4, CW, 7, "F");
  doc.setFillColor(...C.amber);
  doc.rect(ML, y - 4, 2.5, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("STRESSED SCENARIO", ML + 5, y + 0.5);

  const stressParams = [
    `+${data.extraVacancyPercent}% vacancy`,
    `${data.rentReductionPercent}% rent reduction`,
    `+${data.insuranceIncreasePercent}% insurance`,
    `+${data.taxIncreasePercent}% taxes`,
    `+${data.maintenanceIncreasePercent}% maintenance`,
  ].join("  •  ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(stressParams, ML + CW - 3, y + 0.5, { align: "right" });
  y += 6;

  metricRow("Stressed NOI", fmt$(results.stressedNoi));
  metricRow("Stressed Cash Flow", fmt$(results.stressedCashFlow), cashFlowColor(results.stressedCashFlow), true);
  halfMetricRow(
    "Stressed DSCR", fmtNum(results.stressedDscr),
    dscrColor(results.stressedDscr, data.minStressDscr, data.excellentStressDscr),
    "Stressed Cap Rate", fmtPct(results.stressedCapRate), C.text
  );
  y += 4;

  // ── Grade Badges ──────────────────────────────────────────────────────────────
  const badgeW = (CW - 6) / 2;
  gradeBadge("INVESTMENT GRADE", results.investmentGrade, ML, badgeW);
  gradeBadge("STRESS GRADE", results.stressGrade, ML + badgeW + 6, badgeW);
  y += 12;

  // ── Grading Thresholds footnote ───────────────────────────────────────────────
  doc.setFillColor(...C.light);
  doc.rect(ML, y, CW, 13, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text("GRADING THRESHOLDS", ML + 3, y + 5);
  doc.setFont("helvetica", "normal");
  const thresholds = [
    `Min CoC: ${data.minCoc}%  |  Excellent CoC: ${data.excellentCoc}%`,
    `Min DSCR: ${data.minDscr}  |  Excellent DSCR: ${data.excellentDscr}`,
    `Min Stress DSCR: ${data.minStressDscr}  |  Excellent Stress DSCR: ${data.excellentStressDscr}`,
  ].join("     ");
  doc.setFontSize(7);
  doc.text(thresholds, ML + 3, y + 10);
  y += 17;

  // ── Footer ────────────────────────────────────────────────────────────────────
  doc.setFillColor(...C.navy);
  doc.rect(0, PH - 14, PW, 14, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 140, 170);
  doc.text("MFRE Terminal  •  For informational purposes only. Not financial advice.", ML, PH - 5);
  doc.text(`Page 1 of 1`, PW - MR, PH - 5, { align: "right" });

  const safeName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`mfre_${safeName}_analysis.pdf`);
}

export function exportFromSavedAnalysis(a: SavedAnalysis) {
  exportAnalysisPdf(a.name, a.data, a.results, a.savedAt);
}
