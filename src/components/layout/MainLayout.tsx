import React from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';

interface MainLayoutProps {
  activeView: string;
  onViewChange: (view: string) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  activeView,
  onViewChange,
  children
}) => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Main Content Area - Full Height */}
      <div className="flex h-screen">
        {/* Sidebar Navigation */}
        <Navigation activeView={activeView} onViewChange={onViewChange} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-hidden" style={{ backgroundColor: '#f5f5f5' }}>
          <div className="h-full overflow-y-auto flex justify-center">
            <div className="w-full max-w-7xl px-6 py-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};