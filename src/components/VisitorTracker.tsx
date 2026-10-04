import { useEffect } from 'react';
import { VisitorTrackerService } from '../lib/visitorTracking';

export default function VisitorTracker() {
  useEffect(() => {
    VisitorTrackerService.init();
  }, []);

  return null; // Invisible analytics agent
}
