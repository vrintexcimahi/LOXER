import { createContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { UserMeta, UserRole } from '../lib/types';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  userMeta: UserMeta | null;
  loading: boolean;
  configured: boolean;
  signUp: (email: string, password: string, role: UserRole, fullName: string, phone: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (options?: { role?: UserRole; fullName?: string; phone?: string; mode?: 'login' | 'register' }) => Promise<{ error: Error | null }>;
  requestOtp: (params: { channel: 'email' | 'sms'; email?: string; phone?: string }) => Promise<{ error: Error | null }>;
  verifyOtpCode: (params: { channel: 'email' | 'sms'; email?: string; phone?: string; token: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshMeta: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
