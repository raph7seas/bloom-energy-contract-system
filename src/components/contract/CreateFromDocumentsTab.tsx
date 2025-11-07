import React, { useState } from 'react';
import { FileText, X, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { DocumentUploader } from '../documents/DocumentUploader';
import { DocumentManager } from '../documents/DocumentManager';
import { ErrorBoundary } from '../ErrorBoundary';
import { ContractFormData } from '../../types';

interface CreateFromDocumentsTabProps {
  onCreateContract: (formData: Partial<ContractFormData>, sourceDoc: { id: string; name: string; confidence?: number }) => void;
  onCancel: () => void;
}

export const CreateFromDocumentsTab: React.FC<CreateFromDocumentsTabProps> = ({
  onCreateContract,
  onCancel
}) => {
  // Generate or restore a contract ID for this upload session
  const [contractId, setContractId] = useState(() => {
    // Try to restore from sessionStorage first
    const stored = sessionStorage.getItem('current_document_upload_contract_id');
    if (stored) {
      console.log('📦 Restored contractId from sessionStorage:', stored);
      return stored;
    }
    // Otherwise generate new one
    const newId = `temp-contract-${Date.now()}`;
    sessionStorage.setItem('current_document_upload_contract_id', newId);
    console.log('🆕 Generated new contractId:', newId);
    return newId;
  });
  const [showHelp, setShowHelp] = useState(false);
  const [aiProvider, setAiProvider] = useState<'bedrock' | 'anthropic'>('bedrock');

  // Counter to trigger DocumentManager refresh without remounting
  const [uploadTrigger, setUploadTrigger] = useState(0);

  const handleNewSession = () => {
    // Generate new contract ID
    const newId = `temp-contract-${Date.now()}`;
    setContractId(newId);

    // Clear old session data
    sessionStorage.removeItem('current_document_upload_contract_id');
    sessionStorage.removeItem(`analysis_results_${contractId}`);

    // Store new contract ID
    sessionStorage.setItem('current_document_upload_contract_id', newId);

    // Refresh DocumentManager via ref (no remount needed)
    console.log('🔄 Started new session:', newId);
    // Note: contractId change will trigger useEffect in DocumentManager to refetch
  };

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Create from Documents</h2>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="How it works"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* AI Provider Toggle */}
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-xs font-medium text-gray-600">AI Provider:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  console.log('🔄 Switching AI provider to: bedrock');
                  setAiProvider('bedrock');
                }}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  aiProvider === 'bedrock'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                title="AWS Bedrock (Haiku - Fast, Good for tables)"
              >
                Bedrock
              </button>
              <button
                onClick={() => {
                  console.log('🔄 Switching AI provider to: anthropic');
                  setAiProvider('anthropic');
                }}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  aiProvider === 'anthropic'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                title="Anthropic Direct API (Sonnet 4.5 - Most Powerful)"
              >
                Anthropic
              </button>
            </div>
          </div>

          <button
            onClick={handleNewSession}
            className="px-3 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            title="Clear all and start new session"
          >
            New Session
          </button>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Collapsible Help */}
      {showHelp && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          <ol className="list-decimal list-inside space-y-1">
            <li>Upload contract documents (PDFs, Word, images)</li>
            <li>Documents are auto-analyzed by AI</li>
            <li>Click "Analyze Documents" for detailed extraction</li>
            <li>Review and create contract from extracted data</li>
          </ol>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left: Upload Zone (30%) */}
        <div className="w-[30%] flex-shrink-0">
          <div className="sticky top-0">
            <DocumentUploader
              contractId={contractId}
              onUploadComplete={() => {
                console.log('📤 [CreateFromDocumentsTab] Upload complete, triggering DocumentManager refresh');
                // Increment counter to trigger DocumentManager useEffect without remounting
                setUploadTrigger(prev => prev + 1);
              }}
              onCreateContractFromAI={(formData, source) => {
                onCreateContract(formData, {
                  id: source.backendId || source.id,
                  name: source.name,
                  confidence: source.analysisConfidence
                });
              }}
              enableTextExtraction={true}
              enableAIAnalysis={true}
              compact={true}
            />
          </div>
        </div>

        {/* Right: Documents List & Analysis (70%) */}
        <div className="flex-1 overflow-auto">
          <ErrorBoundary>
            <DocumentManager
              contractId={contractId}
              onCreateFromDocument={onCreateContract}
              enableSearch={false}
              enableFiltering={false}
              compact={true}
              aiProvider={aiProvider}
              onUploadComplete={uploadTrigger}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};
