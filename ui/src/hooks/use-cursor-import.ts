/**
 * Cursor Usage Import Hooks
 *
 * React Query hooks for Cursor CSV import operations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usageApi } from './use-usage';

/** Hook to trigger CSV import with loading/error state */
export function useCursorImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => usageApi.cursorImport(file),
    onSuccess: () => {
      // Invalidate all usage queries so dashboard refreshes with Cursor data
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      queryClient.invalidateQueries({ queryKey: ['cursor-status'] });
    },
  });
}

/** Hook to check Cursor data import status */
export function useCursorStatus() {
  return useQuery({
    queryKey: ['cursor-status'],
    queryFn: () => usageApi.cursorStatus(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/** Hook to clear stored Cursor data */
export function useCursorDataClear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => usageApi.cursorDataClear(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      queryClient.invalidateQueries({ queryKey: ['cursor-status'] });
    },
  });
}
