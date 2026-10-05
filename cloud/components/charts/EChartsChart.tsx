'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { cn } from '@/lib/utils';

export interface EChartsChartProps {
  options: echarts.EChartsOption;
  height?: string | number;
  width?: string | number;
  className?: string;
  theme?: 'dark' | 'light';
  loading?: boolean;
}

export function EChartsChart({
  options,
  height = '350px',
  width = '100%',
  className,
  theme = 'dark',
  loading = false,
}: EChartsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, theme, {
        renderer: 'canvas',
      });
    }

    // Set chart options
    chartInstance.current.setOption(options, true);

    if (loading) {
      chartInstance.current.showLoading({
        text: 'Analyzing data...',
        color: '#6366f1',
        textColor: '#94a3b8',
        maskColor: 'rgba(15, 23, 42, 0.6)',
      });
    } else {
      chartInstance.current.hideLoading();
    }

    // Handle responsive resizing
    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });

    resizeObserver.observe(chartRef.current);

    const handleWindowResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver.disconnect();
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [options, theme, loading]);

  return (
    <div
      ref={chartRef}
      className={cn('w-full relative min-h-[250px]', className)}
      style={{ height, width }}
    />
  );
}
