import { useContext } from 'react';
import { DeviceContext, DeviceContextValue } from './device-context';

export function useDevice(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  if (!ctx) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return ctx;
}
