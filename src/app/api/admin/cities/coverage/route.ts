import { NextResponse } from 'next/server';
import { getCities } from '@/data/cities';
import { fuzzyMatchAuthority, getCSVStats } from '@/lib/csvParser';

export async function GET() {
  const cities = getCities();
  const stats = getCSVStats();

  const coverage = cities.map(city => {
    const match = fuzzyMatchAuthority(city.name, city.slug);
    return {
      slug: city.slug,
      name: city.name,
      state: city.state,
      matched: !!match,
      matchScore: match?.score ?? 0,
      matchType: match?.matchType ?? null,
      csvCity: match?.authority.csvCity ?? null,
      authorityName: match?.authority.name ?? null,
      phone: match?.authority.phone ?? null,
      email: match?.authority.email ?? null,
    };
  });

  const matched = coverage.filter(c => c.matched).length;

  return NextResponse.json({
    stats,
    coverage,
    summary: {
      total: cities.length,
      matched,
      unmatched: cities.length - matched,
      percentage: Math.round((matched / cities.length) * 100),
    },
  });
}
