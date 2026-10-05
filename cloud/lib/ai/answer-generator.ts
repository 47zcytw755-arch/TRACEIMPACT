import { DatasetAIContext, StructuredQueryIntent, QueryExecutionResult, ChartVisualizationSuggestion } from './ai-types';
import type { EChartsOption } from 'echarts';

/**
 * Generates an evidence-grounded natural language explanation strictly from the returned query rows.
 * Prevents hallucinations by deriving all numbers, rankings, and totals directly from execution output.
 */
export function generateEvidenceGroundedAnswer(
  question: string,
  intent: StructuredQueryIntent,
  result: QueryExecutionResult,
  context: DatasetAIContext
): { answer: string; visualization?: ChartVisualizationSuggestion } {
  const rows = result.rows;

  if (rows.length === 0) {
    return {
      answer: `No records in dataset "${context.name}" matched your query criteria.`,
    };
  }

  // 1. Single Value Aggregation (e.g. Count, Sum, Avg, Min, Max)
  if (rows.length === 1 && result.columns.length === 1) {
    const colName = result.columns[0];
    const rawVal = rows[0][colName];
    const formattedVal = typeof rawVal === 'number' ? rawVal.toLocaleString() : String(rawVal ?? '0');

    let opLabel = 'value';
    if (colName.startsWith('avg_')) opLabel = 'average';
    else if (colName.startsWith('total_') || colName.startsWith('sum_')) opLabel = 'total';
    else if (colName.startsWith('max_')) opLabel = 'maximum';
    else if (colName.startsWith('min_')) opLabel = 'minimum';
    else if (colName.includes('count')) opLabel = 'count';

    const cleanField = colName.replace(/^(avg_|total_|sum_|max_|min_)/, '').replace(/_/g, ' ');

    const answer = `Based on ${result.rowCount} computed metric in "${context.name}", the ${opLabel} for ${cleanField} is **${formattedVal}**.`;

    const visualization: ChartVisualizationSuggestion = {
      type: 'kpi',
      title: `${opLabel.toUpperCase()} ${cleanField.toUpperCase()}`,
      kpiValue: formattedVal,
      kpiSubtitle: `Computed from ${context.rowCount.toLocaleString()} dataset records`,
    };

    return { answer, visualization };
  }

  // 2. Grouped Categorical Breakdown (e.g. Sales by Category)
  if (intent.dimensions.length === 1 && result.columns.length >= 2 && rows.length >= 2) {
    const dimCol = intent.dimensions[0];
    const measureCol = result.columns.find((c) => c !== dimCol) || result.columns[1];

    const topItem = rows[0];
    const topDimVal = String(topItem[dimCol] ?? 'N/A');
    const topMeasureVal = typeof topItem[measureCol] === 'number' ? topItem[measureCol].toLocaleString() : String(topItem[measureCol]);

    const summaryParts = rows.slice(0, 5).map((r) => {
      const dim = r[dimCol];
      const val = typeof r[measureCol] === 'number' ? Number(r[measureCol]).toLocaleString() : r[measureCol];
      return `**${dim}** (${val})`;
    });

    const answer = `Analysis across ${rows.length} groups shows **${topDimVal}** has the highest value with **${topMeasureVal}**.\n\nSummary breakdown: ${summaryParts.join(', ')}.`;

    const categories = rows.map((r) => String(r[dimCol] ?? ''));
    const values = rows.map((r) => Number(r[measureCol] ?? 0));

    const barOptions: EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc' },
      },
      grid: { top: '15%', left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 11, rotate: categories.some((c) => c.length > 8) ? 20 : 0 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: measureCol,
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
            borderRadius: [4, 4, 0, 0],
          },
          data: values,
        },
      ],
    };

    const visualization: ChartVisualizationSuggestion = {
      type: 'bar',
      title: `${measureCol.replace(/_/g, ' ')} by ${dimCol.replace(/_/g, ' ')}`,
      options: barOptions,
    };

    return { answer, visualization };
  }

  // 3. Tabular Projection / Generic Multi-Row Response
  const answer = `Returned **${result.rowCount}** matching records from dataset "${context.name}" across columns: ${result.columns.map((c) => `\`${c}\``).join(', ')}.`;

  const visualization: ChartVisualizationSuggestion = {
    type: 'table',
    title: `Query Results (${result.rowCount} rows)`,
  };

  return { answer, visualization };
}
