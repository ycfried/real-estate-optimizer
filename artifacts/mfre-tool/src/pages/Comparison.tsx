import { Link } from "wouter";
import { useSavedAnalyses, SavedAnalysis } from "@/hooks/use-saved-analyses";
import { exportFromSavedAnalysis } from "@/lib/export-pdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, ArrowLeft, Trash2, BarChart3, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt$ = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v)) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
};

const fmtPct = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v)) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v / 100);
};

const fmtNum = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v)) return "N/A";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function GradeBadge({ grade }: { grade: string }) {
  let cls = "bg-gray-100 text-gray-700 border-gray-200";
  if (grade === "Excellent") cls = "bg-green-100 text-green-800 border-green-200";
  if (grade === "Good") cls = "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (grade === "Poor") cls = "bg-red-100 text-red-800 border-red-200";
  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 text-xs font-semibold uppercase tracking-wider", cls)}>
      {grade}
    </Badge>
  );
}

type MetricDef = {
  label: string;
  group?: string;
  render: (a: SavedAnalysis) => React.ReactNode;
  highlight?: (a: SavedAnalysis) => "green" | "red" | "yellow" | "neutral";
};

const METRICS: MetricDef[] = [
  { group: "Property", label: "Purchase Price", render: a => fmt$(a.data.purchasePrice) },
  { label: "Down Payment", render: a => `${a.data.downPaymentPercent}%` },
  { label: "Interest Rate", render: a => `${a.data.interestRate}%` },
  { label: "Loan Term", render: a => `${a.data.loanTerm} yrs` },
  { group: "Financing", label: "Loan Amount", render: a => fmt$(a.results.loanAmount) },
  { label: "Annual Debt Service", render: a => fmt$(a.results.annualDebtService) },
  { group: "Income", label: "Gross Annual Income", render: a => fmt$(a.results.totalAnnualIncome) },
  { label: "Effective Gross Income", render: a => fmt$(a.results.egi) },
  { group: "Expenses", label: "Total OpEx (Annual)", render: a => fmt$(a.results.totalOperatingExpenses) },
  { group: "Returns", label: "NOI", render: a => fmt$(a.results.noi) },
  {
    label: "Cash Flow",
    render: a => fmt$(a.results.cashFlow),
    highlight: a => a.results.cashFlow >= 0 ? "green" : "red",
  },
  {
    label: "Cash-on-Cash Return",
    render: a => fmtPct(a.results.coc),
    highlight: a => {
      const v = a.results.coc;
      if (v === null) return "neutral";
      if (v >= a.data.excellentCoc) return "green";
      if (v < a.data.minCoc) return "red";
      return "yellow";
    },
  },
  {
    label: "DSCR",
    render: a => fmtNum(a.results.dscr),
    highlight: a => {
      const v = a.results.dscr;
      if (v === null) return "neutral";
      if (v >= a.data.excellentDscr) return "green";
      if (v < a.data.minDscr) return "red";
      return "yellow";
    },
  },
  { label: "Cap Rate", render: a => fmtPct(a.results.capRate) },
  { label: "Investment Grade", render: a => <GradeBadge grade={a.results.investmentGrade} /> },
  { group: "Stressed", label: "Stressed NOI", render: a => fmt$(a.results.stressedNoi) },
  {
    label: "Stressed Cash Flow",
    render: a => fmt$(a.results.stressedCashFlow),
    highlight: a => a.results.stressedCashFlow >= 0 ? "green" : "red",
  },
  {
    label: "Stressed DSCR",
    render: a => fmtNum(a.results.stressedDscr),
    highlight: a => {
      const v = a.results.stressedDscr;
      if (v === null) return "neutral";
      if (v >= a.data.excellentStressDscr) return "green";
      if (v < a.data.minStressDscr) return "red";
      return "yellow";
    },
  },
  { label: "Stressed Cap Rate", render: a => fmtPct(a.results.stressedCapRate) },
  { label: "Stress Grade", render: a => <GradeBadge grade={a.results.stressGrade} /> },
];

const highlightClass = {
  green: "text-green-600 font-semibold",
  red: "text-red-600 font-semibold",
  yellow: "text-yellow-600 font-semibold",
  neutral: "text-slate-800",
};

