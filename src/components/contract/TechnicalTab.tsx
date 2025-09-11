import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { ContractFormData, ValidationError } from '../../types';
import { VOLTAGE_LEVELS, COMPONENT_TYPES } from '../../utils/constants';

interface TechnicalTabProps {
  formData: ContractFormData;
  validationErrors: ValidationError;
  onFieldChange: (field: keyof ContractFormData, value: any) => void;
}

export const TechnicalTab: React.FC<TechnicalTabProps> = ({
  formData,
  validationErrors,
  onFieldChange
}) => {
  const toggleComponent = (component: string) => {
    const currentComponents = formData.selectedComponents || [];
    const updatedComponents = currentComponents.includes(component as any)
      ? currentComponents.filter(c => c !== component)
      : [...currentComponents, component as any];
    onFieldChange('selectedComponents', updatedComponents);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Technical Specifications</h2>
        <p className="text-gray-600 mt-2">Configure technical parameters and system components</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Electrical Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Grid Parallel Voltage <span className="text-red-500">*</span></Label>
              <Select value={formData.gridParallelVoltage} onValueChange={(value) => onFieldChange('gridParallelVoltage', value)}>
                <SelectTrigger className={validationErrors.gridParallelVoltage ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select voltage level" />
                </SelectTrigger>
                <SelectContent>
                  {VOLTAGE_LEVELS.map(voltage => (
                    <SelectItem key={voltage.value} value={voltage.value}>{voltage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Number of Servers <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                value={formData.numberOfServers}
                onChange={(e) => onFieldChange('numberOfServers', parseInt(e.target.value) || 0)}
                className={validationErrors.numberOfServers ? 'border-red-500' : ''}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>System Components</CardTitle></CardHeader>
        <CardContent>
          <Label className="mb-3 block">Selected Components <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {COMPONENT_TYPES.map(component => {
              const isSelected = formData.selectedComponents?.includes(component.value);
              return (
                <div
                  key={component.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleComponent(component.value)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{component.label}</span>
                    {isSelected && <Badge variant="default" className="text-xs">✓</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{component.description}</p>
                </div>
              );
            })}
          </div>
          {validationErrors.selectedComponents && (
            <p className="text-sm text-red-500 mt-2">{validationErrors.selectedComponents}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};