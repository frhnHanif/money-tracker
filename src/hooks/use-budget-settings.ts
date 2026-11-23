"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface BudgetSettingsResponse {
  monthlySalary: number;
  isBudgetingEnabled: boolean;
  resetDay: number;
}

const getSalaryKey = (userId?: string) =>
  userId ? `monthly_salary_${userId}` : "monthly_salary";
const getEnabledKey = (userId?: string) =>
  userId ? `budgeting_enabled_${userId}` : "budgeting_enabled";
const getResetDayKey = (userId?: string) =>
  userId ? `budget_reset_day_${userId}` : "budget_reset_day";

export function useBudgetSettings() {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  // Local storage cached fallback for instant rendering
  const [cachedSalary, setCachedSalary] = useState<number | null>(null);
  const [cachedEnabled, setCachedEnabled] = useState<boolean | null>(null);
  const [cachedResetDay, setCachedResetDay] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    const s = localStorage.getItem(getSalaryKey(userId));
    if (s !== null) {
      const parsed = parseInt(s, 10);
      if (!isNaN(parsed)) setCachedSalary(parsed);
    }
    const e = localStorage.getItem(getEnabledKey(userId));
    if (e !== null) {
      setCachedEnabled(e === "true");
    }
    const r = localStorage.getItem(getResetDayKey(userId));
    if (r !== null) {
      const parsed = parseInt(r, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) setCachedResetDay(parsed);
    }
  }, [userId]);

  const { data, isLoading } = useQuery<BudgetSettingsResponse>({
    queryKey: ["budget-settings", userId],
    queryFn: async () => {
      const res = await fetch("/api/budget-settings");
      if (!res.ok) throw new Error("Failed to fetch budget settings");
      const json = await res.json();
      if (userId) {
        localStorage.setItem(getSalaryKey(userId), String(json.monthlySalary));
        localStorage.setItem(getEnabledKey(userId), String(json.isBudgetingEnabled));
        localStorage.setItem(getResetDayKey(userId), String(json.resetDay ?? 1));
      }
      return json;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (payload: {
      monthlySalary?: number;
      isBudgetingEnabled?: boolean;
      resetDay?: number;
    }) => {
      const res = await fetch("/api/budget-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update budget settings");
      return res.json();
    },
    onMutate: async (newValues) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: ["budget-settings", userId] });
      const previous = queryClient.getQueryData<BudgetSettingsResponse>([
        "budget-settings",
        userId,
      ]);

      if (newValues.monthlySalary !== undefined) {
        localStorage.setItem(getSalaryKey(userId), String(newValues.monthlySalary));
        setCachedSalary(newValues.monthlySalary);
      }
      if (newValues.isBudgetingEnabled !== undefined) {
        localStorage.setItem(getEnabledKey(userId), String(newValues.isBudgetingEnabled));
        setCachedEnabled(newValues.isBudgetingEnabled);
      }
      if (newValues.resetDay !== undefined) {
        localStorage.setItem(getResetDayKey(userId), String(newValues.resetDay));
        setCachedResetDay(newValues.resetDay);
      }

      queryClient.setQueryData<BudgetSettingsResponse>(["budget-settings", userId], (old) => ({
        monthlySalary: newValues.monthlySalary ?? old?.monthlySalary ?? 0,
        isBudgetingEnabled: newValues.isBudgetingEnabled ?? old?.isBudgetingEnabled ?? true,
        resetDay: newValues.resetDay ?? old?.resetDay ?? 1,
      }));

      return { previous };
    },
    onError: (_err, _newValues, context) => {
      if (context?.previous && userId) {
        queryClient.setQueryData(["budget-settings", userId], context.previous);
        localStorage.setItem(getSalaryKey(userId), String(context.previous.monthlySalary));
        localStorage.setItem(getEnabledKey(userId), String(context.previous.isBudgetingEnabled));
        localStorage.setItem(getResetDayKey(userId), String(context.previous.resetDay ?? 1));
      }
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["budget-settings", userId] });
      }
      queryClient.invalidateQueries({ queryKey: ["four-pockets"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["trend"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const isBudgetingEnabled =
    data?.isBudgetingEnabled ?? cachedEnabled ?? true;
  const monthlySalary =
    data?.monthlySalary ?? cachedSalary ?? 0;
  const resetDay =
    data?.resetDay ?? cachedResetDay ?? 1;
  const mounted = status !== "loading";

  return {
    isBudgetingEnabled,
    setBudgetingEnabled: (val: boolean) => mutation.mutate({ isBudgetingEnabled: val }),
    monthlySalary,
    setSalary: (val: number) => mutation.mutate({ monthlySalary: val }),
    resetDay,
    setResetDay: (val: number) => mutation.mutateAsync({ resetDay: val }),
    mounted,
    isLoading: status === "loading" || (isLoading && cachedSalary === null),
  };
}
