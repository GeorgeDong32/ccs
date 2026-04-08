/**
 * Cost Leverage Ratio Card Component
 *
 * Replaces CLIProxy Stats card in Analyze page bottom-right grid.
 * Displays cost leverage ratios for 7d, 30d, and current month windows
 * with an inline baseline cost input persisted to config.
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrivacy, PRIVACY_BLUR_CLASS } from '@/contexts/privacy-context';
import { useCostLeverage, type CostLeverageWindow } from '@/hooks/use-cost-leverage';

interface CostLeverageCardProps {
  className?: string;
  isLoading?: boolean;
}

export function CostLeverageCard({ className, isLoading: externalLoading }: CostLeverageCardProps) {
  const { privacyMode } = usePrivacy();
  const { t } = useTranslation();
  const { baselineCost, windows, isLoading, isSaving, error, saveBaseline } = useCostLeverage();

  const [inputValue, setInputValue] = useState<string>(
    baselineCost !== undefined ? String(baselineCost) : ''
  );
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input when baseline loads from config
  const [hasSynced, setHasSynced] = useState(false);
  if (baselineCost !== undefined && !hasSynced) {
    setInputValue(String(baselineCost));
    setHasSynced(true);
  }
  if (baselineCost === undefined && hasSynced) {
    setHasSynced(false);
  }

  const handleSave = useCallback(() => {
    const result = saveBaseline(inputValue);
    if (!result.valid) {
      setInputError(t('analyticsCostLeverage.invalidInput'));
    } else {
      setInputError(null);
      if (inputValue.trim() === '') {
        setInputValue('');
        setHasSynced(false);
      }
    }
  }, [inputValue, saveBaseline, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  const hasBaseline = baselineCost !== undefined && baselineCost > 0;

  if (isLoading || externalLoading) {
    return (
      <Card className={cn('flex flex-col h-full', className)}>
        <CardHeader className="px-3 py-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0 flex-1">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('flex flex-col h-full shadow-sm', className)}>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Scale className="w-4 h-4" />
          {t('analyticsCostLeverage.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 flex-1 flex flex-col gap-2">
        {/* Baseline cost input */}
        <div className="flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setInputError(null);
            }}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            placeholder={t('analyticsCostLeverage.baselinePlaceholder')}
            disabled={isSaving}
            className={cn(
              'h-7 text-xs',
              inputError && 'border-destructive focus-visible:ring-destructive'
            )}
          />
        </div>

        {/* Validation error */}
        {inputError && <p className="text-[10px] text-destructive">{inputError}</p>}

        {/* Save error from API */}
        {error && (
          <p className="text-[10px] text-destructive">
            {t('analyticsCostLeverage.saveError')}: {error}
          </p>
        )}

        {/* Ratio rows or prompt */}
        {!hasBaseline ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {t('analyticsCostLeverage.noBaseline')}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-1.5 justify-center">
            {windows.map((w) => (
              <RatioRow key={w.label} window={w} privacyMode={privacyMode} t={t} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Individual ratio row
function RatioRow({
  window: w,
  privacyMode,
  t,
}: {
  window: CostLeverageWindow;
  privacyMode: boolean;
  t: (key: string) => string;
}) {
  const labelKey =
    w.label === '7d'
      ? 'analyticsCostLeverage.window7d'
      : w.label === '30d'
        ? 'analyticsCostLeverage.window30d'
        : 'analyticsCostLeverage.windowMonth';

  const ratioColor =
    w.ratio === null
      ? 'text-muted-foreground'
      : w.ratio < 2.5
        ? 'text-red-600 dark:text-red-400'
        : w.ratio < 10
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/50 border">
      <div className="flex items-center gap-1.5">
        {w.ratio !== null && w.ratio >= 10 && <TrendingUp className="w-3 h-3 text-emerald-500" />}
        <span className="text-[11px] text-muted-foreground font-medium">{t(labelKey)}</span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn('text-[10px] text-muted-foreground', privacyMode && PRIVACY_BLUR_CLASS)}
        >
          ${w.estimatedCost.toFixed(2)}
        </span>
        <span
          className={cn(
            'text-sm font-bold tabular-nums min-w-[48px] text-right',
            ratioColor,
            privacyMode && PRIVACY_BLUR_CLASS
          )}
        >
          {w.ratioDisplay}
        </span>
      </div>
    </div>
  );
}
