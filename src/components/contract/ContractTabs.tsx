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
import { Plus, User, Zap, DollarSign, Settings, Cpu, FileText, CheckCircle, AlertCircle } from 'lucide-react';

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
  canGenerate
}) => {
  const tabIcons = {
    create: Plus,
    basic: User,
    system: Zap,
    financial: DollarSign,
    operating: Settings,
    technical: Cpu,
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
                <div className="text-center space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Create New Contract</h1>
                    <p className="text-lg text-gray-600 mt-2">
                      Let's build your Bloom Energy service agreement step by step
                    </p>
                  </div>
                  <Button 
                    onClick={() => onTabChange('basic')}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                    size="lg"
                  >
                    Start Contract Creation
                    <Plus className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="basic" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <BasicInfoTab 
                  formData={formData}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="system" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <SystemConfigTab 
                  formData={formData}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="financial" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <FinancialTab 
                  formData={formData}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="operating" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <OperatingTab 
                  formData={formData}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="technical" className="mt-0 p-6">
              <div className="max-w-4xl mx-auto">
                <TechnicalTab 
                  formData={formData}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
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