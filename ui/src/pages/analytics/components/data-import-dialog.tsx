/**
 * Data Import Dialog
 *
 * Dialog for importing external usage data (Cursor CSV, etc.).
 * Extensible design to support more data sources in the future.
 */

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCursorImport, useCursorStatus, useCursorDataClear } from '@/hooks/use-cursor-import';
import { usePrivacy, PRIVACY_BLUR_CLASS } from '@/contexts/privacy-context';

export function DataImportDialog() {
  const { t } = useTranslation();
  const { privacyMode } = usePrivacy();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClear = async () => {
    if (!window.confirm(t('analyticsCursor.clearConfirm'))) return;
    try {
      await clearMutation.mutateAsync();
    } catch {
      setImportError(t('analyticsCursor.errorMessage'));
    }
  };

  const formatNumber = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString();

  const formatDate = (d: string) => {
    if (!d || d.length < 8) return d;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8">
          <Database className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('analytics.importData')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            {t('analytics.importData')}
          </DialogTitle>
          <DialogDescription>{t('analyticsCursor.fileHint')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cursor CSV Import Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="w-4 h-4" />
              Cursor IDE
            </div>

            {/* Hidden file input */}
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
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  {t('analyticsCursor.importing')}
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 mr-2" />
                  {t('analyticsCursor.importButton')}
                </>
              )}
            </Button>

            {/* Import result feedback */}
            {importMutation.isSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{t('analyticsCursor.successMessage')}</span>
              </div>
            )}
            {importError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{importError}</span>
              </div>
            )}

            {/* Status display */}
            {isStatusLoading ? null : status?.hasData ? (
              <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1.5">
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
              <p className="text-xs text-muted-foreground">{t('analyticsCursor.fileHint')}</p>
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
          </div>

          {/* Future: More import sources can be added here */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