export default function Comparison() {
  const { analyses, deleteAnalysis, clearAll } = useSavedAnalyses();

  const groupStarts = new Set<number>();
  let lastGroup: string | undefined = undefined;
  METRICS.forEach((m, i) => {
    if (m.group && m.group !== lastGroup) {
      groupStarts.add(i);
      lastGroup = m.group;
    }
  });

  return (
    <div className="flex min-h-svh flex-col bg-slate-50 font-sans">
      {/* shrink-0: page chrome; table scroll lives in main so thead sticky aligns to scrollport, not a broken overflow-x wrapper */}
      <header className="sticky top-0 z-50 shrink-0 border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" data-testid="link-back-to-calculator">
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer">
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="hidden text-sm font-medium sm:inline">Calculator</span>
              </div>
            </Link>
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-blue-200 bg-blue-50">
                <Building className="h-4 w-4 text-blue-600" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                MFRE<span className="font-medium text-slate-400">Terminal</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="hidden items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium text-slate-600 sm:flex sm:px-3">
              <BarChart3 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span>Compare</span>
            </div>
            {analyses.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs text-slate-600 hover:bg-red-50 hover:text-red-600"
                data-testid="button-clear-all"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        {analyses.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-32 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No saved analyses yet</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-sm">
              Go back to the calculator, fill in a property, and click "Save Analysis" to start comparing.
            </p>
            <Link href="/">
              <Button data-testid="button-go-to-calculator">Go to Calculator</Button>
            </Link>
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <table className="w-full border-separate border-spacing-0 text-sm" data-testid="comparison-table">
              <thead>
                <tr className="bg-slate-50 text-slate-900">
                  {/* Corner: above other header cells and body sticky column */}
                  <th
                    scope="col"
                    className="sticky top-0 left-0 z-30 w-48 border-b border-r border-slate-200 bg-slate-50 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 shadow-[4px_0_8px_-2px_rgba(15,23,42,0.06)]"
                  >
                    Metric
                  </th>
                  {analyses.map(a => (
                    <th
                      key={a.id}
                      scope="col"
                      className="sticky top-0 z-20 min-w-[180px] border-b border-slate-200 bg-slate-50 px-5 py-4 text-center"
                      data-testid={`col-${a.id}`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-sm font-semibold leading-tight text-slate-900">{a.name}</span>
                        <span className="text-xs font-normal text-slate-500">{fmtDate(a.savedAt)}</span>
                        <div className="mt-1 flex items-center gap-3">
                          <button
                            onClick={() => exportFromSavedAnalysis(a)}
                            className="rounded p-1 text-slate-500 transition-colors hover:bg-white hover:text-blue-600"
                            title="Export PDF"
                            data-testid={`button-export-pdf-${a.id}`}
                          >
                            <FileDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteAnalysis(a.id)}
                            className="rounded p-1 text-slate-500 transition-colors hover:bg-white hover:text-red-600"
                            title="Remove from comparison"
                            data-testid={`button-delete-${a.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric, i) => {
                  const isGroupStart = groupStarts.has(i);
                  return (
                    <>
                      {isGroupStart && (
                        <tr key={`group-${metric.group}`} className="bg-slate-100">
                          <td
                            colSpan={analyses.length + 1}
                            className="border-b border-slate-200 bg-slate-100 px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-500"
                          >
                            {metric.group}
                          </td>
                        </tr>
                      )}
                      <tr
                        key={metric.label}
                        className={cn(
                          "group transition-colors hover:bg-slate-50 [&>td]:border-b [&>td]:border-slate-100",
                          i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        )}
                      >
                        <td
                          className={cn(
                            "sticky left-0 z-10 whitespace-nowrap border-r border-slate-200 px-5 py-3 font-medium text-slate-600",
                            "shadow-[4px_0_8px_-2px_rgba(15,23,42,0.06)] group-hover:bg-slate-50",
                            i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          )}
                        >
                          {metric.label}
                        </td>
                        {analyses.map(a => {
                          const hue = metric.highlight ? metric.highlight(a) : "neutral";
                          return (
                            <td
                              key={a.id}
                              className={cn(
                                "px-5 py-3 text-center",
                                highlightClass[hue]
                              )}
                              data-testid={`cell-${metric.label.replace(/\s+/g, "-").toLowerCase()}-${a.id}`}
                            >
                              {metric.render(a)}
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
