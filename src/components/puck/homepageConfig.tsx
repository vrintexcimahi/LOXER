import type { Config } from '@measured/puck';
import { CtaBanner, FeatureGrid, HeroSection } from './HomepageBlocks';
import { CtaBannerProps, FeatureGridProps, HeroSectionProps } from './homepageData';

export const homepageConfig: Config = {
  components: {
    HeroSection: {
      fields: {
        badge: { type: 'text' },
        title: { type: 'text' },
        subtitle: { type: 'textarea' },
        primaryButtonText: { type: 'text' },
        primaryButtonHref: { type: 'text' },
        secondaryButtonText: { type: 'text' },
        secondaryButtonHref: { type: 'text' },
        backgroundColor: { type: 'text' },
      },
      render: (props) => <HeroSection {...(props as unknown as HeroSectionProps)} />,
    },
    FeatureGrid: {
      fields: {
        sectionTitle: { type: 'text' },
        sectionSubtitle: { type: 'textarea' },
        cardOneTitle: { type: 'text' },
        cardOneDescription: { type: 'textarea' },
        cardTwoTitle: { type: 'text' },
        cardTwoDescription: { type: 'textarea' },
        cardThreeTitle: { type: 'text' },
        cardThreeDescription: { type: 'textarea' },
      },
      render: (props) => <FeatureGrid {...(props as unknown as FeatureGridProps)} />,
    },
    CtaBanner: {
      fields: {
        title: { type: 'text' },
        subtitle: { type: 'textarea' },
        primaryButtonText: { type: 'text' },
        primaryButtonHref: { type: 'text' },
        secondaryButtonText: { type: 'text' },
        secondaryButtonHref: { type: 'text' },
        backgroundColor: { type: 'text' },
      },
      render: (props) => <CtaBanner {...(props as unknown as CtaBannerProps)} />,
    },
  },
};
