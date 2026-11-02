"use client";

import { useState, useEffect } from "react";

const BUDGETING_ENABLED_KEY = "budgeting_enabled";
const MONTHLY_SALARY_KEY = "monthly_salary";
const DEFAULT_SALARY = 8780000;

export function useBudgetSettings() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [salary, setSalaryState] = useState<number>(DEFAULT_SALARY);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const savedEnabled = localStorage.getItem(BUDGETING_ENABLED_KEY);
    if (savedEnabled !== null) {
      setEnabled(savedEnabled === "true");
    }

    const savedSalary = localStorage.getItem(MONTHLY_SALARY_KEY);
    if (savedSalary) {
      const parsed = parseInt(savedSalary, 10);
      if (!isNaN(parsed) && parsed > 0) setSalaryState(parsed);
    }
    setMounted(true);

    const onStorage = () => {
      const e = localStorage.getItem(BUDGETING_ENABLED_KEY);
      if (e !== null) setEnabled(e === "true");
      const s = localStorage.getItem(MONTHLY_SALARY_KEY);
      if (s) {
        const parsed = parseInt(s, 10);
        if (!isNaN(parsed) && parsed > 0) setSalaryState(parsed);
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("budget-settings-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("budget-settings-changed", onStorage);
    };
  }, []);

  const setBudgetingEnabled = (val: boolean) => {
    setEnabled(val);
    localStorage.setItem(BUDGETING_ENABLED_KEY, String(val));
    window.dispatchEvent(new Event("budget-settings-changed"));
  };

  const setSalary = (val: number) => {
    setSalaryState(val);
    localStorage.setItem(MONTHLY_SALARY_KEY, String(val));
    window.dispatchEvent(new Event("budget-settings-changed"));
  };

  return {
    isBudgetingEnabled: enabled,
    setBudgetingEnabled,
    monthlySalary: salary,
    setSalary,
    mounted,
  };
}
