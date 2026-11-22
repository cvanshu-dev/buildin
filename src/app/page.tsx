import { SiteHeader } from "@/components/site-header";

import { HeroSection } from "@/components/sections/hero-section";
import { ExpertiseSection } from "@/components/sections/expertise-section";
import { ImpactSection } from "@/components/sections/impact-section";
import { SelectedWorkSection } from "@/components/sections/selected-work-section";
import { CreatorNetworkSection } from "@/components/sections/creator-network-section";
import { CTASection } from "@/components/sections/cta-section";
import { FooterSection } from "@/components/sections/footer-section";

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-slate-50 text-slate-900">
      <SiteHeader />

      <HeroSection />

      <ExpertiseSection />

      <ImpactSection />

      <SelectedWorkSection />

      <CreatorNetworkSection />

      <CTASection />

      <FooterSection />
    </main>
  );
}