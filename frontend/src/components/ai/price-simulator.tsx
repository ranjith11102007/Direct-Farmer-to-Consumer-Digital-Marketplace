'use client';

import { useState } from 'react';
import { BadgeIndianRupee, TrendingUp } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { t } from '@/i18n';
import { useUIStore } from '@/store';

export interface PriceSimulatorProps {
  productName?: string;
  farmGate?: number;
  mandiPrice?: number;
  retailPrice?: number;
}

interface ChannelData {
  channel: string;
  price: number;
  farmerShare: number;
  delay: number;
}

export function PriceSimulator({
  productName = 'Tomato',
  farmGate = 18,
  mandiPrice = 26,
  retailPrice = 40,
}: PriceSimulatorProps) {
  const language = useUIStore((state) => state.language);
  const [basePrice, setBasePrice] = useState(farmGate);

  const channels: ChannelData[] = [
    { channel: t('nav.marketplace', language), price: basePrice, farmerShare: 0.92, delay: 1 },
    { channel: 'Local Mandi', price: mandiPrice, farmerShare: 0.45, delay: 9 },
    { channel: 'Wholesale Market', price: Math.round(mandiPrice * 1.15), farmerShare: 0.38, delay: 14 },
    { channel: 'Retail Store', price: retailPrice, farmerShare: 0.3, delay: 21 },
  ];

  const maxPrice = Math.max(...channels.map((c) => c.price));

  return (
    <div className="rounded-xl border border-charcoal-200/70 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-700 text-white">
            <BadgeIndianRupee className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-charcoal-800">{productName}</h3>
            <p className="text-xs text-charcoal-500">{t('forecaster', 'en') === 'forecaster' ? 'Comparative pricing' : 'Comparative pricing'}</p>
          </div>
        </div>
        <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-semibold text-primary-700">
          {t('products.livePrice', language)}
        </span>
      </div>

      <div className="mb-4">
        <label className="mb-1 flex items-center justify-between text-xs font-medium text-charcoal-600">
          <span>{t('priceFarmGate', 'en') === 'priceFarmGate' ? 'Farm gate price' : 'Farm gate price'}</span>
          <span className="font-bold text-primary-700">{formatCurrency(basePrice)}/kg</span>
        </label>
        <input
          type="range"
          min={8}
          max={120}
          value={basePrice}
          onChange={(e) => setBasePrice(Number(e.target.value))}
          className="w-full accent-primary-600"
          aria-label="Farm gate price"
        />
      </div>

      <div className="space-y-2.5">
        {channels.map((channel) => {
          const sharePct = Math.round(channel.farmerShare * 100);
          const barWidth = Math.max(6, (channel.price / maxPrice) * 100);
          const isVaikkal = channel.channel === t('nav.marketplace', language);

          return (
            <div key={channel.channel} className="rounded-lg border border-charcoal-100 p-3">
              <div className="flex items-center justify-between">
                <p className={cn('text-xs font-semibold', isVaikkal ? 'text-primary-700' : 'text-charcoal-700')}>
                  {channel.channel}
                  {isVaikkal && <span className="ml-1.5 rounded-full bg-primary-100 px-1.5 py-0.5 text-[9px] font-bold text-primary-700">✓</span>}
                </p>
                <p className={cn('text-sm font-bold', isVaikkal ? 'text-primary-700' : 'text-charcoal-700')}>
                  {formatCurrency(channel.price)}/kg
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-charcoal-100">
                  <div
                    className={cn('h-full rounded-full transition-all duration-300', isVaikkal ? 'bg-gradient-to-r from-primary-500 to-primary-700' : 'bg-charcoal-300')}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="shrink-0 text-[10px] font-medium text-charcoal-500">₹{channel.price}</span>
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-charcoal-400">
                <span>{t('farmerShare', 'en') === 'farmerShare' ? 'Farmer share' : 'Farmer share'}: <b className={cn(isVaikkal && 'text-primary-600')}>{sharePct}%</b></span>
                <span>{t('delay', 'en') === 'delay' ? 'Payout delay' : 'Payout delay'}: {channel.delay} {channel.delay === 1 ? 'day' : 'days'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary-50 p-3">
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
        <p className="text-xs text-primary-800">
          {t('honestyNote', 'en') === 'honestyNote' ? 'With Vaikkal, farmers keep up to 92% of the consumer price and get paid within a day.' : 'With Vaikkal, farmers keep up to 92% of the consumer price and get paid within a day.'}
        </p>
      </div>
    </div>
  );
}