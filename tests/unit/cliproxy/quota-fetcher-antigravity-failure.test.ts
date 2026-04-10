import { describe, expect, it } from 'bun:test';

async function loadAntigravityQuotaTestExports() {
  const moduleId = Date.now() + Math.random();
  const mod = await import(`../../../src/cliproxy/quota-fetcher?agy-quota-fetcher=${moduleId}`);
  return mod.__testExports;
}

describe('Antigravity quota failure metadata', () => {
  it('marks 403 failures as not entitled', async () => {
    const { buildAntigravityFailure } = await loadAntigravityQuotaTestExports();

    const result = buildAntigravityFailure(403, 'forbidden');

    expect(result.entitlement).toMatchObject({
      accessState: 'not_entitled',
      capacityState: 'unknown',
    });
  });

  it('marks 429 failures as rate limited', async () => {
    const { buildAntigravityFailure } = await loadAntigravityQuotaTestExports();

    const result = buildAntigravityFailure(429, 'rate limited');

    expect(result.entitlement).toMatchObject({
      accessState: 'unknown',
      capacityState: 'rate_limited',
    });
  });

  it('preserves entitlement evidence when project lookup fails before quota fetch', async () => {
    const moduleId = Date.now() + Math.random();
    const { fetchAccountQuota } = await import(`../../../src/cliproxy/quota-fetcher?agy-early=${moduleId}`);
    const { getProviderAuthDir } = await import(
      `../../../src/cliproxy/config-generator?agy-config=${moduleId}`
    );
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');

    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-agy-failure-'));
    const originalCcsHome = process.env.CCS_HOME;
    process.env.CCS_HOME = tempHome;

    try {
      const authDir = getProviderAuthDir('agy');
      fs.mkdirSync(authDir, { recursive: true });
      fs.writeFileSync(
        path.join(authDir, 'antigravity-user@example.com.json'),
        JSON.stringify({
          type: 'antigravity',
          email: 'user@example.com',
          project_id: 'project-x',
          access_token: 'token',
        })
      );

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ error: { message: 'forbidden' } }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })) as typeof fetch;

      try {
        const result = await fetchAccountQuota('agy', 'user@example.com');
        expect(result.success).toBe(false);
        expect(result.entitlement).toMatchObject({
          accessState: 'not_entitled',
          capacityState: 'unknown',
        });
      } finally {
        globalThis.fetch = originalFetch;
      }
    } finally {
      if (originalCcsHome === undefined) {
        delete process.env.CCS_HOME;
      } else {
        process.env.CCS_HOME = originalCcsHome;
      }
      fs.rmSync(tempHome, { recursive: true, force: true });
    }
  });
});
