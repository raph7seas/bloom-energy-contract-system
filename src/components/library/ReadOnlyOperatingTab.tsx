import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { ContractFormData, AIExtractionMetadata } from '../../types';
import { ReadOnlyFieldDisplay } from './ReadOnlyFieldDisplay';

interface ReadOnlyOperatingTabProps {
  formData: ContractFormData;
  aiMetadata?: AIExtractionMetadata;
}

export const ReadOnlyOperatingTab: React.FC<ReadOnlyOperatingTabProps> = ({
  formData,
  aiMetadata
}) => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Operating Parameters</h2>
        <p className="text-gray-600 mt-2">
          Performance guarantees and operational requirements for your Bloom Energy system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Warranties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyFieldDisplay
              label="Output Warranty"
              value={formData.outputWarrantyPercent}
              fieldName="outputWarrantyPercent"
              aiMetadata={aiMetadata}
              formatValue={(value) => value ? `${value}%` : ''}
            />
            <ReadOnlyFieldDisplay
              label="Efficiency Warranty"
              value={formData.efficiencyWarrantyPercent}
              fieldName="efficiencyWarrantyPercent"
              aiMetadata={aiMetadata}
              formatValue={(value) => value ? `${value}%` : ''}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demand Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyFieldDisplay
              label="Minimum Demand"
              value={formData.minDemandKW}
              fieldName="minDemandKW"
              aiMetadata={aiMetadata}
              unit="kW"
              formatValue={(value) => value ? value.toLocaleString() : ''}
            />
            <ReadOnlyFieldDisplay
              label="Maximum Demand"
              value={formData.maxDemandKW}
              fieldName="maxDemandKW"
              aiMetadata={aiMetadata}
              unit="kW"
              formatValue={(value) => value ? value.toLocaleString() : ''}
            />
          </div>
          
          <ReadOnlyFieldDisplay
            label="Guaranteed Critical Output"
            value={formData.guaranteedCriticalOutput}
            fieldName="guaranteedCriticalOutput"
            aiMetadata={aiMetadata}
            unit="kW"
            formatValue={(value) => value ? value.toLocaleString() : ''}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Renewable Energy Credits (RECs)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyFieldDisplay
              label="Include RECs"
              value={formData.includeRECs}
              fieldName="includeRECs"
              aiMetadata={aiMetadata}
            />
            {formData.includeRECs && (
              <ReadOnlyFieldDisplay
                label="REC Type"
                value={formData.recType}
                fieldName="recType"
                aiMetadata={aiMetadata}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};