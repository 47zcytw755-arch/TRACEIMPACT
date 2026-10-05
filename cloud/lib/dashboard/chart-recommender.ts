import { DatasetRecord } from '@/types';
import { DashboardChartConfig } from './dashboard-types';
import {
  BASE_CHART_TOOLTIP,
  BASE_GRID,
  THEME_PALETTE,
  computeCategoryDistribution,
  computeNumericHistogram,
  computeTimeSeriesPoints,
  extractNumericPairs,
} from './dashboard-utils';
import type { EChartsOption } from 'echarts';

export function recommendDashboardCharts(dataset: DatasetRecord): DashboardChartConfig[] {
  const charts: DashboardChartConfig[] = [];
  const rows = dataset.previewRows || [];
  const columns = dataset.columns || dataset.profilingSummary?.columns || [];

  if (columns.length === 0) {
    return charts;
  }

  // 1. RECOMMENDATION A: Categorical Distribution (Bar Chart)
  const catColumns = columns.filter(
    (c) =>
      c.inferredType === 'string' &&
      c.uniqueCount >= 2 &&
      c.uniqueCount <= 30 &&
      !/(^id$|_id$|uuid|hash|url|key)/i.test(c.name)
  );

  if (catColumns.length > 0 && rows.length > 0) {
    const primaryCat = catColumns[0];
    const { categories, counts, isTruncated } = computeCategoryDistribution(
      rows,
      primaryCat.name,
      10
    );

    const barOptions: EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        ...BASE_CHART_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: BASE_GRID,
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          interval: 0,
          rotate: categories.some((c) => c.length > 8) ? 25 : 0,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Record Count',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: 'Count',
          type: 'bar',
          barWidth: '45%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#6366f1' },
                { offset: 1, color: '#4338ca' },
              ],
            },
            borderRadius: [6, 6, 0, 0],
          },
          data: counts,
        },
      ],
    };

    charts.push({
      id: `chart_cat_${primaryCat.name}`,
      title: `${primaryCat.name} Distribution`,
      chartType: 'bar',
      primaryColumn: primaryCat.name,
      reason: `Low-cardinality categorical column (${primaryCat.uniqueCount} unique categories)`,
      description: `Frequency distribution across top ${primaryCat.name} categories.`,
      options: barOptions,
      categoryLimitApplied: isTruncated,
    });
  }

  // 2. RECOMMENDATION B: Numeric Histogram / Distribution
  const numericColumns = columns.filter(
    (c) => (c.inferredType === 'integer' || c.inferredType === 'float') && c.uniqueCount >= 2
  );

  if (numericColumns.length > 0 && rows.length > 0) {
    const primaryNum = numericColumns[0];
    const { binLabels, binCounts } = computeNumericHistogram(rows, primaryNum.name, 6);

    if (binLabels.length > 0) {
      const histOptions: EChartsOption = {
        backgroundColor: 'transparent',
        tooltip: {
          ...BASE_CHART_TOOLTIP,
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
        },
        grid: BASE_GRID,
        xAxis: {
          type: 'category',
          data: binLabels,
          axisLine: { lineStyle: { color: '#334155' } },
          axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 15 },
        },
        yAxis: {
          type: 'value',
          name: 'Frequency',
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
          axisLabel: { color: '#94a3b8', fontSize: 11 },
        },
        series: [
          {
            name: `${primaryNum.name} Bins`,
            type: 'bar',
            barWidth: '55%',
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#10b981' },
                  { offset: 1, color: '#047857' },
                ],
              },
              borderRadius: [6, 6, 0, 0],
            },
            data: binCounts,
          },
        ],
      };

      charts.push({
        id: `chart_hist_${primaryNum.name}`,
        title: `${primaryNum.name} Value Distribution`,
        chartType: 'histogram',
        primaryColumn: primaryNum.name,
        reason: `Continuous numeric column with ${primaryNum.uniqueCount} distinct values`,
        description: `Binned frequency histogram showing concentration of ${primaryNum.name}.`,
        options: histOptions,
      });
    }
  }

  // 3. RECOMMENDATION C: Temporal Trend (Time-Series Line Chart)
  const dateCol = columns.find((c) => c.inferredType === 'date' || c.inferredType === 'datetime');
  const measureCol = numericColumns.find((c) => c.name !== dateCol?.name);

  if (dateCol && rows.length > 0) {
    const { dates, values } = computeTimeSeriesPoints(rows, dateCol.name, measureCol?.name);

    if (dates.length >= 2) {
      const lineOptions: EChartsOption = {
        backgroundColor: 'transparent',
        tooltip: {
          ...BASE_CHART_TOOLTIP,
          trigger: 'axis',
        },
        grid: BASE_GRID,
        xAxis: {
          type: 'category',
          data: dates,
          axisLine: { lineStyle: { color: '#334155' } },
          axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 20 },
        },
        yAxis: {
          type: 'value',
          name: measureCol ? `Sum of ${measureCol.name}` : 'Record Volume',
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
          axisLabel: { color: '#94a3b8', fontSize: 11 },
        },
        series: [
          {
            name: measureCol ? measureCol.name : 'Volume',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: { color: '#06b6d4' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(6, 182, 212, 0.35)' },
                  { offset: 1, color: 'rgba(6, 182, 212, 0.0)' },
                ],
              },
            },
            data: values,
          },
        ],
      };

      charts.push({
        id: `chart_temporal_${dateCol.name}`,
        title: measureCol ? `${measureCol.name} Over Time` : `Volume Over Time`,
        chartType: 'area',
        primaryColumn: dateCol.name,
        secondaryColumn: measureCol?.name,
        reason: `Temporal column "${dateCol.name}" detected with chronological observations`,
        description: `Chronological progression aggregated across ${dates.length} periods.`,
        options: lineOptions,
      });
    }
  }

  // 4. RECOMMENDATION D: Correlation / Scatter (Bi-variate numeric pairs)
  if (numericColumns.length >= 2 && rows.length >= 3) {
    const colX = numericColumns[0];
    const colY = numericColumns[1];
    const pairs = extractNumericPairs(rows, colX.name, colY.name, 50);

    if (pairs.length >= 3) {
      const scatterOptions: EChartsOption = {
        backgroundColor: 'transparent',
        tooltip: {
          ...BASE_CHART_TOOLTIP,
          formatter: (params: unknown) => {
            const p = params as { data: [number, number] };
            return `<div class="font-medium">${colX.name}: <span class="text-white">${p.data[0]}</span><br/>${colY.name}: <span class="text-white">${p.data[1]}</span></div>`;
          },
        },
        grid: BASE_GRID,
        xAxis: {
          type: 'value',
          name: colX.name,
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
          axisLabel: { color: '#94a3b8', fontSize: 10 },
        },
        yAxis: {
          type: 'value',
          name: colY.name,
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
          axisLabel: { color: '#94a3b8', fontSize: 10 },
        },
        series: [
          {
            name: `${colX.name} vs ${colY.name}`,
            type: 'scatter',
            symbolSize: 10,
            itemStyle: {
              color: '#f59e0b',
              shadowBlur: 8,
              shadowColor: 'rgba(245, 158, 11, 0.4)',
            },
            data: pairs,
          },
        ],
      };

      charts.push({
        id: `chart_scatter_${colX.name}_${colY.name}`,
        title: `${colX.name} vs ${colY.name}`,
        chartType: 'scatter',
        primaryColumn: colX.name,
        secondaryColumn: colY.name,
        reason: `Pair of continuous numeric columns (${colX.name} and ${colY.name})`,
        description: `Bivariate scatter plot analyzing relationship between ${colX.name} and ${colY.name}.`,
        options: scatterOptions,
      });
    }
  }

  // 5. Fallback if fewer than 2 charts: Schema Breakdown Doughnut Chart
  if (charts.length < 2) {
    const typeCounts: Record<string, number> = {};
    columns.forEach((c) => {
      typeCounts[c.inferredType] = (typeCounts[c.inferredType] || 0) + 1;
    });

    const pieData = Object.entries(typeCounts).map(([type, count]) => ({
      name: type.toUpperCase(),
      value: count,
    }));

    const pieOptions: EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: BASE_CHART_TOOLTIP,
      legend: {
        bottom: '0%',
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: 'Column Schema Types',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#0f172a',
            borderWidth: 2,
          },
          label: { show: false },
          color: THEME_PALETTE,
          data: pieData,
        },
      ],
    };

    charts.push({
      id: 'chart_schema_types',
      title: 'Inferred Schema Types',
      chartType: 'pie',
      primaryColumn: 'schema',
      reason: 'Overview composition of inferred data types across all columns',
      description: 'Distribution of column data types detected in this dataset.',
      options: pieOptions,
    });
  }

  return charts.slice(0, 4); // Limit to top 4 most informative charts
}
