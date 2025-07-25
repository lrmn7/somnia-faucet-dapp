import FaqSection from '@/components/FaqSection';
import HeroSection from '@/components/HeroSection';
import { MarqueeECO } from '@/components/marqueeEco';
export default function HomePage() {
  return (
    <div className="space-y-24">
      <HeroSection />
      <MarqueeECO />
      <FaqSection />
    </div>
  );
}