import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { FileTextIcon, SettingsIcon, GithubIcon, ExternalLinkIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function HubFooter() {
  const currentYear = new Date().getFullYear();

  // Fetch version from overview API
  const { data: overview } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.overview.get(),
  });

  const footerLinks = [
    {
      icon: <FileTextIcon className="w-4 h-4" />,
      label: 'Logs',
      href: '#logs',
      onClick: () => console.log('Navigate to Logs'),
    },
    {
      icon: <SettingsIcon className="w-4 h-4" />,
      label: 'Settings',
      href: '#settings',
      onClick: () => console.log('Navigate to Settings'),
    },
    {
      icon: <GithubIcon className="w-4 h-4" />,
      label: 'GitHub',
      href: 'https://github.com/kaitranntt/ccs',
      external: true,
    },
  ];

  return (
    <footer className="mt-auto border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>CCS v{overview?.version ?? '...'}</span>
          <Separator orientation="vertical" className="h-4" />
          <span>© {currentYear} kaitranntt</span>
        </div>

        <div className="ml-auto flex items-center space-x-2">
          {footerLinks.map((link) => (
            <Button
              key={link.label}
              variant="ghost"
              size="sm"
              asChild={link.external}
              onClick={link.onClick}
              className="h-8 px-2"
            >
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  {link.icon}
                  <span className="hidden sm:inline">{link.label}</span>
                  <ExternalLinkIcon className="w-3 h-3" />
                </a>
              ) : (
                <div className="flex items-center gap-1">
                  {link.icon}
                  <span className="hidden sm:inline">{link.label}</span>
                </div>
              )}
            </Button>
          ))}
        </div>
      </div>
    </footer>
  );
}
