import { createContext } from 'react';
import { DeviceInfo } from '../lib/deviceIntelligence';

export interface UserPreferences {
  theme: string;
  language: string;
  fontScale: number;
  sidebarState: string;
  density: string;
  preferredUIProfile?: string;
}

export interface DeviceContextValue {
  device: DeviceInfo;
  preferences: UserPreferences | null;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  refreshDevice: () => void;
  isRegistered: boolean;
}

export const DeviceContext = createContext<DeviceContextValue | null>(null);
