'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { cn, formatCurrency } from '@/lib/utils';
import type { Forecast } from '@/types';

export interface DemandChartProps {
  forecasts?: Forecast[];
  height?: number;
}

interface ChartPoint {
  name: string;
  demand: number;
  supply: number;
  price: number;
}

export function DemandChart({ forecasts, height = 300 }: DemandChartProps) {
  const language = useUIStore((state) => state.language);
  const [mode, setMode] = useState<'demand' | 'price'>('demand');

  const data: ChartPoint[] = [
    { name: 'Apr', demand: 820, supply: 740, price: 35 },
    { name: 'May', demand: 960, supply: 810, price: 40 },
    { name: 'Jun', demand: 880, supply: 920, price: 33 },
    { name: 'Jul', demand: 1120, supply: 960, price: 45 },
    { name: 'Aug', demand: 1240, supply: 1010, price: 52 },
    { name: 'Sep', demand: 1380, supply: 1100, price: 58 },
    { name: 'Oct', demand: 1150, supply: 1040, price: 48 },
    { name: 'Nov', demand: 990, supply: 900, price: 42 },
  ];

  const activeKey = mode === 'demand' ? 'demand' : 'price';

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-charcoal-100 p-1">
          {(['demand', 'price'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                mode === m ? 'bg-white text-primary-700 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-700'
              )}
            >
              {m === 'demand' ? t('forecasts.demand', language) : t('forecasts.priceTrend', language)}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="supplyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={
              mode === 'price'
                ? (value: number) => `₹${value}`
                : (value: number) => `${value / 1000}k`
            }
          />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
            formatter={(value: number, name: string) => {
              if (name === 'price') return [`${formatCurrency(value)}`, t('forecasts.priceTrend', language)];
              if (name === 'supply') return [`${value}`, t('forecasts.supply', language) === 'forecasts.supply' ? 'Supply' : t('forecasts.supply', language)];
              return [`${value}`, t('forecasts.demand', language)];
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {mode === 'demand' ? (
            <>
              <Area type="monotone" dataKey="demand" stroke="#16a34a" strokeWidth={2} fill="url(#demandGradient)" />
              <Area type="monotone" dataKey="supply" stroke="#f97316" strokeWidth={2} fill="url(#supplyGradient)" />
            </>
          ) : (
            <Area type="monotone" dataKey="price" stroke="#8b5cf6" strokeWidth={2} fill="url(#priceGradient)" />
          )}
          <ReferenceLine y={1000} stroke="#16a34a" strokeDasharray="4 4" strokeOpacity={0.5} />
        </AreaChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs text-charcoal-400">
        {t('forecasts.explainableNote', language)}
      </p>
    </div>
  );
}