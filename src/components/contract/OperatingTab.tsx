import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ContractFormData, ValidationError } from '../../types';
import { REC_TYPES } from '../../utils/constants';

interface OperatingTabProps {
  formData: ContractFormData;
  validationErrors: ValidationError;
  onFieldChange: (field: keyof ContractFormData, value: any) => void;
}

export const OperatingTab: React.FC<OperatingTabProps> = ({
  formData,
  validationErrors,
  onFieldChange
}) => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Operating Parameters</h2>
        <p className="text-gray-600 mt-2">Define warranty terms, demand ranges, and operational requirements</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Performance Warranties</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Output Warranty (%)</Label>
              <Input
                type="number"
                value={formData.outputWarrantyPercent}
                onChange={(e) => onFieldChange('outputWarrantyPercent', parseInt(e.target.value) || 0)}
                min="0" max="100"
                className={validationErrors.outputWarrantyPercent ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <Label>Efficiency Warranty (%)</Label>
              <Input
                type="number"
                value={formData.efficiencyWarrantyPercent}
                onChange={(e) => onFieldChange('efficiencyWarrantyPercent', parseInt(e.target.value) || 0)}
                min="0" max="100"
                className={validationErrors.efficiencyWarrantyPercent ? 'border-red-500' : ''}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Demand Parameters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Minimum Demand (kW)</Label>
              <Input
                type="number"
                value={formData.minDemandKW}
                onChange={(e) => onFieldChange('minDemandKW', parseInt(e.target.value) || 0)}
                className={validationErrors.minDemandKW ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <Label>Maximum Demand (kW)</Label>
              <Input
                type="number"
                value={formData.maxDemandKW}
                onChange={(e) => onFieldChange('maxDemandKW', parseInt(e.target.value) || 0)}
                className={validationErrors.maxDemandKW ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <Label>Guaranteed Critical Output (kW)</Label>
              <Input
                type="number"
                value={formData.guaranteedCriticalOutput}
                onChange={(e) => onFieldChange('guaranteedCriticalOutput', parseInt(e.target.value) || 0)}
                className={validationErrors.guaranteedCriticalOutput ? 'border-red-500' : ''}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Environmental Credits</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.includeRECs}
              onCheckedChange={(checked) => onFieldChange('includeRECs', checked)}
            />
            <Label>Include Renewable Energy Certificates (RECs)</Label>
          </div>
          {formData.includeRECs && (
            <Select value={formData.recType} onValueChange={(value) => onFieldChange('recType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select REC type" />
              </SelectTrigger>
              <SelectContent>
                {REC_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>
    </div>
  );
};