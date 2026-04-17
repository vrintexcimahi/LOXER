import { CtaBanner, FeatureGrid, HeroSection } from './HomepageBlocks';
import { CtaBannerProps, FeatureGridProps, HeroSectionProps, HomepageData } from './homepageData';

export default function PublicHomepageRenderer({ data }: { data: HomepageData }) {
  return (
    <>
      {data.content.map((block, index) => {
        if (block.type === 'HeroSection') {
          return <HeroSection key={`hero-${index}`} {...(block.props as HeroSectionProps)} />;
        }

        if (block.type === 'FeatureGrid') {
          return <FeatureGrid key={`features-${index}`} {...(block.props as FeatureGridProps)} />;
        }

        if (block.type === 'CtaBanner') {
          return <CtaBanner key={`cta-${index}`} {...(block.props as CtaBannerProps)} />;
        }

        return null;
      })}
    </>
  );
}
