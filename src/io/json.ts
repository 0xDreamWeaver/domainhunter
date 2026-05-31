import type { CheckResult } from '../types.js';

export async function exportJson(results: CheckResult[], filePath: string): Promise<void> {
  const output = results.map(r => ({
    domain: r.domain.name,
    status: r.status,
    seoScore: r.seoScore.total,
    seoBreakdown: r.seoScore.breakdown,
    prices: r.prices.map(p => ({
      registrar: p.registrar,
      price: p.price,
      currency: p.currency,
      url: p.purchaseUrl,
    })),
    whois: r.whois
      ? {
          registrar: r.whois.registrar,
          registrant: r.whois.registrant,
          email: r.whois.email,
          created: r.whois.created,
          expires: r.whois.expires,
          updated: r.whois.updated,
          nameservers: r.whois.nameservers,
          status: r.whois.status,
        }
      : null,
    checkedAt: r.checkedAt.toISOString(),
    error: r.error,
  }));

  await Bun.write(filePath, JSON.stringify(output, null, 2));
}
