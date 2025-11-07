declare module './contexts/AuthContext' {
  export interface AuthContextValue {
    token?: string | null;
    login?: (...args: any[]) => Promise<void>;
    logout?: () => void;
    isAuthenticated?: boolean;
    user?: any;
  }
  export function useAuth(): AuthContextValue;
}

declare module '../../contexts/AuthContext' {
  export interface AuthContextValue {
    token?: string | null;
    login?: (...args: any[]) => Promise<void>;
    logout?: () => void;
    isAuthenticated?: boolean;
    user?: any;
  }
  export function useAuth(): AuthContextValue;
}

declare module './components/auth/AuthPage' {
  import React from 'react';
  export const AuthPage: React.ComponentType;
}

declare module '../../components/BloomContractLearningSystem' {
  import React from 'react';
  const Component: React.ComponentType;
  export default Component;
}

declare module '../../services/aiToContractService' {
  export const aiToContractService: any;
}

declare module '../../services/aiFormMappingService' {
  export const AIFormMappingService: any;
  export type BusinessRulesAnalysis = any;
}

export {};
