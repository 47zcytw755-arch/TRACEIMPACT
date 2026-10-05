import { ColumnProfile } from '@/types';
import type { EChartsOption } from 'echarts';

/**
 * Standard Dark-Theme Palette for TraceImpact Cloud ECharts
 */
export const THEME_PALETTE = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#14b8a6', // Teal
];

export const BASE_CHART_TOOLTIP: EChartsOption['tooltip'] = {
  trigger: 'item',
  backgroundColor: '#0f172a',
  borderColor: '#334155',
  borderWidth: 1,
  textStyle: { color: '#f8fafc', fontSize: 12 },
  padding: [8, 12],
};

export const BASE_GRID: EChartsOption['grid'] = {
  top: '14%',
  left: '3%',
  right: '4%',
  bottom: '10%',
  containLabel: true,
};

/**
 * Compute frequency distribution for a categorical column from rows
 */
export function computeCategoryDistribution(
  rows: Record<string, unknown>[],
  columnName: string,
  maxCategories = 10
): { categories: string[]; counts: number[]; isTruncated: boolean } {
  const countsMap = new Map<string, number>();

  rows.forEach((row) => {
    const rawVal = row[columnName];
    const key =
      rawVal === null || rawVal === undefined || String(rawVal).trim() === ''
        ? '(Missing)'
        : String(rawVal).trim();
    countsMap.set(key, (countsMap.get(key) || 0) + 1);
  });

  // Sort by count descending
  const sortedEntries = Array.from(countsMap.entries()).sort((a, b) => b[1] - a[1]);

  if (sortedEntries.length <= maxCategories) {
    return {
      categories: sortedEntries.map((e) => e[0]),
      counts: sortedEntries.map((e) => e[1]),
      isTruncated: false,
    };
  }

  // Group remainder into 'Other'
  const topEntries = sortedEntries.slice(0, maxCategories);
  const otherCount = sortedEntries
    .slice(maxCategories)
    .reduce((acc, curr) => acc + curr[1], 0);

  const categories = topEntries.map((e) => e[0]);
  const counts = topEntries.map((e) => e[1]);

  if (otherCount > 0) {
    categories.push('Other Categories');
    counts.push(otherCount);
  }

  return {
    categories,
    counts,
    isTruncated: true,
  };
}

/**
 * Compute numerical histogram bins for continuous data
 */
export function computeNumericHistogram(
  rows: Record<string, unknown>[],
  columnName: string,
  numBins = 6
): { binLabels: string[]; binCounts: number[] } {
  const values: number[] = [];

  rows.forEach((r) => {
    const raw = r[columnName];
    if (typeof raw === 'number' && !isNaN(raw)) {
      values.push(raw);
    } else if (typeof raw === 'string') {
      const clean = raw.replace(/^[$€£¥]/, '').replace(/,/g, '').trim();
      const n = parseFloat(clean);
      if (!isNaN(n)) values.push(n);
    }
  });

  if (values.length === 0) {
    return { binLabels: [], binCounts: [] };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return {
      binLabels: [String(min)],
      binCounts: [values.length],
    };
  }

  const binWidth = (max - min) / numBins;
  const binCounts = new Array(numBins).fill(0);
  const binLabels: string[] = [];

  for (let i = 0; i < numBins; i++) {
    const start = min + i * binWidth;
    const end = start + binWidth;
    const isLast = i === numBins - 1;
    binLabels.push(
      `${start.toLocaleString(undefined, { maximumFractionDigits: 1 })} - ${end.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
    );

    values.forEach((v) => {
      if ((v >= start && v < end) || (isLast && v === max)) {
        binCounts[i]++;
      }
    });
  }

  return { binLabels, binCounts };
}

/**
 * Compute time-series aggregated points (Date vs Measure)
 */
export function computeTimeSeriesPoints(
  rows: Record<string, unknown>[],
  dateColName: string,
  numColName?: string
): { dates: string[]; values: number[] } {
  const pointsMap = new Map<string, { sum: number; count: number }>();

  rows.forEach((r) => {
    const rawDate = r[dateColName];
    if (!rawDate) return;

    const dateStr = String(rawDate).split('T')[0].trim();
    if (!dateStr) return;

    let numVal = 1;
    if (numColName && r[numColName] !== undefined && r[numColName] !== null) {
      const rawNum = r[numColName];
      const n =
        typeof rawNum === 'number'
          ? rawNum
          : parseFloat(String(rawNum).replace(/^[$€£¥]/, '').replace(/,/g, ''));
      if (!isNaN(n)) numVal = n;
    }

    const current = pointsMap.get(dateStr) || { sum: 0, count: 0 };
    pointsMap.set(dateStr, {
      sum: current.sum + numVal,
      count: current.count + 1,
    });
  });

  // Sort chronological
  const sortedDates = Array.from(pointsMap.keys()).sort();
  const values = sortedDates.map((d) => {
    const p = pointsMap.get(d)!;
    return numColName ? Math.round(p.sum * 100) / 100 : p.count;
  });

  return { dates: sortedDates, values };
}

/**
 * Extract paired numeric points for scatter/correlation
 */
export function extractNumericPairs(
  rows: Record<string, unknown>[],
  colX: string,
  colY: string,
  maxPoints = 50
): [number, number][] {
  const pairs: [number, number][] = [];

  for (const r of rows) {
    const valX = r[colX];
    const valY = r[colY];

    const numX =
      typeof valX === 'number'
        ? valX
        : parseFloat(String(valX).replace(/^[$€£¥]/, '').replace(/,/g, ''));
    const numY =
      typeof valY === 'number'
        ? valY
        : parseFloat(String(valY).replace(/^[$€£¥]/, '').replace(/,/g, ''));

    if (!isNaN(numX) && !isNaN(numY)) {
      pairs.push([numX, numY]);
      if (pairs.length >= maxPoints) break;
    }
  }

  return pairs;
}

/**
 * Helper to select primary candidate column for categorical charts
 */
export function findBestCategoricalColumn(columns: ColumnProfile[]): ColumnProfile | null {
  const candidates = columns.filter(
    (c) =>
      c.inferredType === 'string' &&
      c.uniqueCount >= 2 &&
      c.uniqueCount <= 25 &&
      !/(^id$|_id$|uuid|hash|url|key)/i.test(c.name)
  );

  if (candidates.length === 0) return null;
  // Sort by lowest null rate and ideal cardinality (4 to 10 is prime)
  return candidates.sort((a, b) => {
    const scoreA = Math.abs(a.uniqueCount - 6) + a.nullPercentage;
    const scoreB = Math.abs(b.uniqueCount - 6) + b.nullPercentage;
    return scoreA - scoreB;
  })[0];
}
