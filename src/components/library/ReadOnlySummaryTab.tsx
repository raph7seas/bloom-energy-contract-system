import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { Contract, ContractFormData } from '../../types';
import { formatCurrency, formatCapacity } from '../../utils/calculations';

interface ReadOnlySummaryTabProps {
  contract: Contract;
  formData: ContractFormData;
}

export const ReadOnlySummaryTab: React.FC<ReadOnlySummaryTabProps> = ({
  contract,
  formData
}) => {
  const calculateTotalValue = () => {
    const baseAnnualValue = contract.capacity * formData.baseRate * 8760; // kW * $/kWh * hours/year
    return baseAnnualValue * contract.term;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Contract Summary</h2>
        <p className="text-gray-600 mt-2">
          Complete overview of your Bloom Energy service agreement
        </p>
      </div>

      {/* Key Contract Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatCapacity(contract.capacity)}</div>
              <div className="text-sm text-gray-500">System Capacity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{contract.term} years</div>
              <div className="text-sm text-gray-500">Contract Term</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(contract.totalValue)}</div>
              <div className="text-sm text-gray-500">Total Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formData.numberOfServers}</div>
              <div className="text-sm text-gray-500">Servers</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Information Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Customer & Site Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Customer</div>
              <div className="text-gray-900">{contract.client}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Site Location</div>
              <div className="text-gray-900">{contract.site}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Solution Type</div>
              <div className="text-gray-900">{contract.type}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Installation Type</div>
              <div className="text-gray-900">{formData.installationType}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Base Rate</div>
              <div className="text-gray-900">${formData.baseRate?.toFixed(3)} per kWh</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Annual Escalation</div>
              <div className="text-gray-900">{formData.annualEscalation}%</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Microgrid Adder</div>
              <div className="text-gray-900">
                {formData.microgridAdder ? `$${formData.microgridAdder.toFixed(3)} per kWh` : 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operating Parameters Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Operating Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Output Warranty</div>
              <div className="text-gray-900">{formData.outputWarrantyPercent}%</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Efficiency Warranty</div>
              <div className="text-gray-900">{formData.efficiencyWarrantyPercent}%</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Critical Output</div>
              <div className="text-gray-900">{formatCapacity(formData.guaranteedCriticalOutput)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Grid Voltage</div>
              <div className="text-gray-900">{formData.gridParallelVoltage}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">RECs Included</div>
              <div className="text-gray-900">
                {formData.includeRECs ? `Yes (${formData.recType})` : 'No'}
              </div>
            </div>
          </div>
          
          {formData.selectedComponents && formData.selectedComponents.length > 0 && (
            <div className="mt-4">
              <div className="font-medium text-gray-700 mb-2">Selected Components</div>
              <div className="flex flex-wrap gap-2">
                {formData.selectedComponents.map((component) => (
                  <Badge key={component} variant="outline">
                    {component}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Extraction Summary */}
      {contract.aiMetadata?.isAiExtracted && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              AI Extraction Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-blue-700">Overall Confidence</div>
                  <div className={`flex items-center gap-2 font-medium ${getConfidenceColor(contract.aiMetadata.overallConfidence || 0)}`}>
                    {getConfidenceIcon(contract.aiMetadata.overallConfidence || 0)}
                    {Math.round((contract.aiMetadata.overallConfidence || 0) * 100)}%
                  </div>
                </div>
                <div>
                  <div className="font-medium text-blue-700">Source Document</div>
                  <div className="text-blue-900">{contract.aiMetadata.sourceDocument.name}</div>
                </div>
                <div>
                  <div className="font-medium text-blue-700">Extraction Date</div>
                  <div className="text-blue-900">
                    {new Date(contract.aiMetadata.extractionDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              {Object.keys(contract.aiMetadata.manualCorrections || {}).length > 0 && (
                <div className="pt-4 border-t border-blue-200">
                  <div className="font-medium text-blue-700 mb-2">Manual Corrections Made</div>
                  <div className="text-sm text-blue-600">
                    {Object.keys(contract.aiMetadata.manualCorrections).length} field(s) have been manually corrected to improve AI accuracy.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract Status */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {contract.status}
              </Badge>
              <span className="text-sm text-gray-600">
                Created: {contract.uploadDate} | Effective: {contract.effectiveDate}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Contract ID: {contract.id}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};