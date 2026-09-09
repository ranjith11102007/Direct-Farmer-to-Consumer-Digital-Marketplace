import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { CategoryNav } from '@/components/layout/category-nav';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { HeroSection } from '@/components/marketplace/hero-section';
import { TrustIndicators } from '@/components/marketplace/trust-indicators';
import { CategoryShowcase } from '@/components/marketplace/category-showcase';
import { NearbyProducts } from '@/components/marketplace/nearby-products';
import { SeasonalProducts } from '@/components/marketplace/seasonal-products';
import { HowItWorks } from '@/components/marketplace/how-it-works';
import { FarmerBenefits } from '@/components/marketplace/farmer-benefits';
import { BulkBuyerSection } from '@/components/marketplace/bulk-buyer-section';
import { AIInsights } from '@/components/marketplace/ai-insights';
import { LogisticsSection } from '@/components/marketplace/logistics-section';
import { Testimonials } from '@/components/marketplace/testimonials';

export default function HomePage() {
  return (
    <>
      <PromoStrip />
      <Header />
      <CategoryNav />
      <main>
        <HeroSection />
        <TrustIndicators />
        <CategoryShowcase />
        <NearbyProducts />
        <SeasonalProducts />
        <HowItWorks />
        <FarmerBenefits />
        <BulkBuyerSection />
        <AIInsights />
        <LogisticsSection />
        <Testimonials />
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}