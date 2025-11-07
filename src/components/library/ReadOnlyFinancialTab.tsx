import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { ContractFormData, AIExtractionMetadata } from '../../types';
import { ReadOnlyFieldDisplay } from './ReadOnlyFieldDisplay';

interface ReadOnlyFinancialTabProps {
  formData: ContractFormData;
  aiMetadata?: AIExtractionMetadata;
}

export const ReadOnlyFinancialTab: React.FC<ReadOnlyFinancialTabProps> = ({
  formData,
  aiMetadata
}) => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Financial Parameters</h2>
        <p className="text-gray-600 mt-2">
          Pricing structure and financial terms for your energy service agreement
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Base Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyFieldDisplay
              label="Base Rate"
              value={formData.baseRate}
              fieldName="baseRate"
              aiMetadata={aiMetadata}
              formatValue={(value) => value ? `$${value.toFixed(3)}` : ''}
              unit="per kWh"
            />
            <ReadOnlyFieldDisplay
              label="Annual Escalation"
              value={formData.annualEscalation}
              fieldName="annualEscalation"
              aiMetadata={aiMetadata}
              formatValue={(value) => value ? `${value}%` : ''}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyFieldDisplay
              label="Microgrid Adder"
              value={formData.microgridAdder}
              fieldName="microgridAdder"
              aiMetadata={aiMetadata}
              formatValue={(value) => value ? `$${value.toFixed(3)}` : ''}
              unit="per kWh"
            />
            <ReadOnlyFieldDisplay
              label="Thermal Cycle Fee"
              value={formData.thermalCycleFee}
              fieldName="thermalCycleFee"
              aiMetadata={aiMetadata}
              formatValue={(value) => value ? `$${value.toLocaleString()}` : ''}
              unit="per cycle"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyFieldDisplay
              label="Electrical Budget"
              value={formData.electricalBudget}
              fieldName="electricalBudget"
              aiMetadata={aiMetadata}
              formatValue={(value) => value ? `$${value.toLocaleString()}` : ''}
            />
            <ReadOnlyFieldDisplay
              label="Commissioning Allowance"
              value={formData.commissioningAllowance}
              fieldName="commissioningAllowance"
              aiMetadata={aiMetadata}
              formatValue={(value) => value ? `$${value.toLocaleString()}` : ''}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};