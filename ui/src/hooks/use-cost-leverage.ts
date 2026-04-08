/**
 * React Query hook for Cost Leverage Ratio card
 * Fetches multi-window cost data and manages baseline cost config
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { api } from '@/lib/api-client';

// Types
export interface CostLeverageWindow {
  label: string;
  estimatedCost: number;
  scaledBaseline: number;
  ratio: number | null;
  ratioDisplay: string;
  windowDays: number;
}

export interface CostLeverageData {
  baselineCost: number | undefined;
  windows: CostLeverageWindow[];
  isLoading: boolean;
  error: string | null;
}

interface WindowCostResult {
  totalCost: number;
}

// Helpers
async function fetchWindowCost(since: Date, until: Date): Promise<number> {
  try {
    const params = new URLSearchParams();
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}${m}${dd}`;
    };
    params.append('since', fmt(since));
    params.append('until', fmt(until));
    const res = await fetch(`/api/usage/summary?${params}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return 0;
    const json = await res.json();
    const data: WindowCostResult = json.data || json;
    return data.totalCost || 0;
  } catch {
    return 0;
  }
}

function getDaysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function getElapsedDaysInMonth(): number {
  const now = new Date();
  return now.getDate();
}

function computeRatio(cost: number, scaledBaseline: number): string {
  if (scaledBaseline <= 0) return 'N/A';
  const ratio = cost / scaledBaseline;
  return `${ratio.toFixed(2)}x`;
}

function computeRatioNumber(cost: number, scaledBaseline: number): number | null {
  if (scaledBaseline <= 0) return null;
  return cost / scaledBaseline;
}

// Hook
export function useCostLeverage() {
  const queryClient = useQueryClient();

  // Fetch config for baseline cost
  const configQuery = useQuery({
    queryKey: ['cost-leverage-config'],
    queryFn: async () => {
      const config = await api.config.get();
      const prefs = config.preferences as Record<string, unknown> | undefined;
      const val = prefs?.baseline_cost_30d;
      return typeof val === 'number' ? val : undefined;
    },
    staleTime: 30 * 1000,
  });

  const baselineCost = configQuery.data;

  // Fetch cost for three time windows in parallel
  const today = useMemo(() => new Date(), []);
  const windows7d = useMemo(() => {
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(start.getDate() - 6); // 7 days including today
    return { start, end };
  }, [today]);

  const windows30d = useMemo(() => {
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(start.getDate() - 29); // 30 days including today
    return { start, end };
  }, [today]);

  const windowMonth = useMemo(() => {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today);
    return { start, end };
  }, [today]);

  const cost7dQuery = useQuery({
    queryKey: ['cost-leverage', '7d'],
    queryFn: () => fetchWindowCost(windows7d.start, windows7d.end),
    staleTime: 60 * 1000,
  });

  const cost30dQuery = useQuery({
    queryKey: ['cost-leverage', '30d'],
    queryFn: () => fetchWindowCost(windows30d.start, windows30d.end),
    staleTime: 60 * 1000,
  });

  const costMonthQuery = useQuery({
    queryKey: ['cost-leverage', 'month'],
    queryFn: () => fetchWindowCost(windowMonth.start, windowMonth.end),
    staleTime: 60 * 1000,
  });

  // Save baseline cost mutation
  const saveMutation = useMutation({
    mutationFn: async (value: number | undefined) => {
      const config = await api.config.get();
      const currentPrefs = (config.preferences as Record<string, unknown>) || {};
      const updatedPrefs = { ...currentPrefs };
      if (value === undefined || value === null) {
        delete updatedPrefs.baseline_cost_30d;
      } else {
        updatedPrefs.baseline_cost_30d = value;
      }
      return api.config.update({ preferences: updatedPrefs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-leverage-config'] });
    },
  });

  // Compute windows
  const windows: CostLeverageWindow[] = useMemo(() => {
    const elapsedDays = getElapsedDaysInMonth();
    const totalDays = getDaysInCurrentMonth();

    const entries: Array<{
      label: string;
      cost: number;
      windowDays: number;
      scaleDays: number;
    }> = [
      { label: '7d', cost: cost7dQuery.data ?? 0, windowDays: 7, scaleDays: 7 },
      { label: '30d', cost: cost30dQuery.data ?? 0, windowDays: 30, scaleDays: 30 },
      {
        label: 'Month',
        cost: costMonthQuery.data ?? 0,
        windowDays: elapsedDays,
        scaleDays: totalDays,
      },
    ];

    return entries.map((e) => {
      const scaledBaseline = baselineCost ? (baselineCost * e.scaleDays) / 30 : 0;
      return {
        label: e.label,
        estimatedCost: e.cost,
        scaledBaseline,
        ratio: computeRatioNumber(e.cost, scaledBaseline),
        ratioDisplay: computeRatio(e.cost, scaledBaseline),
        windowDays: e.windowDays,
      };
    });
  }, [baselineCost, cost7dQuery.data, cost30dQuery.data, costMonthQuery.data]);

  // Save action with validation
  const saveBaseline = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed === '') {
        saveMutation.mutate(undefined);
        return { valid: true as const };
      }
      const num = Number(trimmed);
      if (isNaN(num) || num <= 0) {
        return { valid: false as const, error: 'invalid' };
      }
      saveMutation.mutate(num);
      return { valid: true as const };
    },
    [saveMutation]
  );

  const isLoading =
    configQuery.isLoading ||
    (cost7dQuery.isLoading && cost30dQuery.isLoading && costMonthQuery.isLoading);

  const error = configQuery.error?.message || saveMutation.error?.message || null;

  return {
    baselineCost,
    windows,
    isLoading,
    isSaving: saveMutation.isPending,
    error,
    saveBaseline,
    // Expose raw query data for debugging
    cost7d: cost7dQuery.data,
    cost30d: cost30dQuery.data,
    costMonth: costMonthQuery.data,
  } satisfies CostLeverageData & {
    isSaving: boolean;
    saveBaseline: (value: string) => { valid: true } | { valid: false; error: string };
    cost7d?: number;
    cost30d?: number;
    costMonth?: number;
  };
}
