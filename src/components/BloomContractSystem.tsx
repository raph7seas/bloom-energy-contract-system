import React, { useState, useEffect } from 'react';
import { MainLayout } from './layout';
import { ContractTabs } from './contract';
import { CreateFromDocumentsTab } from './contract/CreateFromDocumentsTab';
import { useContract } from '../hooks';
import { ContractFormData } from '../types';
import SimpleCostCalculator from './SimpleCostCalculator';
import Dashboard from './Dashboard';
import { ContractLibrary } from './library/ContractLibrary';
import { ContractDetailsView } from './library/ContractDetailsView';
import { DocumentView } from './documents/DocumentView';
import { BusinessRulesDisplay } from './rules/BusinessRulesDisplay';
import { Contract } from '../types';

/**
 * Main Bloom Energy Contract Learning & Rules Management System
 * Restructured from monolithic component into modular architecture
 */

interface BloomContractSystemProps {
  initialFormData?: Partial<ContractFormData>;
  aiExtracted?: boolean;
  sourceDocument?: {
    id: string;
    name: string;
    confidence?: number;
  };
}

export const BloomContractSystem: React.FC<BloomContractSystemProps> = ({
  initialFormData,
  aiExtracted = false,
  sourceDocument
}) => {
  // Application state
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [creationMode, setCreationMode] = useState<'documents' | 'manual' | null>(null);
  const [aiExtractionInfo, setAiExtractionInfo] = useState<{
    isAiExtracted: boolean;
    sourceDocument?: { id: string; name: string; confidence?: number };
  }>({ isAiExtracted: aiExtracted, sourceDocument });

  // Contract management hook with initial data
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
  } = useContract(initialFormData);

  // Handle view changes from navigation
  const handleViewChange = (view: string, options?: {
    aiExtractedData?: Partial<ContractFormData>;
    sourceDocument?: { id: string; name: string; confidence?: number };
    contract?: Contract;
  }) => {
    setActiveView(view);
    
    // If switching to contract details view
    if (view === 'contract-details' && options?.contract) {
      setSelectedContract(options.contract);
    } else if (view === 'create' && options?.aiExtractedData) {
      // If switching to create view with AI data
      updateFormData(options.aiExtractedData);
      setAiExtractionInfo({
        isAiExtracted: true,
        sourceDocument: options.sourceDocument
      });
      setActiveTab('basic'); // Skip create tab and go directly to basic
      setSelectedContract(null); // Clear selected contract
    } else if (view === 'create') {
      setActiveTab('create');
      // Reset AI extraction info for new manual contracts
      setAiExtractionInfo({ isAiExtracted: false });
      setSelectedContract(null); // Clear selected contract
    } else {
      // Clear selected contract when navigating away from details
      if (view !== 'contract-details') {
        setSelectedContract(null);
      }
    }
  };

  // Handle creation mode selection
  const handleCreateFromDocuments = () => {
    setCreationMode('documents');
    setActiveTab('create-from-documents');
  };

  const handleCreateManually = () => {
    setCreationMode('manual');
    setActiveTab('basic'); // Skip create tab and go to basic info
  };

  const handleCancelDocumentCreation = () => {
    setCreationMode(null);
    setActiveTab('create');
  };

  // Listen for navigation events from processing toast
  useEffect(() => {
    const handleNavigateToDocuments = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('📍 Navigate to documents event received:', customEvent.detail);

      // Switch to create view and documents mode to show results
      setActiveView('create');
      setCreationMode('documents');
      setActiveTab('create-from-documents');
    };

    window.addEventListener('navigate-to-documents', handleNavigateToDocuments);

    return () => {
      window.removeEventListener('navigate-to-documents', handleNavigateToDocuments);
    };
  }, []);

  // Handle AI extraction feedback
  const handleAiFeedback = async (fieldName: string, correctedValue: any, confidence: number) => {
    try {
      // Send feedback to AI learning system
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: aiExtractionInfo.sourceDocument?.id,
          fieldName,
          extractedValue: formData[fieldName as keyof ContractFormData],
          correctedValue,
          originalConfidence: confidence
        })
      });
      
      console.log('AI feedback submitted successfully');
    } catch (error) {
      console.error('Failed to submit AI feedback:', error);
      // Continue silently - don't block user workflow
    }
  };

  // Effect to handle initial AI-extracted data
  useEffect(() => {
    if (initialFormData && aiExtracted) {
      setActiveView('create');
      setActiveTab('basic');
    }
  }, [initialFormData, aiExtracted]);

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
        // If in document creation mode, show the document upload interface
        if (creationMode === 'documents') {
          return fullWidthWrapper(
            <div className="p-6">
              <CreateFromDocumentsTab
                onCreateContract={(formData, sourceDoc) => {
                  // Reset creation mode and switch to contract form with AI data
                  setCreationMode(null);
                  handleViewChange('create', {
                    aiExtractedData: formData,
                    sourceDocument: sourceDoc
                  });
                }}
                onCancel={handleCancelDocumentCreation}
              />
            </div>
          );
        }

        // Otherwise show the regular contract tabs
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
            aiExtractionInfo={aiExtractionInfo}
            onAiFeedback={handleAiFeedback}
            onCreateFromDocuments={handleCreateFromDocuments}
            onCreateManually={handleCreateManually}
          />
        );

      case 'library':
        return fullWidthWrapper(
          <ContractLibrary 
            onNavigate={handleViewChange}
            onCreateFromAi={(aiData, sourceDoc) => 
              handleViewChange('create', { 
                aiExtractedData: aiData, 
                sourceDocument: sourceDoc 
              })
            }
          />
        );

      case 'contract-details':
        return fullWidthWrapper(
          selectedContract ? (
            <ContractDetailsView
              contract={selectedContract}
              onNavigate={handleViewChange}
              onEditContract={(contract) => {
                // Convert contract to form data and navigate to edit mode
                const formData: Partial<ContractFormData> = {
                  customerName: contract.client,
                  siteLocation: contract.site,
                  orderDate: contract.uploadDate,
                  effectiveDate: contract.effectiveDate,
                  solutionType: contract.type,
                  ratedCapacity: contract.capacity,
                  contractTerm: contract.term,
                  baseRate: contract.parameters.financial.baseRate,
                  annualEscalation: contract.parameters.financial.escalation,
                  microgridAdder: contract.parameters.financial.microgridAdder,
                  thermalCycleFee: contract.parameters.financial.thermalCycleFee,
                  electricalBudget: contract.parameters.financial.electricalBudget,
                  commissioningAllowance: contract.parameters.financial.commissioningAllowance,
                  outputWarrantyPercent: contract.parameters.operating.outputWarranty,
                  efficiencyWarrantyPercent: contract.parameters.operating.efficiency,
                  minDemandKW: contract.parameters.operating.demandRange.min,
                  maxDemandKW: contract.parameters.operating.demandRange.max,
                  guaranteedCriticalOutput: contract.parameters.operating.criticalOutput,
                  gridParallelVoltage: contract.parameters.technical.voltage,
                  numberOfServers: contract.parameters.technical.servers,
                  selectedComponents: contract.parameters.technical.components,
                  includeRECs: !!contract.parameters.technical.recType,
                  recType: contract.parameters.technical.recType || 'CT-Class-I',
                  specialRequirements: contract.notes || ''
                };
                
                // Navigate to create mode with contract data
                handleViewChange('create', {
                  aiExtractedData: formData,
                  sourceDocument: contract.aiMetadata?.isAiExtracted ? {
                    id: contract.aiMetadata.sourceDocument.id,
                    name: contract.aiMetadata.sourceDocument.name,
                    confidence: contract.aiMetadata.overallConfidence
                  } : undefined
                });
              }}
            />
          ) : (
            <div className="absolute inset-0 p-6">
              <div className="w-full space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Contract Not Found</h1>
                  <p className="text-gray-600 mt-1">
                    The requested contract could not be found.
                  </p>
                </div>
              </div>
            </div>
          )
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
          <DocumentView
            contractId={formData.id || '7a714c17-7ed4-4b4b-9edb-10e9e2a620b6'}
            contractName={formData.customerName || 'PG&E Microgrid Contract'}
            onNavigate={handleViewChange}
            onCreateFromDocument={(aiData, sourceDoc) => 
              handleViewChange('create', { 
                aiExtractedData: aiData, 
                sourceDocument: sourceDoc 
              })
            }
          />
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
                  AI-powered business rules extraction and management
                </p>
              </div>
              <BusinessRulesDisplay />
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