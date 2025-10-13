import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { AIEnhancedInput } from '../ui/AIEnhancedInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ContractFormData, ValidationError } from '../../types';
import { INDUSTRY_TYPES } from '../../utils/constants';

interface BasicInfoTabProps {
  formData: ContractFormData;
  validationErrors: ValidationError;
  onFieldChange: (field: keyof ContractFormData, value: any) => void;
  aiExtractionInfo?: {
    isAiExtracted: boolean;
    sourceDocument?: {
      id: string;
      name: string;
      confidence?: number;
    };
  };
  onAiFeedback?: (fieldName: string, correctedValue: any, confidence: number) => void;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  validationErrors,
  onFieldChange,
  aiExtractionInfo,
  onAiFeedback
}) => {
  // Helper function to get AI extraction info for a specific field
  const getFieldAiInfo = (fieldName: string) => {
    if (!aiExtractionInfo?.isAiExtracted) return undefined;
    return {
      isAiExtracted: true,
      fieldName,
      confidence: 0.85, // This would come from the AI analysis
      originalValue: formData[fieldName as keyof ContractFormData]
    };
  };
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Basic Contract Information</h2>
        <p className="text-gray-600 mt-2">
          Enter the fundamental details for this energy service agreement
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AIEnhancedInput
              id="customerName"
              label="Customer Name"
              value={formData.customerName}
              onChange={(value) => onFieldChange('customerName', value)}
              placeholder="Enter customer company name"
              required={true}
              error={validationErrors.customerName}
              aiExtractionInfo={getFieldAiInfo('customerName')}
              onAiFeedback={onAiFeedback}
            />

            <AIEnhancedInput
              id="industry"
              label="Customer Industry"
              value={formData.industry}
              onChange={(value) => onFieldChange('industry', value)}
              aiExtractionInfo={getFieldAiInfo('industry')}
              onAiFeedback={onAiFeedback}
            >
              <Select 
                value={formData.industry} 
                onValueChange={(value) => onFieldChange('industry', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_TYPES.map(industry => (
                    <SelectItem key={industry.value} value={industry.value}>
                      {industry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AIEnhancedInput>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AIEnhancedInput
            id="siteLocation"
            label="Site Location"
            value={formData.siteLocation}
            onChange={(value) => onFieldChange('siteLocation', value)}
            placeholder="City, State (e.g., North Haven, CT)"
            required={true}
            error={validationErrors.siteLocation}
            aiExtractionInfo={getFieldAiInfo('siteLocation')}
            onAiFeedback={onAiFeedback}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AIEnhancedInput
              id="facilitySize"
              label="Facility Size (sq ft)"
              type="number"
              value={formData.facilitySize || ''}
              onChange={(value) => onFieldChange('facilitySize', parseInt(value) || 0)}
              placeholder="e.g., 50000"
              aiExtractionInfo={getFieldAiInfo('facilitySize')}
              onAiFeedback={onAiFeedback}
            />

            <AIEnhancedInput
              id="employees"
              label="Number of Employees"
              type="number"
              value={formData.employees || ''}
              onChange={(value) => onFieldChange('employees', parseInt(value) || 0)}
              placeholder="e.g., 250"
              aiExtractionInfo={getFieldAiInfo('employees')}
              onAiFeedback={onAiFeedback}
            />

            <AIEnhancedInput
              id="operatingHours"
              label="Operating Hours/Day"
              type="number"
              value={formData.operatingHours || ''}
              onChange={(value) => onFieldChange('operatingHours', parseInt(value) || 24)}
              placeholder="e.g., 16"
              aiExtractionInfo={getFieldAiInfo('operatingHours')}
              onAiFeedback={onAiFeedback}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AIEnhancedInput
              id="orderDate"
              label="Order Date"
              type="date"
              value={formData.orderDate}
              onChange={(value) => onFieldChange('orderDate', value)}
              required={true}
              error={validationErrors.orderDate}
              aiExtractionInfo={getFieldAiInfo('orderDate')}
              onAiFeedback={onAiFeedback}
            />

            <div className="space-y-2">
              <AIEnhancedInput
                id="effectiveDate"
                label="Effective Date"
                type="date"
                value={formData.effectiveDate}
                onChange={(value) => onFieldChange('effectiveDate', value)}
                required={true}
                error={validationErrors.effectiveDate}
                aiExtractionInfo={getFieldAiInfo('effectiveDate')}
                onAiFeedback={onAiFeedback}
              />
              <p className="text-sm text-gray-500">
                When the contract terms become active
              </p>
            </div>
          </div>

          <AIEnhancedInput
            id="contactPerson"
            label="Primary Contact"
            value={formData.contactPerson || ''}
            onChange={(value) => onFieldChange('contactPerson', value)}
            placeholder="Contact name and role"
            aiExtractionInfo={getFieldAiInfo('contactPerson')}
            onAiFeedback={onAiFeedback}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AIEnhancedInput
              id="contactEmail"
              label="Contact Email"
              type="email"
              value={formData.contactEmail || ''}
              onChange={(value) => onFieldChange('contactEmail', value)}
              placeholder="contact@company.com"
              aiExtractionInfo={getFieldAiInfo('contactEmail')}
              onAiFeedback={onAiFeedback}
            />

            <AIEnhancedInput
              id="contactPhone"
              label="Contact Phone"
              type="tel"
              value={formData.contactPhone || ''}
              onChange={(value) => onFieldChange('contactPhone', value)}
              placeholder="(555) 123-4567"
              aiExtractionInfo={getFieldAiInfo('contactPhone')}
              onAiFeedback={onAiFeedback}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Section */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm font-medium">ℹ</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-green-900">Next Steps</h4>
              <p className="text-sm text-green-700 mt-1">
                After completing basic information, proceed to system configuration to define 
                capacity, reliability requirements, and technical specifications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};