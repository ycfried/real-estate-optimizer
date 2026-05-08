import { useMemo } from "react";

export type Unit = {
  name: string;
  rent: number;
  otherIncome: number;
  occupied: boolean;
};

export type AdditionalExpense = {
  id: string;
  name: string;
  amount: number;
};

export type InvestmentData = {
  purchasePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTerm: number;
  units: Unit[];
  vacancyRatePercent: number;
  taxes: number;
  insurance: number;
  utilities: number;
  trashSnow: number;
  landscaping: number;
  maintenance: number;
  management: number;
  accounting: number;
  capex: number;
  otherExpenses: number;
  additionalExpenses: AdditionalExpense[];
  extraVacancyPercent: number;
  rentReductionPercent: number;
  insuranceIncreasePercent: number;
  taxIncreasePercent: number;
  maintenanceIncreasePercent: number;
  minCoc: number;
  minDscr: number;
  excellentCoc: number;
  excellentDscr: number;
  minStressDscr: number;
  excellentStressDscr: number;
};

export const defaultInvestmentData: InvestmentData = {
  purchasePrice: 1000000,
  downPaymentPercent: 25,
  interestRate: 6.5,
  loanTerm: 30,
  units: [
    { name: "Unit 1", rent: 1000, otherIncome: 0, occupied: true },
    { name: "Unit 2", rent: 1000, otherIncome: 0, occupied: true },
    { name: "Unit 3", rent: 1000, otherIncome: 0, occupied: true },
    { name: "Unit 4", rent: 1000, otherIncome: 0, occupied: true },
  ],
  vacancyRatePercent: 5,
  taxes: 1000,
  insurance: 200,
  utilities: 150,
  trashSnow: 100,
  landscaping: 100,
  maintenance: 400,
  management: 800,
  accounting: 50,
  capex: 250,
  otherExpenses: 50,
  additionalExpenses: [],
  extraVacancyPercent: 5,
  rentReductionPercent: 10,
  insuranceIncreasePercent: 20,
  taxIncreasePercent: 15,
  maintenanceIncreasePercent: 20,
  minCoc: 8,
  minDscr: 1.25,
  excellentCoc: 15,
  excellentDscr: 1.6,
  minStressDscr: 1.1,
  excellentStressDscr: 1.4,
};

export function useInvestmentCalculations(data: InvestmentData) {
  return useMemo(() => {
    const downPaymentAmount = data.purchasePrice * (data.downPaymentPercent / 100);
    const loanAmount = data.purchasePrice - downPaymentAmount;

    let monthlyMortgagePayment = 0;
    const monthlyRate = (data.interestRate / 100) / 12;
    const n = data.loanTerm * 12;
    if (data.interestRate === 0) {
      monthlyMortgagePayment = n > 0 ? loanAmount / n : 0;
    } else if (n > 0) {
      monthlyMortgagePayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    }
    const annualDebtService = monthlyMortgagePayment * 12;

    const totalMonthlyIncome = data.units.reduce((sum, unit) => {
      return sum + (unit.occupied ? (unit.rent || 0) + (unit.otherIncome || 0) : 0);
    }, 0);
    const totalAnnualIncome = totalMonthlyIncome * 12;
    const egi = totalAnnualIncome * (1 - (data.vacancyRatePercent / 100));

    const additionalMonthly = (data.additionalExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    const monthlyOpEx =
      (data.taxes || 0) + (data.insurance || 0) + (data.utilities || 0) +
      (data.trashSnow || 0) + (data.landscaping || 0) + (data.maintenance || 0) +
      (data.management || 0) + (data.accounting || 0) + (data.capex || 0) +
      (data.otherExpenses || 0) + additionalMonthly;
    const totalOperatingExpenses = monthlyOpEx * 12;
    const noi = egi - totalOperatingExpenses;

    const cashFlow = noi - annualDebtService;
    const coc = downPaymentAmount > 0 ? (cashFlow / downPaymentAmount) * 100 : null;
    const dscr = annualDebtService > 0 ? noi / annualDebtService : null;
    const capRate = data.purchasePrice > 0 ? (noi / data.purchasePrice) * 100 : null;

    const stressedEgi = totalAnnualIncome *
      (1 - (data.vacancyRatePercent / 100) - (data.extraVacancyPercent / 100)) *
      (1 - (data.rentReductionPercent / 100));
    const annualInsurance = (data.insurance || 0) * 12;
    const annualTaxes = (data.taxes || 0) * 12;
    const annualMaintenance = (data.maintenance || 0) * 12;
    const stressedInsurance = annualInsurance * (1 + (data.insuranceIncreasePercent / 100));
    const stressedTaxes = annualTaxes * (1 + (data.taxIncreasePercent / 100));
    const stressedMaintenance = annualMaintenance * (1 + (data.maintenanceIncreasePercent / 100));
    const stressedTotalExpenses = totalOperatingExpenses - annualInsurance - annualTaxes - annualMaintenance
      + stressedInsurance + stressedTaxes + stressedMaintenance;
    const stressedNoi = stressedEgi - stressedTotalExpenses;
    const stressedCashFlow = stressedNoi - annualDebtService;
    const stressedDscr = annualDebtService > 0 ? stressedNoi / annualDebtService : null;
    const stressedCapRate = data.purchasePrice > 0 ? (stressedNoi / data.purchasePrice) * 100 : null;

    let investmentGrade: "Excellent" | "Good" | "Poor" | "N/A" = "N/A";
    if (coc !== null && dscr !== null) {
      if (coc >= data.excellentCoc && dscr >= data.excellentDscr) investmentGrade = "Excellent";
      else if (coc >= data.minCoc && dscr >= data.minDscr) investmentGrade = "Good";
      else investmentGrade = "Poor";
    }
    let stressGrade: "Excellent" | "Good" | "Poor" | "N/A" = "N/A";
    if (stressedDscr !== null) {
      if (stressedDscr >= data.excellentStressDscr) stressGrade = "Excellent";
      else if (stressedDscr >= data.minStressDscr) stressGrade = "Good";
      else stressGrade = "Poor";
    }

    // Breakeven occupancy: the % of gross potential income needed to cover
    // all operating expenses + debt service.
    const breakEvenOccupancy =
      totalAnnualIncome > 0
        ? ((totalOperatingExpenses + annualDebtService) / totalAnnualIncome) * 100
        : null;

    return {
      loanAmount, annualDebtService, egi, totalOperatingExpenses, noi,
      cashFlow, coc, dscr, capRate,
      stressedNoi, stressedCashFlow, stressedDscr, stressedCapRate,
      investmentGrade, stressGrade, totalAnnualIncome, breakEvenOccupancy,
    };
  }, [data]);
}
