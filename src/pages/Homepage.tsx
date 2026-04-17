import { useEffect, useState } from 'react';
import Landing from './Landing';
import { supabase } from '../lib/supabase';
import PublicHomepageRenderer from '../components/puck/PublicHomepageRenderer';
import { HomepageData, isHomepageData } from '../components/puck/homepageData';

interface HomepageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const HOMEPAGE_SLUG = 'homepage';

export default function Homepage({ onLogin, onRegister }: HomepageProps) {
  const [pageData, setPageData] = useState<HomepageData | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHomepageData() {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('pages')
        .select('data')
        .eq('slug', HOMEPAGE_SLUG)
        .maybeSingle();

      if (!active) return;

      if (error) {
        if (error.code !== '42P01') {
          console.error('Failed to load homepage content:', error.message);
        }
        return;
      }

      if (isHomepageData(data?.data)) {
        setPageData(data.data);
      }
    }

    void loadHomepageData();

    return () => {
      active = false;
    };
  }, []);

  if (!pageData) {
    return <Landing onLogin={onLogin} onRegister={onRegister} />;
  }

  return <PublicHomepageRenderer data={pageData} />;
}
