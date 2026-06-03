import { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { PrivacyProvider } from '@/contexts/privacy-context';
import { AnalyticsPage } from '@/pages/analytics';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function HeaderBar() {
  const { t } = useTranslation();
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
      <h1 className="text-sm font-semibold">{t('analyticsCharts.usageTrends')}</h1>
      <LanguageSwitcher />
    </header>
  );
}

export default function AnalyticsOnlyApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PrivacyProvider>
          <div className="h-screen flex flex-col">
            <HeaderBar />
            <main className="flex-1 min-h-0 overflow-auto">
              <BrowserRouter>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <Suspense fallback={<LoadingFallback />}>
                        <AnalyticsPage />
                      </Suspense>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </BrowserRouter>
            </main>
          </div>
          <Toaster />
        </PrivacyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
