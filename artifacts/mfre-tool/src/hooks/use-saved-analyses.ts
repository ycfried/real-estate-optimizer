import { useState, useCallback } from "react";
import { InvestmentData } from "./use-investment-calculations";

export type SavedAnalysisResults = {
  loanAmount: number;
  annualDebtService: number;
  egi: number;
  totalOperatingExpenses: number;
  noi: number;
  cashFlow: number;
  coc: number | null;
  dscr: number | null;
  capRate: number | null;
  stressedNoi: number;
  stressedCashFlow: number;
  stressedDscr: number | null;
  stressedCapRate: number | null;
  investmentGrade: "Excellent" | "Good" | "Poor" | "N/A";
  stressGrade: "Excellent" | "Good" | "Poor" | "N/A";
  totalAnnualIncome: number;
};

export type SavedAnalysis = {
  id: string;
  name: string;
  savedAt: number;
  data: InvestmentData;
  results: SavedAnalysisResults;
};

const STORAGE_KEY = "mfre-saved-analyses";

function loadFromStorage(): SavedAnalysis[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedAnalysis[];
  } catch {
    return [];
  }
}

function saveToStorage(analyses: SavedAnalysis[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
  } catch {
    // ignore quota errors
  }
}

export function useSavedAnalyses() {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>(() => loadFromStorage());

  const saveAnalysis = useCallback((name: string, data: InvestmentData, results: SavedAnalysisResults) => {
    const newEntry: SavedAnalysis = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || "Untitled Property",
      savedAt: Date.now(),
      data,
      results,
    };
    setAnalyses(prev => {
      const updated = [newEntry, ...prev];
      saveToStorage(updated);
      return updated;
    });
    return newEntry.id;
  }, []);

  const deleteAnalysis = useCallback((id: string) => {
    setAnalyses(prev => {
      const updated = prev.filter(a => a.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setAnalyses([]);
    saveToStorage([]);
  }, []);

  return { analyses, saveAnalysis, deleteAnalysis, clearAll };
}
