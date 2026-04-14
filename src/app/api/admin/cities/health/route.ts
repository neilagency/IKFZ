import { NextResponse } from 'next/server';
import { getCities, getAuthority, getOverrides } from '@/data/cities';
import { getCSVStats, fuzzyMatchAuthority } from '@/lib/csvParser';

export async function GET() {
  const start = Date.now();
  const issues: { slug: string; type: string; message: string }[] = [];

  const cities = getCities();
  const csvStats = getCSVStats();
  const overrides = getOverrides();

  let matched = 0;
  let withOverrides = 0;
  let missingPhone = 0;
  let missingEmail = 0;
  let lowScore = 0;

  for (const city of cities) {
    const match = fuzzyMatchAuthority(city.name, city.slug);

    if (!match) {
      issues.push({ slug: city.slug, type: 'no_match', message: `Keine CSV-Zuordnung für "${city.name}"` });
      continue;
    }

    matched++;

    if (match.score < 80) {
      lowScore++;
      issues.push({ slug: city.slug, type: 'low_score', message: `Niedrige Match-Qualität: ${match.score} (${match.matchType})` });
    }

    const authority = getAuthority(city.slug);
    if (authority) {
      if (!authority.phone) {
        missingPhone++;
        issues.push({ slug: city.slug, type: 'missing_phone', message: 'Keine Telefonnummer' });
      }
      if (!authority.email) {
        missingEmail++;
        issues.push({ slug: city.slug, type: 'missing_email', message: 'Keine E-Mail-Adresse' });
      }
    }

    if (overrides[city.slug]) {
      withOverrides++;
    }
  }

  const duration = Date.now() - start;
  const healthScore = Math.round(
    (matched / cities.length) * 60 +
    ((cities.length - issues.filter(i => i.type !== 'missing_phone' && i.type !== 'missing_email').length) / cities.length) * 40
  );

  return NextResponse.json({
    status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
    score: Math.min(healthScore, 100),
    duration: `${duration}ms`,
    summary: {
      totalCities: cities.length,
      csvEntries: csvStats.total,
      matched,
      unmatched: cities.length - matched,
      coveragePercent: Math.round((matched / cities.length) * 100),
      withOverrides,
      lowScore,
      missingPhone,
      missingEmail,
    },
    issues,
    timestamp: new Date().toISOString(),
  });
}
