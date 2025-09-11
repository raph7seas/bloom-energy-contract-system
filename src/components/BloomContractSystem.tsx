import React, { useState } from 'react';
import { MainLayout } from './layout';
import { ContractTabs } from './contract';
import { useContract } from '../hooks';
import SimpleCostCalculator from './SimpleCostCalculator';
import Dashboard from './Dashboard';
import { ContractLibrary } from './library/ContractLibrary';

/**
 * Main Bloom Energy Contract Learning & Rules Management System
 * Restructured from monolithic component into modular architecture
 */

export const BloomContractSystem: React.FC = () => {
  // Application state
  const [activeView, setActiveView] = useState('dashboard');

  // Contract management hook
  const {
    formData,
    validationErrors,
    tabValidation,
    activeTab,
    isGenerating,
    isDirty,
    updateFormData,
    updateField,
    setActiveTab,
    generateContract,
    resetForm,
    isFormValid,
    canGenerate
  } = useContract();

  // Handle view changes from navigation
  const handleViewChange = (view: string) => {
    setActiveView(view);
    
    // If switching to create view, reset to first tab
    if (view === 'create') {
      setActiveTab('create');
    }
  };

  // Handle contract generation
  const handleGenerateContract = async () => {
    try {
      const contract = await generateContract();
      
      if (contract) {
        // Show success message
        console.log('Contract generated successfully:', contract);
        
        // Switch to library view to show the new contract
        setActiveView('library');
        
        // Reset form
        resetForm();
      } else {
        console.error('Failed to generate contract');
      }
    } catch (error) {
      console.error('Error generating contract:', error);
    }
  };

  // Render current view content
  const renderViewContent = () => {
    const fullWidthWrapper = (content: React.ReactNode) => (
      <div className="absolute inset-y-0 right-0 overflow-y-auto" style={{ left: '288px' }}>
        {content}
      </div>
    );

    switch (activeView) {
      case 'dashboard':
        return fullWidthWrapper(
          <Dashboard onNavigate={handleViewChange} />
        );

      case 'create':
        return fullWidthWrapper(
          <ContractTabs
            formData={formData}
            validationErrors={validationErrors}
            tabValidation={tabValidation}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onFieldChange={updateField}
            onGenerate={handleGenerateContract}
            isGenerating={isGenerating}
            canGenerate={canGenerate}
          />
        );

      case 'library':
        return fullWidthWrapper(
          <ContractLibrary onNavigate={handleViewChange} />
        );

      case 'compare':
        return fullWidthWrapper(
          <div className="absolute inset-0 p-6">
            <div className="w-full space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Contract Comparison</h1>
                <p className="text-gray-600 mt-1">
                  Side-by-side contract comparison functionality
                </p>
              </div>
              <div className="text-center py-12">
                <p className="text-gray-600">
                  Implementation will be added in the next phase.
                </p>
              </div>
            </div>
          </div>
        );

      case 'ai-assistant':
        return fullWidthWrapper(
          <div className="absolute inset-0 p-6">
            <div className="w-full space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">AI Assistant & Cost Calculator</h1>
                <p className="text-gray-600 mt-1">
                  Compare AI model costs, analyze efficiency, and get recommendations for the best model for your contract needs.
                </p>
              </div>
              <SimpleCostCalculator />
            </div>
          </div>
        );

      case 'analytics':
        return fullWidthWrapper(
          <div className="absolute inset-0 p-6">
            <div className="w-full space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-1">
                  Performance metrics and contract insights
                </p>
              </div>
              <div className="text-center py-12">
                <p className="text-gray-600">
                  Implementation will be added in the next phase.
                </p>
              </div>
            </div>
          </div>
        );

      case 'documents':
        return fullWidthWrapper(
          <div className="absolute inset-0 p-6">
            <div className="w-full space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Document Upload</h1>
                <p className="text-gray-600 mt-1">
                  Document upload and processing with AWS Textract
                </p>
              </div>
              <div className="text-center py-12">
                <p className="text-gray-600">
                  Implementation will be added in the next phase.
                </p>
              </div>
            </div>
          </div>
        );

      case 'templates':
        return fullWidthWrapper(
          <div className="absolute inset-0 p-6">
            <div className="w-full space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Template Management</h1>
                <p className="text-gray-600 mt-1">
                  Manage contract templates and reusable configurations
                </p>
              </div>
              <div className="text-center py-12">
                <p className="text-gray-600">
                  Implementation will be added in the next phase.
                </p>
              </div>
            </div>
          </div>
        );

      case 'rules':
        return fullWidthWrapper(
          <div className="absolute inset-0 p-6">
            <div className="w-full space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Rules Engine</h1>
                <p className="text-gray-600 mt-1">
                  Extracted rules and pattern recognition results
                </p>
              </div>
              <div className="text-center py-12">
                <p className="text-gray-600">
                  Implementation will be added in the next phase.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return fullWidthWrapper(
          <div className="absolute inset-0 p-6">
            <div className="w-full space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">View Not Found</h1>
                <p className="text-gray-600 mt-1">
                  The requested view is not available
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <MainLayout 
      activeView={activeView}
      onViewChange={handleViewChange}
    >
      {renderViewContent()}
    </MainLayout>
  );
};

export default BloomContractSystem;