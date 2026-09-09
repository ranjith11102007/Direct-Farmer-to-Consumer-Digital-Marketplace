'use client';

import { useEffect, useState } from 'react';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';

interface Testimonial {
  name: string;
  roleKey: string;
  quote: string;
  avatar?: string;
  rating?: number;
  highlighted?: boolean;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Kasirajan M.',
    roleKey: 'farmer',
    quote: 'Before Vaikkal, the mandi middlemen took most of my profits on tomatoes. Now I set my own prices and receive payments directly every week.',
    rating: 5,
    highlighted: true,
  },
  {
    name: 'Revathi S.',
    roleKey: 'consumer',
    quote: 'Vegetables are visibly fresher than what I get at the store. The traceability feature is amazing — I can see exactly which farm my greens came from.',
    rating: 5,
  },
  {
    name: 'Muthuvel A.',
    roleKey: 'fpo',
    quote: 'We supply 40 member farmers through Vaikkal. The AI forecasts guide us on which crops to prioritize, and settlements have been perfectly on time.',
    rating: 5,
  },
  {
    name: 'Priya K.',
    roleKey: 'consumer',
    quote: 'Organic certification was the clincher for us. My family now eats vegetables I can actually trace. Delivery is always early and produce stays fresh.',
    rating: 5,
  },
  {
    name: 'Venkatesh R.',
    roleKey: 'bulkBuyer',
    quote: 'Managing 4 restaurants, my weekly supply is automated through Vaikkal. Quality is consistent and the bulk pricing beats my previous vendors by 15%.',
    rating: 5,
  },
];

export function Testimonials() {
  const language = useUIStore((state) => state.language);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const current = TESTIMONIALS[index];

  const goTo = (dir: 1 | -1) => {
    setIndex((i) => (i + dir + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  return (
    <section className="bg-charcoal-50/60 py-12" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8 text-center">
          <h2 id="testimonials-heading" className="text-2xl font-bold text-charcoal-800 sm:text-3xl">
            {t('testimonials.title', language)}
          </h2>
          <p className="mt-2 text-sm text-charcoal-500">{t('testimonials.subtitle', language)}</p>
        </div>

        <div className="relative rounded-2xl border border-charcoal-100 bg-white p-8 shadow-sm">
          <Quote className="absolute left-6 top-6 h-8 w-8 text-primary-100" />
          <div key={index} className="animate-fade-in">
            <div className="flex items-center gap-1">
              {Array.from({ length: current.rating ?? 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-accent-400 text-accent-400" />
              ))}
            </div>
            <p className="mt-4 text-base leading-relaxed text-charcoal-700 sm:text-lg">
              &ldquo;{current.quote}&rdquo;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">
                {current.name[0]}
              </span>
              <div>
                <p className="text-sm font-semibold text-charcoal-800">{current.name}</p>
                <p className="text-xs text-primary-600">{t(`auth.role${current.roleKey === 'consumer' ? 'Consumer' : current.roleKey === 'farmer' ? 'Farmer' : current.roleKey === 'fpo' ? 'Fpo' : current.roleKey === 'bulkBuyer' ? 'BulkBuyer' : ''}`, language)}</p>
              </div>
            </div>
          </div>

          <div className="absolute right-6 top-6 flex gap-2">
            <button
              onClick={() => goTo(-1)}
              className="rounded-full border border-charcoal-200 p-1.5 text-charcoal-500 transition-colors hover:border-primary-300 hover:text-primary-700"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goTo(1)}
              className="rounded-full border border-charcoal-200 p-1.5 text-charcoal-500 transition-colors hover:border-primary-300 hover:text-primary-700"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 flex justify-center gap-1.5">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-5 bg-primary-600' : 'w-1.5 bg-charcoal-200 hover:bg-charcoal-300'
                )}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}