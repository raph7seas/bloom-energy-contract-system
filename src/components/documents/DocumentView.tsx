import React, { useState, useEffect } from 'react';
import { Plus, FileText, Settings, Upload as UploadIcon, FolderPlus } from 'lucide-react';
import { DocumentUploader } from './DocumentUploader';
import { DocumentGroupManager } from './DocumentGroupManager';
import { DocumentManager } from './DocumentManager';
import { ErrorBoundary } from '../ErrorBoundary';
import { aiToContractService } from '../../services/aiToContractService';
import { BusinessRulesAnalysis } from '../../types';
import { ContractFormData } from '../../types';

interface DocumentViewProps {
  contractId: string;
  contractName?: string;
  onNavigate?: (view: string) => void;
  onCreateFromDocument?: (aiData: Partial<ContractFormData>, sourceDoc: { id: string; name: string; confidence?: number }) => void;
}

type ViewMode = 'list' | 'upload' | 'groups' | 'settings';

export const DocumentView: React.FC<DocumentViewProps> = ({
  contractId,
  contractName,
  onNavigate,
  onCreateFromDocument
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    // Refresh the document list when upload completes
    setRefreshKey(prev => prev + 1);
    // Switch back to list view
    setViewMode('list');
  };

  // Handle AI analysis completion and contract creation
  const handleCreateContractFromAI = async (formData: Partial<ContractFormData>, sourceFile: any) => {
    try {
      // Convert file info to what we need
      const analysisResult: BusinessRulesAnalysis = sourceFile.aiAnalysis || {
        documentSummary: {
          contractType: 'Energy Service Agreement',
          parties: [formData.customerName || 'Unknown Customer', 'Bloom Energy'],
          effectiveDate: formData.effectiveDate || new Date().toISOString().split('T')[0],
          keyTerms: []
        },
        extractedRules: [],
        extractedData: {},
        riskFactors: [],
        anomalies: [],
        contractMetadata: {
          effectiveDate: formData.effectiveDate,
          term: formData.contractTerm ? `${formData.contractTerm} years` : '[TERM NOT EXTRACTED]',
          parties: [formData.customerName || '[CUSTOMER NOT EXTRACTED]', 'Bloom Energy']
        },
        extractionDate: new Date().toISOString(),
        overallConfidence: sourceFile.analysisConfidence || 0.8,
        summary: {
          totalRulesExtracted: 0,
          confidenceScore: sourceFile.analysisConfidence || 0.8,
          processingNotes: 'Created from AI analysis'
        }
      };

      // Create contract using our AI service
      const contract = await aiToContractService.createContractFromAIAnalysis(
        analysisResult,
        sourceFile.id,
        sourceFile.name,
        sourceFile.type
      );

      if (contract) {
        console.log('Contract created successfully from AI analysis:', contract);
        
        // Show success message and refresh the library
        alert(`Contract "${contract.client}" created successfully from document "${sourceFile.name}"`);
        
        // Navigate to library to show the new contract
        if (onCreateFromDocument) {
          onCreateFromDocument(formData, {
            id: sourceFile.id,
            name: sourceFile.name,
            confidence: sourceFile.analysisConfidence
          });
        }
        
        // Refresh documents list to potentially update UI
        setRefreshKey(prev => prev + 1);
      } else {
        console.warn('Failed to create contract - insufficient data extracted');
        alert('Unable to create contract: Insufficient data was extracted from the document. Please try uploading a more complete contract document.');
      }
    } catch (error) {
      console.error('Error creating contract from AI analysis:', error);
      alert('Failed to create contract from document analysis. Please try again.');
    }
  };

  // Handle AI analysis completion - automatically create contract
  const handleAIAnalysisComplete = async (analysis: BusinessRulesAnalysis, mappedFormData: Partial<ContractFormData>) => {
    try {
      console.log('🤖 AI analysis completed, automatically creating contract...', analysis);
      console.log('📋 Mapped form data:', mappedFormData);

      // Create contract using our AI service
      const contract = await aiToContractService.createContractFromAIAnalysis(
        analysis,
        `doc-${Date.now()}`, // Generate document ID 
        `Uploaded Document ${new Date().toLocaleDateString()}`, // Document name
        'application/pdf' // Default file type
      );

      if (contract) {
        console.log('✅ Contract created automatically from AI analysis:', contract);
        
        // Show success notification
        alert(`✅ Contract "${contract.client}" was automatically created from your uploaded document!`);
        
        // Navigate to library to show the new contract
        if (onCreateFromDocument) {
          onCreateFromDocument(mappedFormData, {
            id: `doc-${Date.now()}`,
            name: `Uploaded Document ${new Date().toLocaleDateString()}`,
            confidence: analysis.overallConfidence
          });
        }
        
        // Refresh documents view
        setRefreshKey(prev => prev + 1);
      } else {
        console.warn('⚠️ Could not auto-create contract - insufficient data extracted');
        // Still show the Create Contract button for manual creation
      }
    } catch (error) {
      console.error('❌ Error auto-creating contract from AI analysis:', error);
      // Fail silently - user can still manually create contract
    }
  };

  const renderHeader = () => (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Contract Documents
            </h1>
            {contractName && (
              <p className="mt-1 text-sm text-gray-600">
                Contract: {contractName}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode(viewMode === 'upload' ? 'list' : 'upload')}
              className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                viewMode === 'upload'
                  ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  : 'border-transparent text-white bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {viewMode === 'upload' ? (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  View Documents
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Documents
                </>
              )}
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'settings' ? 'list' : 'settings')}
              className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'settings'
                  ? 'text-blue-700 bg-blue-50 border-blue-300'
                  : 'text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setViewMode('list')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Documents
            </button>
            <button
              onClick={() => setViewMode('upload')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UploadIcon className="w-4 h-4 inline mr-1" />
              Upload
            </button>
            <button
              onClick={() => setViewMode('groups')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'groups'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FolderPlus className="w-4 h-4 inline mr-1" />
              Groups
            </button>
            <button
              onClick={() => setViewMode('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-1" />
              Settings
            </button>
          </nav>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'upload':
        return (
          <div className="max-w-4xl mx-auto py-8 px-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Upload New Documents
              </h2>
              <p className="text-sm text-gray-600">
                Upload contract documents including primary contracts, appendices, amendments, and supporting materials.
                Documents will be automatically processed for text extraction and analysis.
              </p>
            </div>
            
            <ErrorBoundary>
              <DocumentUploader
                contractId={contractId}
                onUploadComplete={handleUploadComplete}
                onCreateContractFromAI={handleCreateContractFromAI}
                onAIAnalysisComplete={handleAIAnalysisComplete}
                enableTextExtraction={true}
                enableAIAnalysis={true}
              />
            </ErrorBoundary>
          </div>
        );

      case 'groups':
        return (
          <div className="max-w-7xl mx-auto py-8 px-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Document Groups
              </h2>
              <p className="text-sm text-gray-600">
                Organize related documents together for better AI analysis and contract creation.
                Group multiple documents (primary contract, appendices, amendments) to get more accurate analysis results.
              </p>
            </div>
            
            <ErrorBoundary>
              <DocumentGroupManager
                contractId={contractId}
                onGroupComplete={(group) => {
                  console.log('Group completed:', group);
                  setRefreshKey(prev => prev + 1);
                }}
                onContractCreated={(contract, group) => {
                  console.log('Contract created from group:', contract, group);
                  if (onCreateFromDocument) {
                    onCreateFromDocument(group.mappedFormData || {}, {
                      id: group.id,
                      name: group.name,
                      confidence: group.totalConfidence
                    });
                  }
                  setRefreshKey(prev => prev + 1);
                }}
                onNavigate={onNavigate}
                enableAutoConversion={true}
                maxGroups={10}
              />
            </ErrorBoundary>
          </div>
        );

      case 'settings':
        return (
          <div className="max-w-4xl mx-auto py-8 px-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Document Processing Settings
                </h2>
              </div>
              
              <div className="px-6 py-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Upload Settings
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600">Max file size</label>
                        <span className="text-sm font-medium text-gray-900">100 MB</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600">Max files per contract</label>
                        <span className="text-sm font-medium text-gray-900">50 files</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600">Chunked upload threshold</label>
                        <span className="text-sm font-medium text-gray-900">10 MB</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Processing Settings
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600">Auto text extraction</label>
                        <span className="text-sm font-medium text-green-600">Enabled</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600">OCR provider</label>
                        <span className="text-sm font-medium text-gray-900">AWS Textract + Local</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600">Page analysis</label>
                        <span className="text-sm font-medium text-green-600">Enabled</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Supported File Types
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { type: 'PDF', desc: '.pdf files', icon: '📄' },
                      { type: 'Word', desc: '.doc, .docx files', icon: '📝' },
                      { type: 'Images', desc: '.jpg, .png, .gif', icon: '🖼️' },
                      { type: 'Text', desc: '.txt files', icon: '📃' }
                    ].map((format) => (
                      <div key={format.type} className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-2xl mb-1">{format.icon}</div>
                        <div className="text-sm font-medium text-gray-900">{format.type}</div>
                        <div className="text-xs text-gray-500">{format.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Document Types
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { type: 'Primary Contract', desc: 'Main contract document' },
                      { type: 'Appendix', desc: 'Additional terms and conditions' },
                      { type: 'Amendment', desc: 'Contract modifications' },
                      { type: 'Exhibit', desc: 'Supporting documentation' },
                      { type: 'Addendum', desc: 'Supplementary information' },
                      { type: 'Signature Page', desc: 'Executed signatures' }
                    ].map((docType) => (
                      <div key={docType.type} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{docType.type}</div>
                          <div className="text-xs text-gray-500">{docType.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'list':
      default:
        return (
          <div className="py-8 px-6">
            <ErrorBoundary>
          <DocumentManager
            key={refreshKey}
            contractId={contractId}
            onCreateFromDocument={onCreateFromDocument}
            enableSearch={true}
            enableFiltering={true}
          />
        </ErrorBoundary>
      </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderHeader()}
      {renderContent()}
    </div>
  );
};
