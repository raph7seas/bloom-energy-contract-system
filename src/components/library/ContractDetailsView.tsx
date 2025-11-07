import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ArrowLeft, Brain, FileText, Edit, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { Contract, ContractFormData } from '../../types';
import { TAB_CONFIG } from '../../utils/constants';
import { formatCurrency, formatCapacity } from '../../utils/calculations';

// Read-only versions of tab components
import { ReadOnlyBasicInfoTab } from './ReadOnlyBasicInfoTab';
import { ReadOnlySystemConfigTab } from './ReadOnlySystemConfigTab';
import { ReadOnlyFinancialTab } from './ReadOnlyFinancialTab';
import { ReadOnlyOperatingTab } from './ReadOnlyOperatingTab';
import { ReadOnlyTechnicalTab } from './ReadOnlyTechnicalTab';
import { ReadOnlySummaryTab } from './ReadOnlySummaryTab';

interface ContractDetailsViewProps {
  contract: Contract;
  onNavigate: (view: string, contract?: Contract) => void;
  onEditContract?: (contract: Contract) => void;
}

export const ContractDetailsView: React.FC<ContractDetailsViewProps> = ({
  contract,
  onNavigate,
  onEditContract
}) => {
  const [activeTab, setActiveTab] = useState('basic');

  // Convert contract to form data for display
  const getFormDataFromContract = (): ContractFormData => {
    return {
      customerName: contract.client,
      siteLocation: contract.site,
      orderDate: contract.uploadDate,
      effectiveDate: contract.effectiveDate,
      solutionType: contract.type,
      ratedCapacity: contract.capacity,
      reliabilityLevel: 99.9, // Default, would need to be stored in contract
      installationType: 'Ground', // Default, would need to be stored
      contractTerm: contract.term,
      baseRate: contract.parameters.financial.baseRate,
      annualEscalation: contract.parameters.financial.escalation,
      microgridAdder: contract.parameters.financial.microgridAdder || 0,
      thermalCycleFee: contract.parameters.financial.thermalCycleFee || 0,
      electricalBudget: contract.parameters.financial.electricalBudget || 0,
      commissioningAllowance: contract.parameters.financial.commissioningAllowance || 0,
      outputWarrantyPercent: contract.parameters.operating.outputWarranty,
      efficiencyWarrantyPercent: contract.parameters.operating.efficiency,
      minDemandKW: contract.parameters.operating.demandRange.min,
      maxDemandKW: contract.parameters.operating.demandRange.max,
      guaranteedCriticalOutput: contract.parameters.operating.criticalOutput,
      includeRECs: !!contract.parameters.technical.recType,
      recType: contract.parameters.technical.recType || 'CT-Class-I',
      gridParallelVoltage: contract.parameters.technical.voltage,
      numberOfServers: contract.parameters.technical.servers,
      selectedComponents: contract.parameters.technical.components,
      specialRequirements: contract.notes || ''
    };
  };

  const formData = getFormDataFromContract();
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTabIcon = (tabId: string) => {
    const icons = {
      basic: '👤',
      system: '⚡',
      financial: '💰',
      operating: '⚙️',
      technical: '🔧',
      summary: '📄'
    };
    return icons[tabId as keyof typeof icons] || '📄';
  };

  const tabsConfig = TAB_CONFIG.filter(tab => tab.id !== 'create' && tab.id !== 'ai-assistant');

  return (
    <div className="absolute inset-0 p-6">
      <div className="w-full space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => onNavigate('library')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Library
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{contract.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(contract.status)}>
                  {contract.status}
                </Badge>
                {contract.aiMetadata?.isAiExtracted && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                    <Brain className="h-3 w-3 mr-1" />
                    AI Extracted ({Math.round((contract.aiMetadata.overallConfidence || 0) * 100)}% confidence)
                  </Badge>
                )}
                <span className="text-sm text-gray-500">ID: {contract.id}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onEditContract?.(contract)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Contract
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* AI Source Information */}
        {contract.aiMetadata?.isAiExtracted && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Source Document</h4>
                  <p className="text-sm text-blue-700">
                    Extracted from: <strong>{contract.aiMetadata.sourceDocument.name}</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Extraction Date: {new Date(contract.aiMetadata.extractionDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contract Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Client</div>
                <div className="font-medium">{contract.client}</div>
              </div>
              <div>
                <div className="text-gray-500">Site</div>
                <div className="font-medium">{contract.site}</div>
              </div>
              <div>
                <div className="text-gray-500">Capacity</div>
                <div className="font-medium">{formatCapacity(contract.capacity)}</div>
              </div>
              <div>
                <div className="text-gray-500">Term</div>
                <div className="font-medium">{contract.term} years</div>
              </div>
              <div>
                <div className="text-gray-500">Type</div>
                <div className="font-medium">{contract.type}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Value</div>
                <div className="font-medium text-green-600">{formatCurrency(contract.totalValue)}</div>
              </div>
              <div>
                <div className="text-gray-500">Effective Date</div>
                <div className="font-medium">{contract.effectiveDate}</div>
              </div>
              <div>
                <div className="text-gray-500">Upload Date</div>
                <div className="font-medium">{contract.uploadDate}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Details Tabs */}
        <Card className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            
            {/* Tab Navigation */}
            <div className="px-6 py-4 border-b">
              <div className="flex justify-center">
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                  {tabsConfig.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                        activeTab === tab.id 
                          ? 'bg-white shadow-sm text-green-600 border border-green-200' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">{getTabIcon(tab.id)}</span>
                      <span className="whitespace-nowrap">{tab.label}</span>
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                
                <TabsContent value="basic" className="mt-0">
                  <ReadOnlyBasicInfoTab 
                    formData={formData} 
                    aiMetadata={contract.aiMetadata}
                  />
                </TabsContent>

                <TabsContent value="system" className="mt-0">
                  <ReadOnlySystemConfigTab 
                    formData={formData} 
                    aiMetadata={contract.aiMetadata}
                  />
                </TabsContent>

                <TabsContent value="financial" className="mt-0">
                  <ReadOnlyFinancialTab 
                    formData={formData} 
                    aiMetadata={contract.aiMetadata}
                  />
                </TabsContent>

                <TabsContent value="operating" className="mt-0">
                  <ReadOnlyOperatingTab 
                    formData={formData} 
                    aiMetadata={contract.aiMetadata}
                  />
                </TabsContent>

                <TabsContent value="technical" className="mt-0">
                  <ReadOnlyTechnicalTab 
                    formData={formData} 
                    aiMetadata={contract.aiMetadata}
                  />
                </TabsContent>

                <TabsContent value="summary" className="mt-0">
                  <ReadOnlySummaryTab 
                    contract={contract}
                    formData={formData}
                  />
                </TabsContent>

              </div>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};