import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { BloomContractSystem } from './components/BloomContractSystem';
import { ProcessingToast } from './components/ui/ProcessingToast';

export function App() {
  const { isAuthenticated, loading } = useAuth();

  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 animate-pulse">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white">
              <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Bloom Energy
          </h2>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Show main application if authenticated
  return (
    <>
      <BloomContractSystem />
      <ProcessingToast />
    </>
  );
}