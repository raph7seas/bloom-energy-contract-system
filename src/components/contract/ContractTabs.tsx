import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { ContractFormData, ValidationError, TabValidationState } from '../../types';
import { TAB_CONFIG } from '../../utils/constants';
import { BasicInfoTab } from './BasicInfoTab';
import { SystemConfigTab } from './SystemConfigTab';
import { FinancialTab } from './FinancialTab';
import { OperatingTab } from './OperatingTab';
import { TechnicalTab } from './TechnicalTab';
import { SummaryTab } from './SummaryTab';
import { AIAssistantTab } from './AIAssistantTab';
import { BusinessRulesDisplay } from '../rules/BusinessRulesDisplay';
import { Plus, User, Zap, DollarSign, Settings, Cpu, FileText, CheckCircle, AlertCircle, Brain, Shield, Upload, Edit3 } from 'lucide-react';

interface ContractTabsProps {
  formData: ContractFormData;
  validationErrors: ValidationError;
  tabValidation: TabValidationState;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFieldChange: (field: keyof ContractFormData, value: any) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  aiExtractionInfo?: {
    isAiExtracted: boolean;
    sourceDocument?: {
      id: string;
      name: string;
      confidence?: number;
    };
  };
  onAiFeedback?: (fieldName: string, correctedValue: any, confidence: number) => void;
  onCreateFromDocuments?: () => void;
  onCreateManually?: () => void;
}

