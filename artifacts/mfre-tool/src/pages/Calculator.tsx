import { useForm, useFieldArray, Controller } from "react-hook-form";
import { InvestmentData, defaultInvestmentData, useInvestmentCalculations } from "@/hooks/use-investment-calculations";
import { useSavedAnalyses } from "@/hooks/use-saved-analyses";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Building, DollarSign, Percent, TrendingUp, AlertTriangle, Save, BarChart3, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
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

export default function Calculator() {
  const form = useForm<InvestmentData>({
    defaultValues: defaultInvestmentData,
    mode: "onChange"
  });

  const { control, watch, register } = form;
  const { fields: unitFields } = useFieldArray({
    control,
    name: "units"
  });

  const data = watch();
  
  // Provide fallbacks for potentially empty string inputs by parsing to float
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
    }))
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

  const GradeBadge = ({ grade }: { grade: string }) => {
    let colorClass = "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700";
    
    if (grade === "Excellent") colorClass = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50";
    if (grade === "Good") colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50";
    if (grade === "Poor") colorClass = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50";
    
    return (
      <Badge variant="outline" className={cn("px-2 py-0.5 text-xs font-semibold uppercase tracking-wider", colorClass)} data-testid={`grade-${grade.toLowerCase()}`}>
        {grade}
      </Badge>
    );
  };

  const MetricRow = ({ label, value, format = "currency", colorClass = "", testId = "" }: { label: string, value: number | null | undefined, format?: "currency" | "percent" | "number", colorClass?: string, testId?: string }) => {
    let formattedValue = "N/A";
    if (format === "currency") formattedValue = formatCurrency(value);
    else if (format === "percent") formattedValue = formatPercent(value);
    else if (format === "number") formattedValue = formatNumber(value);

    return (
      <div className="flex justify-between items-center py-1.5">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className={cn("text-sm font-semibold text-slate-900 dark:text-slate-100", colorClass)} data-testid={testId}>
          {formattedValue}
        </span>
      </div>
    );
  };

  const getCocColor = (coc: number | null) => {
    if (coc === null) return "";
    if (coc >= parsedData.excellentCoc) return "text-green-600 dark:text-green-400";
    if (coc < parsedData.minCoc) return "text-red-600 dark:text-red-400";
    return "text-yellow-600 dark:text-yellow-400";
  };

  const getDscrColor = (dscr: number | null, isStressed = false) => {
    if (dscr === null) return "";
    const min = isStressed ? parsedData.minStressDscr : parsedData.minDscr;
    const excellent = isStressed ? parsedData.excellentStressDscr : parsedData.excellentDscr;
    
    if (dscr >= excellent) return "text-green-600 dark:text-green-400";
    if (dscr < min) return "text-red-600 dark:text-red-400";
    return "text-yellow-600 dark:text-yellow-400";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-primary/20 selection:text-primary">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
              <Building className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">MFRE<span className="text-primary-foreground/60 font-medium">Terminal</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-slate-400 hidden sm:flex items-center gap-1">
              LIVE CALCULATION <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse ml-1"></span>
            </div>
            <Link href="/compare" data-testid="link-compare">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Compare
                {analyses.length > 0 && (
                  <span className="bg-primary/20 text-primary border border-primary/30 rounded-full text-[10px] px-1.5 py-0 leading-4 font-mono">
                    {analyses.length}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAnalysisPdf("Current Analysis", parsedData, results)}
              className="gap-1.5 text-xs border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-500"
              data-testid="button-export-pdf-current"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export PDF
            </Button>
            <Button
              size="sm"
              onClick={() => setSaveDialogOpen(true)}
              className={cn(
                "gap-1.5 text-xs transition-all duration-300",
                savedFlash ? "bg-green-600 hover:bg-green-600" : ""
              )}
              data-testid="button-save-analysis"
            >
              <Save className="w-3.5 h-3.5" />
              {savedFlash ? "Saved!" : "Save Analysis"}
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm" data-testid="dialog-save">
          <DialogHeader>
            <DialogTitle>Save Analysis</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="property-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
              Property Name
            </Label>
            <Input
              id="property-name"
              placeholder="e.g. 123 Main St, 4-plex"
              value={propertyName}
              onChange={e => setPropertyName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              autoFocus
              data-testid="input-property-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} data-testid="button-cancel-save">
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-confirm-save">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Inputs Column */}
          <div className="flex-1 space-y-6 lg:max-w-[65%]">
            
            {/* Property & Financing */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="h-1 bg-primary w-full"></div>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-slate-500" />
                  Property & Financing
                </CardTitle>
                <CardDescription>Core acquisition and loan parameters</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Purchase Price ($)</Label>
                  <Input id="purchasePrice" type="number" {...register("purchasePrice")} data-testid="input-purchase-price" className="font-mono bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downPaymentPercent" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Down Payment (%)</Label>
                  <Input id="downPaymentPercent" type="number" step="0.1" {...register("downPaymentPercent")} data-testid="input-down-payment" className="font-mono bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Interest Rate (%)</Label>
                  <Input id="interestRate" type="number" step="0.1" {...register("interestRate")} data-testid="input-interest-rate" className="font-mono bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loanTerm" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Loan Term (Years)</Label>
                  <Input id="loanTerm" type="number" {...register("loanTerm")} data-testid="input-loan-term" className="font-mono bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-primary/50" />
                </div>
              </CardContent>
            </Card>

            {/* Rental Income */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-5 h-5 text-slate-500" />
                  Rental Income
                </CardTitle>
                <CardDescription>Monthly unit revenue and overall vacancy</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <Label htmlFor="vacancyRatePercent" className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">Base Vacancy Rate (%)</Label>
                  <Input id="vacancyRatePercent" type="number" step="0.1" {...register("vacancyRatePercent")} data-testid="input-vacancy-rate" className="w-1/3 font-mono bg-slate-50 dark:bg-slate-900" />
                </div>
                
                <div className="border rounded-md border-slate-200 dark:border-slate-800 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3">Rent ($)</th>
                        <th className="px-4 py-3">Other ($)</th>
                        <th className="px-4 py-3 text-center">Occupied</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {unitFields.map((field, index) => (
                        <tr key={field.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">Unit {index + 1}</td>
                          <td className="px-4 py-2">
                            <Input 
                              type="number" 
                              {...register(`units.${index}.rent`)} 
                              className="h-8 font-mono text-sm border-transparent hover:border-slate-200 focus:border-primary focus-visible:ring-0 bg-transparent px-2"
                              data-testid={`input-unit-${index}-rent`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input 
                              type="number" 
                              {...register(`units.${index}.otherIncome`)} 
                              className="h-8 font-mono text-sm border-transparent hover:border-slate-200 focus:border-primary focus-visible:ring-0 bg-transparent px-2"
                              data-testid={`input-unit-${index}-other`}
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Controller
                              name={`units.${index}.occupied`}
                              control={control}
                              render={({ field }) => (
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                  data-testid={`checkbox-unit-${index}-occupied`}
                                  className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                />
                              )}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Operating Expenses */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-slate-500" />
                  Operating Expenses <span className="text-sm font-normal text-slate-500">(Monthly)</span>
                </CardTitle>
                <CardDescription>Enter monthly values, annualized automatically</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {[
                    { name: "taxes", label: "Property Taxes" },
                    { name: "insurance", label: "Insurance" },
                    { name: "utilities", label: "Utilities" },
                    { name: "trashSnow", label: "Trash & Snow" },
                    { name: "landscaping", label: "Landscaping & Ground Maint." },
                    { name: "maintenance", label: "Repairs & Maintenance" },
                    { name: "management", label: "Property Management" },
                    { name: "accounting", label: "Accounting & Bookkeeping" },
                    { name: "capex", label: "CapEx Reserve" },
                    { name: "otherExpenses", label: "Other" }
                  ].map((expense) => (
                    <div key={expense.name} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
                      <Label htmlFor={expense.name} className="text-sm text-slate-600 dark:text-slate-400">{expense.label}</Label>
                      <div className="relative w-32">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-slate-400 sm:text-sm">$</span>
                        </div>
                        <Input 
                          id={expense.name} 
                          type="number" 
                          {...register(expense.name as keyof InvestmentData)} 
                          data-testid={`input-expense-${expense.name}`}
                          className="pl-7 h-9 font-mono text-right bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stress Test */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Stress Test Parameters
                </CardTitle>
                <CardDescription>Evaluate resilience under adverse conditions</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="extraVacancyPercent" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Extra Vacancy (%)</Label>
                  <Input id="extraVacancyPercent" type="number" step="0.1" {...register("extraVacancyPercent")} data-testid="input-stress-vacancy" className="font-mono bg-slate-50 dark:bg-slate-900" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentReductionPercent" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rent Reduction (%)</Label>
                  <Input id="rentReductionPercent" type="number" step="0.1" {...register("rentReductionPercent")} data-testid="input-stress-rent" className="font-mono bg-slate-50 dark:bg-slate-900" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insuranceIncreasePercent" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Insurance Increase (%)</Label>
                  <Input id="insuranceIncreasePercent" type="number" step="0.1" {...register("insuranceIncreasePercent")} data-testid="input-stress-insurance" className="font-mono bg-slate-50 dark:bg-slate-900" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxIncreasePercent" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tax Increase (%)</Label>
                  <Input id="taxIncreasePercent" type="number" step="0.1" {...register("taxIncreasePercent")} data-testid="input-stress-tax" className="font-mono bg-slate-50 dark:bg-slate-900" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenanceIncreasePercent" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Maintenance Increase (%)</Label>
                  <Input id="maintenanceIncreasePercent" type="number" step="0.1" {...register("maintenanceIncreasePercent")} data-testid="input-stress-maintenance" className="font-mono bg-slate-50 dark:bg-slate-900" />
                </div>
              </CardContent>
            </Card>

            {/* Grading Settings */}
            <Collapsible open={gradingOpen} onOpenChange={setGradingOpen}>
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm mb-12 lg:mb-0">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-4 flex flex-row items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-t-xl transition-colors">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2 text-left">
                        <Percent className="w-5 h-5 text-slate-500" />
                        Grading Settings
                      </CardTitle>
                      <CardDescription className="text-left">Adjust thresholds for Excellent/Good/Poor ratings</CardDescription>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-200", gradingOpen && "rotate-180")} />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minCoc" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Minimum CoC (%)</Label>
                      <Input id="minCoc" type="number" step="0.1" {...register("minCoc")} className="font-mono h-8 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="excellentCoc" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Excellent CoC (%)</Label>
                      <Input id="excellentCoc" type="number" step="0.1" {...register("excellentCoc")} className="font-mono h-8 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minDscr" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Minimum DSCR</Label>
                      <Input id="minDscr" type="number" step="0.01" {...register("minDscr")} className="font-mono h-8 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="excellentDscr" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Excellent DSCR</Label>
                      <Input id="excellentDscr" type="number" step="0.01" {...register("excellentDscr")} className="font-mono h-8 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minStressDscr" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Min Stress DSCR</Label>
                      <Input id="minStressDscr" type="number" step="0.01" {...register("minStressDscr")} className="font-mono h-8 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="excellentStressDscr" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Excellent Stress DSCR</Label>
                      <Input id="excellentStressDscr" type="number" step="0.01" {...register("excellentStressDscr")} className="font-mono h-8 text-sm" />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

          </div>

          {/* Results Column */}
          <div className="flex-1 lg:max-w-[35%] relative">
            <div className="sticky top-20 flex flex-col gap-6 z-20">
              
              <Card className="border-slate-800 bg-slate-900 text-slate-100 shadow-xl overflow-hidden ring-1 ring-white/10">
                <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                  <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    Terminal Output
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportAnalysisPdf("Current Analysis", parsedData, results)}
                      className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800"
                      title="Export PDF"
                      data-testid="button-export-pdf-current"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <GradeBadge grade={results.investmentGrade} />
                  </div>
                </div>
                
                <CardContent className="p-0">
                  <div className="p-5 space-y-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Core Financials</div>
                    <MetricRow label="Loan Amount" value={results.loanAmount} testId="result-loan-amount" />
                    <MetricRow label="Annual Debt Service" value={results.annualDebtService} testId="result-debt-service" />
                    <MetricRow label="Effective Gross Income" value={results.egi} testId="result-egi" />
                    <MetricRow label="Total OpEx (Annual)" value={results.totalOperatingExpenses} testId="result-opex" />
                    <div className="h-px bg-slate-800 my-2"></div>
                    <MetricRow label="Net Operating Income" value={results.noi} colorClass="text-white text-base" testId="result-noi" />
                    <MetricRow 
                      label="Cash Flow (Annual)" 
                      value={results.cashFlow} 
                      colorClass={cn("text-base", results.cashFlow !== null && results.cashFlow >= 0 ? "text-green-400" : "text-red-400")} 
                      testId="result-cash-flow" 
                    />
                  </div>

                  <div className="bg-slate-800/50 p-5 border-t border-slate-800/80">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Yield Metrics</div>
                    <MetricRow 
                      label="Cash-on-Cash Return" 
                      value={results.coc} 
                      format="percent" 
                      colorClass={cn("text-lg", getCocColor(results.coc))}
                      testId="result-coc" 
                    />
                    <MetricRow 
                      label="Debt Service Coverage Ratio" 
                      value={results.dscr} 
                      format="number" 
                      colorClass={cn("text-lg", getDscrColor(results.dscr))}
                      testId="result-dscr" 
                    />
                    <MetricRow 
                      label="Cap Rate" 
                      value={results.capRate} 
                      format="percent" 
                      colorClass="text-slate-200"
                      testId="result-cap-rate" 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Stressed Results */}
              <Card className="border-amber-900/50 bg-slate-900 text-slate-100 shadow-xl overflow-hidden ring-1 ring-amber-500/20">
                <div className="p-4 border-b border-amber-900/30 bg-amber-950/20 flex justify-between items-center">
                  <h2 className="text-md font-semibold tracking-tight text-amber-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Stressed Scenario
                  </h2>
                  <GradeBadge grade={results.stressGrade} />
                </div>
                
                <CardContent className="p-5 space-y-1">
                  <MetricRow label="Stressed NOI" value={results.stressedNoi} testId="result-stressed-noi" />
                  <MetricRow 
                    label="Stressed Cash Flow" 
                    value={results.stressedCashFlow} 
                    colorClass={cn(results.stressedCashFlow !== null && results.stressedCashFlow >= 0 ? "text-green-400" : "text-red-400")} 
                    testId="result-stressed-cash-flow" 
                  />
                  <div className="h-px bg-slate-800 my-2"></div>
                  <MetricRow 
                    label="Stressed DSCR" 
                    value={results.stressedDscr} 
                    format="number" 
                    colorClass={cn("text-base", getDscrColor(results.stressedDscr, true))}
                    testId="result-stressed-dscr" 
                  />
                  <MetricRow 
                    label="Stressed Cap Rate" 
                    value={results.stressedCapRate} 
                    format="percent" 
                    colorClass="text-slate-300"
                    testId="result-stressed-cap-rate" 
                  />
                </CardContent>
              </Card>
              
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}