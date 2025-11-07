import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Brain } from 'lucide-react';
import { ContractFormData, AIExtractionMetadata } from '../../types';

interface ReadOnlyBasicInfoTabProps {
  formData: ContractFormData;
  aiMetadata?: AIExtractionMetadata;
}

export const ReadOnlyBasicInfoTab: React.FC<ReadOnlyBasicInfoTabProps> = ({
  formData,
  aiMetadata
}) => {
  // Helper function to check if field was AI extracted and get confidence
  const getFieldAiInfo = (fieldName: keyof ContractFormData) => {
    if (!aiMetadata?.isAiExtracted) return null;
    const confidence = aiMetadata.fieldConfidences[fieldName];
    return confidence ? { confidence, isAiExtracted: true } : null;
  };

  // Helper component for displaying field values with AI indicators
  const FieldDisplay: React.FC<{
    label: string;
    value: string | number | undefined;
    fieldName: keyof ContractFormData;
  }> = ({ label, value, fieldName }) => {
    const aiInfo = getFieldAiInfo(fieldName);
    
    return (
      <div>
        <div className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
          {label}
          {aiInfo && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
              <Brain className="h-2 w-2 mr-1" />
              AI {Math.round(aiInfo.confidence * 100)}%
            </Badge>
          )}
        </div>
        <div className={`text-gray-900 ${aiInfo ? 'bg-blue-50 px-2 py-1 rounded border border-blue-200' : 'bg-gray-50 px-2 py-1 rounded border'}`}>
          {value || '—'}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Basic Contract Information</h2>
        <p className="text-gray-600 mt-2">
          Fundamental details for this energy service agreement
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldDisplay
              label="Customer Name"
              value={formData.customerName}
              fieldName="customerName"
            />
            <FieldDisplay
              label="Customer Industry"
              value={formData.industry}
              fieldName="industry"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldDisplay
            label="Site Location"
            value={formData.siteLocation}
            fieldName="siteLocation"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldDisplay
              label="Facility Size (sq ft)"
              value={formData.facilitySize ? formData.facilitySize.toLocaleString() : undefined}
              fieldName="facilitySize"
            />
            <FieldDisplay
              label="Number of Employees"
              value={formData.employees}
              fieldName="employees"
            />
            <FieldDisplay
              label="Operating Hours/Day"
              value={formData.operatingHours}
              fieldName="operatingHours"
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
            <FieldDisplay
              label="Order Date"
              value={formData.orderDate}
              fieldName="orderDate"
            />
            <FieldDisplay
              label="Effective Date"
              value={formData.effectiveDate}
              fieldName="effectiveDate"
            />
          </div>

          <FieldDisplay
            label="Primary Contact"
            value={formData.contactPerson}
            fieldName="contactPerson"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldDisplay
              label="Contact Email"
              value={formData.contactEmail}
              fieldName="contactEmail"
            />
            <FieldDisplay
              label="Contact Phone"
              value={formData.contactPhone}
              fieldName="contactPhone"
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Extraction Info */}
      {aiMetadata?.isAiExtracted && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Brain className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-900">AI Extraction Information</h4>
                <p className="text-sm text-blue-700 mt-1">
                  This information was automatically extracted from the uploaded document. 
                  Fields marked with AI indicators show the confidence level of the extraction.
                  You can edit this contract to make corrections and help improve AI accuracy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};