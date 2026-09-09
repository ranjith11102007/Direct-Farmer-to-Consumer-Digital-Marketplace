'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Leaf,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Mail,
  MapPin,
  Phone,
  Send,
} from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { toast } from 'sonner';

export function Footer() {
  const language = useUIStore((state) => state.language);
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    toast.success(t('footer.subscribed', language));
    setEmail('');
  };

  return (
    <footer className="border-t border-charcoal-100 bg-charcoal-950 text-charcoal-300">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
                <Leaf className="h-5 w-5" />
              </span>
              <span className="text-xl font-bold text-white">{t('app.name', language)}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-charcoal-400">
              {t('footer.trustedBlurb', language)}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-900/40 px-3 py-1.5 text-xs font-medium text-primary-300">
              <Leaf className="h-3.5 w-3.5" />
              {t('footer.madeForFarmers', language)}
            </p>
          </div>

          <FooterColumn title={t('footer.explore', language)}>
            <FooterLink href="/about">{t('footer.about', language)}</FooterLink>
            <FooterLink href="/how-it-works">{t('footer.howItWorks', language)}</FooterLink>
            <FooterLink href="/marketplace">{t('nav.marketplace', language)}</FooterLink>
            <FooterLink href="/producer/dashboard">{t('footer.forFarmers', language)}</FooterLink>
            <FooterLink href="/bulk">{t('footer.forBulkBuyers', language)}</FooterLink>
            <FooterLink href="/contact">{t('footer.contact', language)}</FooterLink>
          </FooterColumn>

          <FooterColumn title={t('footer.policies', language)}>
            <FooterLink href="/privacy">{t('footer.privacy', language)}</FooterLink>
            <FooterLink href="/terms">{t('footer.terms', language)}</FooterLink>
            <FooterLink href="/refund">{t('footer.refund', language)}</FooterLink>
            <FooterLink href="/cancellation">{t('footer.cancellation', language)}</FooterLink>
          </FooterColumn>

          <FooterColumn title={t('footer.support', language)}>
            <FooterLink href="/faq">{t('footer.faq', language)}</FooterLink>
            <FooterLink href="/help">{t('footer.helpCenter', language)}</FooterLink>
          </FooterColumn>

          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              {t('footer.newsletter', language)}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-charcoal-400">
              {t('footer.newsletterDesc', language)}
            </p>
            <form onSubmit={handleSubscribe} className="mt-3 flex overflow-hidden rounded-lg border border-charcoal-700 focus-within:border-primary-500">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.emailPlaceholder', language)}
                className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder:text-charcoal-500 focus:outline-none"
                aria-label={t('footer.emailPlaceholder', language)}
              />
              <button
                type="submit"
                className="flex shrink-0 items-center gap-1 bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                aria-label={t('footer.subscribe', language)}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

            <div className="mt-5 flex items-center gap-2">
              {[
                { icon: Facebook, label: 'Facebook' },
                { icon: Instagram, label: 'Instagram' },
                { icon: Twitter, label: 'Twitter' },
                { icon: Youtube, label: 'YouTube' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal-700 text-charcoal-400 transition-colors hover:border-primary-500 hover:text-primary-400"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 border-t border-charcoal-800 pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-charcoal-500">
            © {new Date().getFullYear()} Vaikkal. {t('footer.madeForFarmers', language)}.
          </p>
          <p className="text-xs font-medium text-primary-400">
            {t('footer.tamilNote', language)}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-charcoal-500">
            <Mail className="h-3.5 w-3.5" />
            support@vaikkal.in
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white">{title}</h3>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-charcoal-400 transition-colors hover:text-primary-400"
      >
        {children}
      </Link>
    </li>
  );
}