export const ContractTabs: React.FC<ContractTabsProps> = ({
  formData,
  validationErrors,
  tabValidation,
  activeTab,
  onTabChange,
  onFieldChange,
  onGenerate,
  isGenerating,
  canGenerate,
  aiExtractionInfo,
  onAiFeedback,
  onCreateFromDocuments,
  onCreateManually
}) => {
  const tabIcons = {
    create: Plus,
    'ai-assistant': Brain,
    basic: User,
    system: Zap,
    financial: DollarSign,
    operating: Settings,
    technical: Cpu,
    'business-rules': Shield,
    summary: FileText
  };

  const getTabStatus = (tabId: string) => {
    const tabConfig = TAB_CONFIG.find(t => t.id === tabId);
    if (!tabConfig?.required) return 'optional';
    return tabValidation[tabId] === true ? 'valid' : 'invalid';
  };

  return (
    <div className="h-full flex flex-col relative">
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
        {/* AI Extraction Banner */}
        {aiExtractionInfo?.isAiExtracted && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Contract data extracted from: {aiExtractionInfo.sourceDocument?.name}
                </span>
                {aiExtractionInfo.sourceDocument?.confidence && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {Math.round(aiExtractionInfo.sourceDocument.confidence * 100)}% confidence
                  </Badge>
                )}
              </div>
              <div className="text-xs text-blue-700">
                Click any field to edit and improve AI accuracy
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation - Only show when not on create tab */}
        {activeTab !== 'create' && (
          <div className="px-6 py-4 flex-shrink-0">
            <div className="flex justify-center">
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                {TAB_CONFIG.filter(tab => tab.id !== 'create').map((tab) => {
                  const Icon = tabIcons[tab.id as keyof typeof tabIcons];
                  const status = getTabStatus(tab.id);
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium",
                        isActive 
                          ? "bg-white shadow-sm text-green-600 border border-green-200" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">{tab.label}</span>
                      {status === 'valid' && tab.required && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                      {status === 'invalid' && tab.required && (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content - with bottom padding for fixed navigation */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto scrollbar-hide" style={{ paddingBottom: '80px' }}>
            <TabsContent value="create" className="mt-0 p-6 h-full">
              <div className="h-full flex items-center justify-center">
                <div className="max-w-5xl w-full space-y-8">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Create New Contract</h1>
                    <p className="text-lg text-gray-600 mt-2">
                      Choose how you'd like to create your contract
                    </p>
                  </div>

                  {/* Two-Option Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Option 1: From Documents */}
                    <div className="bg-white border-2 border-gray-200 rounded-lg p-8 hover:border-green-500 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                         onClick={onCreateFromDocuments}>
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                          <Upload className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">From Documents</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Upload your contract PDFs and let AI automatically extract all the data for you
                          </p>
                        </div>
                        <div className="flex flex-col items-start text-left w-full space-y-2 text-xs text-gray-500 pt-2">
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                            <span>Fast and automated</span>
                          </div>
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                            <span>Supports multiple documents</span>
                          </div>
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                            <span>AI-powered extraction</span>
                          </div>
                        </div>
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 text-white mt-4"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateFromDocuments?.();
                          }}
                        >
                          Upload Documents
                          <Upload className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Option 2: Manual Entry */}
                    <div className="bg-white border-2 border-gray-200 rounded-lg p-8 hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                         onClick={onCreateManually}>
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <Edit3 className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Manual Entry</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Create your contract from scratch using our guided step-by-step form
                          </p>
                        </div>
                        <div className="flex flex-col items-start text-left w-full space-y-2 text-xs text-gray-500 pt-2">
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                            <span>Complete control</span>
                          </div>
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                            <span>Guided workflow</span>
                          </div>
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                            <span>No documents needed</span>
                          </div>
                        </div>
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateManually?.();
                          }}
                        >
                          Start Manual Entry
                          <Edit3 className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai-assistant" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <AIAssistantTab 
                  formData={formData}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                  aiExtractionInfo={aiExtractionInfo}
                  onAiFeedback={onAiFeedback}
                />
              </div>
            </TabsContent>

            <TabsContent value="basic" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <BasicInfoTab 
                  formData={formData}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                  aiExtractionInfo={aiExtractionInfo}
                  onAiFeedback={onAiFeedback}
                />
              </div>
            </TabsContent>

            <TabsContent value="system" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <SystemConfigTab 
                  formData={formData}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                  aiExtractionInfo={aiExtractionInfo}
                  onAiFeedback={onAiFeedback}
                />
              </div>
            </TabsContent>

            <TabsContent value="financial" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <FinancialTab 
                  formData={formData}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                  aiExtractionInfo={aiExtractionInfo}
                  onAiFeedback={onAiFeedback}
                />
              </div>
            </TabsContent>

            <TabsContent value="operating" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <OperatingTab 
                  formData={formData}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                  aiExtractionInfo={aiExtractionInfo}
                  onAiFeedback={onAiFeedback}
                />
              </div>
            </TabsContent>

            <TabsContent value="technical" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <TechnicalTab 
                  formData={formData}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                  aiExtractionInfo={aiExtractionInfo}
                  onAiFeedback={onAiFeedback}
                />
              </div>
            </TabsContent>

            <TabsContent value="business-rules" className="mt-0 p-6">
              <div className="max-w-6xl mx-auto">
                <BusinessRulesDisplay 
                  contractData={formData}
                  aiExtractionInfo={aiExtractionInfo}
                />
              </div>
            </TabsContent>

            <TabsContent value="summary" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <SummaryTab 
                  formData={formData}
                  onGenerate={onGenerate}
                  isGenerating={isGenerating}
                />
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Tab Navigation Footer - Fixed at bottom outside of Tabs */}
      {activeTab !== 'create' && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-white border rounded-full px-8 py-4 shadow-lg flex justify-between items-center min-w-96">
            <Button 
              variant="outline" 
              onClick={() => {
                const currentIndex = TAB_CONFIG.findIndex(t => t.id === activeTab);
                if (currentIndex > 0) {
                  onTabChange(TAB_CONFIG[currentIndex - 1].id);
                }
              }}
              disabled={TAB_CONFIG.findIndex(t => t.id === activeTab) === 0}
            >
              Previous
            </Button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Step {TAB_CONFIG.findIndex(t => t.id === activeTab) + 1} of {TAB_CONFIG.length}
              </span>
            </div>

            <Button 
              onClick={() => {
                const currentIndex = TAB_CONFIG.findIndex(t => t.id === activeTab);
                if (currentIndex < TAB_CONFIG.length - 1) {
                  onTabChange(TAB_CONFIG[currentIndex + 1].id);
                }
              }}
              disabled={TAB_CONFIG.findIndex(t => t.id === activeTab) === TAB_CONFIG.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};