export const CURSOR_SUBCOMMANDS = [
  'auth',
  'status',
  'models',
  'start',
  'stop',
  'enable',
  'disable',
  'usage',
  'help',
  '--help',
  '-h',
] as const;

export function isCursorSubcommandToken(token?: string): boolean {
  return (
    Boolean(token) && CURSOR_SUBCOMMANDS.includes(token as (typeof CURSOR_SUBCOMMANDS)[number])
  );
}
