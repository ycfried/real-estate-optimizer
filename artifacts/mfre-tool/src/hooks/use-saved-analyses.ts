import { useState, useCallback, useEffect } from "react";
import { collection, doc, setDoc, deleteDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
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
export function useSavedAnalyses() {
const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
const getUserCollection = () => {
const user = auth.currentUser;
if (!user) return null;
return collection(db, "users", user.uid, "analyses");
};
useEffect(() => {
const load = async () => {
const col = getUserCollection();
if (!col) return;
const q = query(col, orderBy("savedAt", "desc"));
const snapshot = await getDocs(q);
const loaded = snapshot.docs.map(d => d.data() as SavedAnalysis);
setAnalyses(loaded);
};
load();
const unsubscribe = auth.onAuthStateChanged(() => load());
return () => unsubscribe();
}, []);
const saveAnalysis = useCallback(async (name: string, data: InvestmentData, results: SavedAnalysisResults) => {
const col = getUserCollection();
if (!col) return null;
const newEntry: SavedAnalysis = {
id: ${Date.now()}-${Math.random().toString(36).slice(2, 7)},
name: name.trim() || "Untitled Property",
savedAt: Date.now(),
data,
results,
};
await setDoc(doc(col, newEntry.id), newEntry);
setAnalyses(prev => [newEntry, ...prev]);
return newEntry.id;
}, []);
const deleteAnalysis = useCallback(async (id: string) => {
const col = getUserCollection();
if (!col) return;
await deleteDoc(doc(col, id));
setAnalyses(prev => prev.filter(a => a.id !== id));
}, []);
const clearAll = useCallback(async () => {
const col = getUserCollection();
if (!col) return;
const snapshot = await getDocs(col);
await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
setAnalyses([]);
}, []);
return { analyses, saveAnalysis, deleteAnalysis, clearAll };
}