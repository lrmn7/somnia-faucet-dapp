import FaqSection from '@/components/FaqSection';
import HeroSection from '@/components/HeroSection';

export default function HomePage() {
  return (
    <div className="space-y-24">
      <HeroSection />
      <FaqSection />
    </div>
  );
}