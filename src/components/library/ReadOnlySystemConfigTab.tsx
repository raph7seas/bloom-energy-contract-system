import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { ContractFormData, AIExtractionMetadata } from '../../types';
import { ReadOnlyFieldDisplay } from './ReadOnlyFieldDisplay';

interface ReadOnlySystemConfigTabProps {
  formData: ContractFormData;
  aiMetadata?: AIExtractionMetadata;
}

export const ReadOnlySystemConfigTab: React.FC<ReadOnlySystemConfigTabProps> = ({
  formData,
  aiMetadata
}) => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
        <p className="text-gray-600 mt-2">
          Technical specifications and system requirements for your Bloom Energy solution
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solution Type & Capacity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyFieldDisplay
              label="Solution Type"
              value={formData.solutionType}
              fieldName="solutionType"
              aiMetadata={aiMetadata}
            />
            <ReadOnlyFieldDisplay
              label="Rated Capacity"
              value={formData.ratedCapacity}
              fieldName="ratedCapacity"
              aiMetadata={aiMetadata}
              unit="kW"
              formatValue={(value) => value ? value.toLocaleString() : ''}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyFieldDisplay
              label="Reliability Level"
              value={formData.reliabilityLevel}
              fieldName="reliabilityLevel"
              aiMetadata={aiMetadata}
              formatValue={(value) => value ? `${value}%` : ''}
            />
            <ReadOnlyFieldDisplay
              label="Installation Type"
              value={formData.installationType}
              fieldName="installationType"
              aiMetadata={aiMetadata}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReadOnlyFieldDisplay
              label="Contract Term"
              value={formData.contractTerm}
              fieldName="contractTerm"
              aiMetadata={aiMetadata}
              unit="years"
            />
            <ReadOnlyFieldDisplay
              label="Order Date"
              value={formData.orderDate}
              fieldName="orderDate"
              aiMetadata={aiMetadata}
            />
            <ReadOnlyFieldDisplay
              label="Effective Date"
              value={formData.effectiveDate}
              fieldName="effectiveDate"
              aiMetadata={aiMetadata}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyFieldDisplay
              label="Customer Name"
              value={formData.customerName}
              fieldName="customerName"
              aiMetadata={aiMetadata}
            />
            <ReadOnlyFieldDisplay
              label="Site Location"
              value={formData.siteLocation}
              fieldName="siteLocation"
              aiMetadata={aiMetadata}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};