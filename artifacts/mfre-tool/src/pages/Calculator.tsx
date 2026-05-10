import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useState, useRef, useCallback } from "react";
import { InvestmentData, defaultInvestmentData, useInvestmentCalculations } from "@/hooks/use-investment-calculations";
import { useSavedAnalyses } from "@/hooks/use-saved-analyses";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown, Building, DollarSign, Percent, TrendingUp, AlertTriangle,
  Save, BarChart3, FileDown, Plus, Copy, Trash2, Pencil, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { exportAnalysisPdf } from "@/lib/export-pdf";

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
};
const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100);
};
const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};
const fmtComma = (v: number) =>
  new Intl.NumberFormat("en-US").format(v);

// ─── Currency input: always type=number so arrows work on hover; formatted overlay when blurred ─
function CurrencyField({
  value, onChange, step = 1, testId, className, placeholder
}: {
  value: number | string;
  onChange: (v: number) => void;
  step?: number;
  testId?: string;
  className?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const numVal = parseFloat(value as string) || 0;

  return (
    <div className="relative">
      {/* Always a number input so spin arrows work on hover without needing to click first */}
      <input
        type="number"
        step={step}
        value={numVal === 0 ? "" : numVal}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        data-testid={testId}
        placeholder={placeholder || "0"}
        className={cn(
          "h-10 w-full rounded-md border font-mono text-sm pl-8 pr-3 py-2 outline-none transition-colors",
          focused
            ? "border-blue-400 bg-white ring-2 ring-blue-200 text-slate-900"
            : "border-slate-200 bg-slate-50 text-transparent caret-transparent",
          className
        )}
      />
      {/* Dollar prefix — always visible */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none select-none">$</span>
      {/* Formatted overlay when blurred — pointer-events-none so clicks/arrows pass through */}
      {!focused && (
        <div className="absolute inset-0 flex items-center pl-8 pr-8 pointer-events-none">
          <span className="text-sm font-mono text-slate-800 truncate">
            {numVal > 0 ? fmtComma(numVal) : <span className="text-slate-400">{placeholder || "0"}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Occupied pill toggle ────────────────────────────────────────────────────
function OccupiedToggle({ checked, onChange, testId }: { checked: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        checked ? "bg-emerald-500" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ─── Inline editable label ───────────────────────────────────────────────────
function InlineLabel({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    onChange(draft.trim() || value);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
          className="h-7 w-28 rounded border border-blue-400 bg-white px-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button type="button" onClick={commit} className="text-emerald-500 hover:text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn("flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-blue-600 group", className)}
    >
      {value}
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
    </button>
  );
}

export default function Calculator() {
  const form = useForm<InvestmentData>({
    defaultValues: defaultInvestmentData,
    mode: "onChange"
  });

  const { control, watch, register, setValue } = form;

  const { fields: unitFields, append: appendUnit, remove: removeUnit, insert: insertUnit } = useFieldArray({ control, name: "units" });
  const { fields: extraExpenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: "additionalExpenses" });

  const data = watch();

  const parsedData: InvestmentData = {
    ...data,
    purchasePrice: parseFloat(data.purchasePrice as any) || 0,
    downPaymentPercent: parseFloat(data.downPaymentPercent as any) || 0,
    interestRate: parseFloat(data.interestRate as any) || 0,
    loanTerm: parseFloat(data.loanTerm as any) || 0,
    vacancyRatePercent: parseFloat(data.vacancyRatePercent as any) || 0,
    taxes: parseFloat(data.taxes as any) || 0,
    insurance: parseFloat(data.insurance as any) || 0,
    utilities: parseFloat(data.utilities as any) || 0,
    trashSnow: parseFloat(data.trashSnow as any) || 0,
    landscaping: parseFloat(data.landscaping as any) || 0,
    maintenance: parseFloat(data.maintenance as any) || 0,
    management: parseFloat(data.management as any) || 0,
    accounting: parseFloat(data.accounting as any) || 0,
    capex: parseFloat(data.capex as any) || 0,
    otherExpenses: parseFloat(data.otherExpenses as any) || 0,
    additionalExpenses: (data.additionalExpenses || []).map(e => ({ ...e, amount: parseFloat(e.amount as any) || 0 })),
    extraVacancyPercent: parseFloat(data.extraVacancyPercent as any) || 0,
    rentReductionPercent: parseFloat(data.rentReductionPercent as any) || 0,
    insuranceIncreasePercent: parseFloat(data.insuranceIncreasePercent as any) || 0,
    taxIncreasePercent: parseFloat(data.taxIncreasePercent as any) || 0,
    maintenanceIncreasePercent: parseFloat(data.maintenanceIncreasePercent as any) || 0,
    minCoc: parseFloat(data.minCoc as any) || 0,
    minDscr: parseFloat(data.minDscr as any) || 0,
    excellentCoc: parseFloat(data.excellentCoc as any) || 0,
    excellentDscr: parseFloat(data.excellentDscr as any) || 0,
    minStressDscr: parseFloat(data.minStressDscr as any) || 0,
    excellentStressDscr: parseFloat(data.excellentStressDscr as any) || 0,
    units: data.units.map(u => ({
      ...u,
      rent: parseFloat(u.rent as any) || 0,
      otherIncome: parseFloat(u.otherIncome as any) || 0,
    })),
  };

  const results = useInvestmentCalculations(parsedData);
  const [gradingOpen, setGradingOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [propertyName, setPropertyName] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const { saveAnalysis, analyses } = useSavedAnalyses();

  const handleSave = () => {
    saveAnalysis(propertyName, parsedData, results);
    setPropertyName("");
    setSaveDialogOpen(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleAddUnit = useCallback(() => {
    appendUnit({ name: `Unit ${unitFields.length + 1}`, rent: 0, otherIncome: 0, occupied: true });
  }, [appendUnit, unitFields.length]);

  const handleDuplicateUnit = useCallback((index: number) => {
    const u = data.units[index];
    insertUnit(index + 1, { ...u, name: `${u.name} (Copy)` });
  }, [insertUnit, data.units]);

  const handleAddExpense = useCallback(() => {
    appendExpense({ id: `custom-${Date.now()}`, name: "New Expense", amount: 0 });
  }, [appendExpense]);

  const GradeBadge = ({ grade }: { grade: string }) => {
    let cls = "bg-gray-100 text-gray-800 border-gray-200";
    if (grade === "Excellent") cls = "bg-green-100 text-green-800 border-green-200";
    if (grade === "Good") cls = "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (grade === "Poor") cls = "bg-red-100 text-red-800 border-red-200";
    return (
      <Badge variant="outline" className={cn("px-2 py-0.5 text-xs font-semibold uppercase tracking-wider", cls)} data-testid={`grade-${grade.toLowerCase()}`}>
        {grade}
      </Badge>
    );
  };

  const MetricRow = ({ label, value, format = "currency", colorClass = "", testId = "" }: {
    label: string; value: number | null | undefined; format?: "currency" | "percent" | "number"; colorClass?: string; testId?: string;
  }) => {
    let fv = "N/A";
    if (format === "currency") fv = formatCurrency(value);
    else if (format === "percent") fv = formatPercent(value);
    else if (format === "number") fv = formatNumber(value);
    return (
      <div className="flex justify-between items-center py-1.5">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span
          className={cn("text-sm font-semibold text-slate-900 tabular-nums tracking-tight", colorClass)}
          style={{ fontVariantNumeric: "tabular-nums" }}
          data-testid={testId}
        >{fv}</span>
      </div>
    );
  };

  const getCocColor = (coc: number | null) => {
    if (coc === null) return "";
    if (coc >= parsedData.excellentCoc) return "text-green-600";
    if (coc < parsedData.minCoc) return "text-red-600";
    return "text-yellow-600";
  };
  const getDscrColor = (dscr: number | null, isStressed = false) => {
    if (dscr === null) return "";
    const min = isStressed ? parsedData.minStressDscr : parsedData.minDscr;
    const excellent = isStressed ? parsedData.excellentStressDscr : parsedData.excellentDscr;
    if (dscr >= excellent) return "text-green-600";
    if (dscr < min) return "text-red-600";
    return "text-yellow-600";
  };

  const inputCls = "font-mono bg-slate-50 border-slate-200 focus-visible:ring-blue-300/50";

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center border border-blue-200 shrink-0">
              <Building className="w-4 h-4 text-blue-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">MFRE<span className="text-slate-400 font-medium">Terminal</span></h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/compare" data-testid="link-compare">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs gap-1.5 px-2 sm:px-3">
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compare</span>
                {analyses.length > 0 && (
                  <span className="bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[10px] px-1.5 py-0 leading-4 font-mono">{analyses.length}</span>
                )}
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => exportAnalysisPdf("Current Analysis", parsedData, results)}
              className="gap-1.5 text-xs border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-2 sm:px-3" data-testid="button-export-pdf-current">
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
            <Button size="sm" onClick={() => setSaveDialogOpen(true)}
              className={cn("gap-1.5 text-xs transition-all duration-300 px-2 sm:px-3", savedFlash ? "bg-green-600 hover:bg-green-600" : "")}
              data-testid="button-save-analysis">
              <Save className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">{savedFlash ? "Saved!" : "Save"}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Save Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm" data-testid="dialog-save">
          <DialogHeader><DialogTitle>Save Analysis</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label htmlFor="property-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">Property Name</Label>
            <Input id="property-name" placeholder="e.g. 123 Main St, 4-plex" value={propertyName}
              onChange={e => setPropertyName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSave()}
              autoFocus data-testid="input-property-name" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} data-testid="button-cancel-save">Cancel</Button>
            <Button onClick={handleSave} data-testid="button-confirm-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Inputs Column ───────────────────────────────────────────── */}
          <div className="flex-1 space-y-6 lg:max-w-[65%]">

            {/* Property & Financing */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-blue-500 w-full" />
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-slate-400" /> Property & Financing
                </CardTitle>
                <CardDescription>Core acquisition and loan parameters</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Purchase Price</Label>
                  <Controller name="purchasePrice" control={control} render={({ field }) => (
                    <CurrencyField value={field.value} onChange={v => field.onChange(v)} step={25000} testId="input-purchase-price" />
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="downPaymentPercent" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Down Payment (%)</Label>
                  <Input id="downPaymentPercent" type="number" step="1" min="0" max="100"
                    {...register("downPaymentPercent")} data-testid="input-down-payment" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interestRate" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Interest Rate (%)</Label>
                  <Input id="interestRate" type="number" step="0.125" min="0"
                    {...register("interestRate")} data-testid="input-interest-rate" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loanTerm" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Loan Term (Years)</Label>
                  <Input id="loanTerm" type="number" step="1" min="1"
                    {...register("loanTerm")} data-testid="input-loan-term" className={inputCls} />
                </div>
              </CardContent>
            </Card>

            {/* Rental Income */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-5 h-5 text-slate-400" /> Rental Income
                </CardTitle>
                <CardDescription>Monthly unit revenue and overall vacancy</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Vacancy rate */}
                <div className="mb-5 flex items-center gap-4">
                  <div className="space-y-1.5 w-40">
                    <Label htmlFor="vacancyRatePercent" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Base Vacancy (%)</Label>
                    <Input id="vacancyRatePercent" type="number" step="1" min="0" max="100"
                      {...register("vacancyRatePercent")} data-testid="input-vacancy-rate" className={inputCls} />
                  </div>
                </div>

                {/* Units table */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[440px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-36">Unit</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Rent / mo</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Other / mo</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Occupied</th>
                        <th className="px-3 py-2.5 w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unitFields.map((field, index) => (
                        <tr key={field.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="px-3 py-2">
                            <Controller name={`units.${index}.name`} control={control} render={({ field: f }) => (
                              <InlineLabel value={f.value || `Unit ${index + 1}`} onChange={v => f.onChange(v)} />
                            )} />
                          </td>
                          <td className="px-3 py-2">
                            <Controller name={`units.${index}.rent`} control={control} render={({ field: f }) => (
                              <CurrencyField value={f.value} onChange={v => f.onChange(v)} step={50}
                                testId={`input-unit-${index}-rent`} className="h-8 text-xs" />
                            )} />
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell">
                            <Controller name={`units.${index}.otherIncome`} control={control} render={({ field: f }) => (
                              <CurrencyField value={f.value} onChange={v => f.onChange(v)} step={50}
                                testId={`input-unit-${index}-other`} className="h-8 text-xs" />
                            )} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Controller name={`units.${index}.occupied`} control={control} render={({ field: f }) => (
                              <div className="flex justify-center">
                                <OccupiedToggle checked={f.value} onChange={f.onChange}
                                  testId={`toggle-unit-${index}-occupied`} />
                              </div>
                            )} />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => handleDuplicateUnit(index)}
                                className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                title="Duplicate unit" data-testid={`button-duplicate-unit-${index}`}>
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {unitFields.length > 1 && (
                                <button type="button" onClick={() => removeUnit(index)}
                                  className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  title="Remove unit" data-testid={`button-remove-unit-${index}`}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button type="button" onClick={handleAddUnit}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded px-2 py-1.5 transition-colors"
                  data-testid="button-add-unit">
                  <Plus className="w-3.5 h-3.5" /> Add Unit
                </button>
              </CardContent>
            </Card>

            {/* Operating Expenses */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                  Operating Expenses <span className="text-sm font-normal text-slate-400 ml-1">/ month</span>
                </CardTitle>
                <CardDescription>Enter monthly values — annualized automatically</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {([
                    { name: "taxes", label: "Property Taxes" },
                    { name: "insurance", label: "Insurance" },
                    { name: "utilities", label: "Utilities" },
                    { name: "trashSnow", label: "Trash & Snow" },
                    { name: "landscaping", label: "Landscaping & Ground Maint." },
                    { name: "maintenance", label: "Repairs & Maintenance" },
                    { name: "management", label: "Property Management" },
                    { name: "accounting", label: "Accounting & Bookkeeping" },
                    { name: "capex", label: "CapEx Reserve" },
                    { name: "otherExpenses", label: "Other" },
                  ] as const).map((expense) => (
                    <div key={expense.name} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
                      <span className="min-w-0 flex-1 text-sm text-slate-600">{expense.label}</span>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <div className="w-36">
                          <Controller name={expense.name as any} control={control} render={({ field: f }) => (
                            <CurrencyField value={f.value} onChange={v => f.onChange(v)} step={50}
                              testId={`input-expense-${expense.name}`} />
                          )} />
                        </div>
                        <span className="w-8 flex-shrink-0" aria-hidden="true" />
                      </div>
                    </div>
                  ))}

                  {/* Custom additional expenses */}
                  {extraExpenseFields.map((field, index) => (
                    <div key={field.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 group">
                      <div className="min-w-0 flex-1">
                        <Controller name={`additionalExpenses.${index}.name`} control={control} render={({ field: f }) => (
                          <InlineLabel value={f.value || "Custom Expense"} onChange={v => f.onChange(v)} />
                        )} />
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <div className="w-36">
                          <Controller name={`additionalExpenses.${index}.amount`} control={control} render={({ field: f }) => (
                            <CurrencyField value={f.value} onChange={v => f.onChange(v)} step={50}
                              testId={`input-extra-expense-${index}`} />
                          )} />
                        </div>
                        <button type="button" onClick={() => removeExpense(index)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Remove" data-testid={`button-remove-expense-${index}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={handleAddExpense}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded px-2 py-1.5 transition-colors"
                  data-testid="button-add-expense">
                  <Plus className="w-3.5 h-3.5" /> Add Expense
                </button>
              </CardContent>
            </Card>

            {/* Stress Test */}
            <Card className="border-slate-200 shadow-sm border-l-4 border-l-amber-400">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Stress Test Parameters
                </CardTitle>
                <CardDescription>Evaluate resilience under adverse conditions</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { id: "extraVacancyPercent", label: "Extra Vacancy (%)", testId: "input-stress-vacancy" },
                  { id: "rentReductionPercent", label: "Rent Reduction (%)", testId: "input-stress-rent" },
                  { id: "insuranceIncreasePercent", label: "Insurance Increase (%)", testId: "input-stress-insurance" },
                  { id: "taxIncreasePercent", label: "Tax Increase (%)", testId: "input-stress-tax" },
                  { id: "maintenanceIncreasePercent", label: "Maintenance Increase (%)", testId: "input-stress-maintenance" },
                ] as const).map(f => (
                  <div key={f.id} className="space-y-1.5">
                    <Label htmlFor={f.id} className="text-xs font-semibold uppercase tracking-wider text-slate-500">{f.label}</Label>
                    <Input id={f.id} type="number" step="1" min="0"
                      {...register(f.id)} data-testid={f.testId} className={inputCls} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Grading Settings */}
            <Collapsible open={gradingOpen} onOpenChange={setGradingOpen}>
              <Card className="border-slate-200 shadow-sm mb-12 lg:mb-0">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-4 flex flex-row items-center justify-between cursor-pointer hover:bg-slate-50 rounded-t-xl transition-colors">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2 text-left">
                        <Percent className="w-5 h-5 text-slate-400" /> Grading Settings
                      </CardTitle>
                      <CardDescription className="text-left">Adjust thresholds for Excellent / Good / Poor ratings</CardDescription>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-200", gradingOpen && "rotate-180")} />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {([
                      { id: "minCoc", label: "Minimum CoC (%)", step: "0.1" },
                      { id: "excellentCoc", label: "Excellent CoC (%)", step: "0.1" },
                      { id: "minDscr", label: "Minimum DSCR", step: "0.01" },
                      { id: "excellentDscr", label: "Excellent DSCR", step: "0.01" },
                      { id: "minStressDscr", label: "Min Stress DSCR", step: "0.01" },
                      { id: "excellentStressDscr", label: "Excellent Stress DSCR", step: "0.01" },
                    ] as const).map(f => (
                      <div key={f.id} className="space-y-1.5">
                        <Label htmlFor={f.id} className="text-xs font-semibold uppercase tracking-wider text-slate-500">{f.label}</Label>
                        <Input id={f.id} type="number" step={f.step} {...register(f.id)} className="font-mono h-8 text-sm" />
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

          </div>

          {/* ── Results Column ───────────────────────────────────────────── */}
          <div className="flex-1 lg:max-w-[35%] relative">
            <div className="sticky top-20 flex flex-col gap-6 z-20">

              <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-800 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Terminal Output
                  </h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => exportAnalysisPdf("Current Analysis", parsedData, results)}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-200"
                      title="Export PDF" data-testid="button-export-pdf-panel">
                      <FileDown className="w-4 h-4" />
                    </button>
                    <GradeBadge grade={results.investmentGrade} />
                  </div>
                </div>

                <CardContent className="p-0">
                  <div className="p-5 space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Core Financials</div>
                    <MetricRow label="Loan Amount" value={results.loanAmount} testId="result-loan-amount" />
                    <MetricRow label="Annual Debt Service" value={results.annualDebtService} testId="result-debt-service" />
                    <MetricRow label="Effective Gross Income" value={results.egi} testId="result-egi" />
                    <MetricRow label="Total OpEx (Annual)" value={results.totalOperatingExpenses} testId="result-opex" />
                    <div className="h-px bg-slate-100 my-2" />
                    <MetricRow label="Net Operating Income" value={results.noi} colorClass="text-slate-900 text-base font-bold" testId="result-noi" />
                    <MetricRow label="Cash Flow (Annual)" value={results.cashFlow}
                      colorClass={cn("text-base font-bold", results.cashFlow >= 0 ? "text-green-600" : "text-red-600")}
                      testId="result-cash-flow" />
                  </div>
                  <div className="bg-slate-50 p-5 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Yield Metrics</div>
                    <MetricRow label="Cash-on-Cash Return" value={results.coc} format="percent"
                      colorClass={cn("text-lg font-bold", getCocColor(results.coc))} testId="result-coc" />
                    <MetricRow label="Debt Service Coverage Ratio" value={results.dscr} format="number"
                      colorClass={cn("text-lg font-bold", getDscrColor(results.dscr))} testId="result-dscr" />
                    <MetricRow label="Cap Rate" value={results.capRate} format="percent"
                      colorClass="text-slate-700 font-semibold" testId="result-cap-rate" />
                    <div className="h-px bg-slate-200 my-2" />
                    <div className="flex justify-between items-start py-1.5">
                      <div>
                        <span className="text-sm font-medium text-slate-500 block">Breakeven Occupancy</span>
                        <span className="text-[11px] text-slate-400 leading-tight">min. fill rate to cover OpEx + debt</span>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            "text-sm font-bold tabular-nums tracking-tight",
                            results.breakEvenOccupancy === null ? "text-slate-400" :
                            results.breakEvenOccupancy > 100 ? "text-red-600" :
                            results.breakEvenOccupancy > 90 ? "text-red-500" :
                            results.breakEvenOccupancy > 80 ? "text-yellow-600" :
                            "text-green-600"
                          )}
                          style={{ fontVariantNumeric: "tabular-nums" }}
                          data-testid="result-breakeven-occupancy"
                        >
                          {results.breakEvenOccupancy === null ? "N/A" :
                           results.breakEvenOccupancy > 100 ? ">100% (impossible)" :
                           `${results.breakEvenOccupancy.toFixed(1)}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-amber-200 bg-amber-100/60 flex justify-between items-center">
                  <h2 className="text-md font-semibold tracking-tight text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Stressed Scenario
                  </h2>
                  <GradeBadge grade={results.stressGrade} />
                </div>
                <CardContent className="p-5 space-y-1">
                  <MetricRow label="Stressed NOI" value={results.stressedNoi} testId="result-stressed-noi" />
                  <MetricRow label="Stressed Cash Flow" value={results.stressedCashFlow}
                    colorClass={cn("font-bold", results.stressedCashFlow >= 0 ? "text-green-600" : "text-red-600")}
                    testId="result-stressed-cash-flow" />
                  <div className="h-px bg-amber-200 my-2" />
                  <MetricRow label="Stressed DSCR" value={results.stressedDscr} format="number"
                    colorClass={cn("text-base font-bold", getDscrColor(results.stressedDscr, true))}
                    testId="result-stressed-dscr" />
                  <MetricRow label="Stressed Cap Rate" value={results.stressedCapRate} format="percent"
                    colorClass="text-slate-700" testId="result-stressed-cap-rate" />
                </CardContent>
              </Card>

            </div>
          </div>

        </div>
      </main>

      {/* ── Mobile sticky results strip ──────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch divide-x divide-slate-100">
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Cash Flow</span>
            <span className={cn(
              "text-sm font-bold tabular-nums",
              results.cashFlow >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(results.cashFlow)}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">CoC Return</span>
            <span className={cn("text-sm font-bold tabular-nums", getCocColor(results.coc))}>
              {formatPercent(results.coc)}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 px-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">DSCR</span>
            <span className={cn("text-sm font-bold tabular-nums", getDscrColor(results.dscr))}>
              {formatNumber(results.dscr)}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center py-2.5 px-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Grade</span>
            <GradeBadge grade={results.investmentGrade} />
          </div>
        </div>
      </div>

    </div>
  );
}
