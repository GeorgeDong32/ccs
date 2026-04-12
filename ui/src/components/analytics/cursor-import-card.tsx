/**
 * Cursor Usage Import Card
 *
 * Card component for importing Cursor IDE usage CSV files.
 * Displays import status and stored data summary.
 */

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Trash2, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCursorImport, useCursorStatus, useCursorDataClear } from '@/hooks/use-cursor-import';
import { usePrivacy, PRIVACY_BLUR_CLASS } from '@/contexts/privacy-context';

export function CursorImportCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { privacyMode } = usePrivacy();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const importMutation = useCursorImport();
  const { data: status, isLoading: isStatusLoading } = useCursorStatus();
  const clearMutation = useCursorDataClear();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    try {
      await importMutation.mutateAsync(file);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('analyticsCursor.errorMessage'));
    }

    // Reset file input so same file can be re-imported
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClear = async () => {
    if (!window.confirm(t('analyticsCursor.clearConfirm'))) return;
    try {
      await clearMutation.mutateAsync();
    } catch {
      // Silently handle clear errors
    }
  };

  const formatNumber = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString();

  const formatDate = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

  return (
    <Card
      className={cn('flex flex-col h-full min-h-0 overflow-hidden gap-0 py-0 shadow-sm', className)}
    >
      <CardHeader className="px-3 py-2 shrink-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {t('analyticsCursor.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 flex-1 min-h-0 flex flex-col gap-2">
        {/* Hidden file input for CSV upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={importMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {t('analyticsCursor.importing')}
            </>
          ) : (
            <>
              <Upload className="w-3 h-3 mr-1" />
              {t('analyticsCursor.importButton')}
            </>
          )}
        </Button>

        {/* Import result feedback */}
        {importMutation.isSuccess && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>{t('analyticsCursor.successMessage')}</span>
          </div>
        )}
        {importError && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{importError}</span>
          </div>
        )}

        {/* Status display */}
        {isStatusLoading ? null : status?.hasData ? (
          <div className="text-xs space-y-1 flex-1">
            {status.dateRange && (
              <div className="text-muted-foreground">
                {formatDate(status.dateRange.from)} ~ {formatDate(status.dateRange.to)}
              </div>
            )}
            <div className={cn(privacyMode && PRIVACY_BLUR_CLASS)}>
              {formatNumber(status.totalTokens)} tokens &middot; {status.totalEvents} events
            </div>
            {status.models.length > 0 && (
              <div className="text-muted-foreground truncate">{status.models.join(', ')}</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground flex-1">
            {t('analyticsCursor.fileHint')}
          </div>
        )}

        {/* Clear data button */}
        {status?.hasData && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-destructive"
            disabled={clearMutation.isPending}
            onClick={handleClear}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {t('analyticsCursor.clearButton')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
