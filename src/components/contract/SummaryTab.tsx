import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ContractFormData } from '../../types';
import { calculateYearlyRates, calculateTotalContractValue, formatCurrency, formatCapacity } from '../../utils/calculations';
import { Download, FileText, Send } from 'lucide-react';
import { PDFService } from '../../services/pdfService';

interface SummaryTabProps {
  formData: ContractFormData;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  formData,
  onGenerate,
  isGenerating
}) => {
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const yearlyRates = useMemo(() => {
    return calculateYearlyRates(formData.baseRate, formData.annualEscalation, formData.contractTerm);
  }, [formData.baseRate, formData.annualEscalation, formData.contractTerm]);

  const totalValue = useMemo(() => {
    return calculateTotalContractValue(formData.ratedCapacity, yearlyRates);
  }, [formData.ratedCapacity, yearlyRates]);

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await PDFService.exportContractToPDF(formData);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please check your browser settings and try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Contract Summary</h2>
        <p className="text-gray-600 mt-2">Review all contract details before generation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader><CardTitle>Contract Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Customer:</span><span className="font-medium">{formData.customerName}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Location:</span><span className="font-medium">{formData.siteLocation}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Effective Date:</span><span className="font-medium">{formData.effectiveDate}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Solution Type:</span><span className="font-medium">{formData.solutionType}</span></div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card>
          <CardHeader><CardTitle>System Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Capacity:</span><span className="font-medium">{formatCapacity(formData.ratedCapacity)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Reliability:</span><span className="font-medium">{formData.reliabilityLevel}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Term:</span><span className="font-medium">{formData.contractTerm} years</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Voltage:</span><span className="font-medium">{formData.gridParallelVoltage}</span></div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader><CardTitle>Financial Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Base Rate:</span><span className="font-medium">${formData.baseRate}/kW</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Escalation:</span><span className="font-medium">{formData.annualEscalation}%/year</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Total Value:</span><span className="font-medium text-green-600">{formatCurrency(totalValue)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Year 1 Rate:</span><span className="font-medium">${yearlyRates[0]?.rate}/kW</span></div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader><CardTitle>Technical Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Servers:</span><span className="font-medium">{formData.numberOfServers}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Warranties:</span><span className="font-medium">{formData.outputWarrantyPercent}% / {formData.efficiencyWarrantyPercent}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Demand Range:</span><span className="font-medium">{formData.minDemandKW}-{formData.maxDemandKW} kW</span></div>
            <div className="flex justify-between"><span className="text-gray-600">RECs:</span><span className="font-medium">{formData.includeRECs ? formData.recType : 'None'}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Components */}
      <Card>
        <CardHeader><CardTitle>Selected Components</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {formData.selectedComponents?.map(comp => (
              <Badge key={comp} variant="outline">{comp}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate Actions */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-green-900">Ready to Generate Contract</h3>
            <p className="text-green-700">Review the summary above and generate your contract documents.</p>
            <div className="flex justify-center space-x-3">
              <Button onClick={onGenerate} disabled={isGenerating} className="bg-green-600 hover:bg-green-700">
                {isGenerating ? 'Generating...' : 'Generate Contract'}
                <FileText className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportPDF}
                disabled={isExportingPDF}
              >
                <Download className="mr-2 h-4 w-4" />
                {isExportingPDF ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};