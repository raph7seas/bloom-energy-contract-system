import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { ContractFormData, ValidationError } from '../../types';
import { SYSTEM_TYPES, RELIABILITY_LEVELS, INSTALLATION_TYPES, CAPACITY_RULES } from '../../utils/constants';
import { formatCapacity } from '../../utils/calculations';

interface SystemConfigTabProps {
  formData: ContractFormData;
  validationErrors: ValidationError;
  onFieldChange: (field: keyof ContractFormData, value: any) => void;
}

export const SystemConfigTab: React.FC<SystemConfigTabProps> = ({
  formData,
  validationErrors,
  onFieldChange
}) => {
  const handleCapacityChange = (value: number[]) => {
    const capacity = value[0];
    // Round to nearest 325kW multiple
    const roundedCapacity = Math.round(capacity / CAPACITY_RULES.MULTIPLE) * CAPACITY_RULES.MULTIPLE;
    onFieldChange('ratedCapacity', roundedCapacity);
  };

  const getSystemTypeDescription = (type: string) => {
    const systemType = SYSTEM_TYPES.find(st => st.value === type);
    return systemType?.description || '';
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
        <p className="text-gray-600 mt-2">
          Define the technical specifications and capacity requirements for the Bloom Energy system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solution Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="solutionType">
              System Solution <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.solutionType} 
              onValueChange={(value) => onFieldChange('solutionType', value)}
            >
              <SelectTrigger className={validationErrors.solutionType ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select solution type" />
              </SelectTrigger>
              <SelectContent>
                {SYSTEM_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-gray-500">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.solutionType && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  {getSystemTypeDescription(formData.solutionType)}
                </p>
              </div>
            )}
            {validationErrors.solutionType && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.solutionType}</p>
            )}
          </div>

          <div>
            <Label htmlFor="installationType">Installation Type</Label>
            <Select 
              value={formData.installationType} 
              onValueChange={(value) => onFieldChange('installationType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select installation type" />
              </SelectTrigger>
              <SelectContent>
                {INSTALLATION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacity & Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>
                Rated Capacity <span className="text-red-500">*</span>
              </Label>
              <Badge variant="outline">
                {formatCapacity(formData.ratedCapacity)}
              </Badge>
            </div>
            
            <Slider
              value={[formData.ratedCapacity]}
              onValueChange={handleCapacityChange}
              min={CAPACITY_RULES.MIN}
              max={CAPACITY_RULES.MAX}
              step={CAPACITY_RULES.MULTIPLE}
              className="mb-2"
            />
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatCapacity(CAPACITY_RULES.MIN)}</span>
              <span>{formatCapacity(CAPACITY_RULES.MAX)}</span>
            </div>
            
            {validationErrors.ratedCapacity && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.ratedCapacity}</p>
            )}
            
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <div className="text-sm text-gray-700">
                <strong>System Configuration:</strong> {Math.round(formData.ratedCapacity / 325)} × 325kW modules
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Bloom Energy systems scale in 325kW increments for optimal efficiency
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reliabilityLevel">
                Reliability Level <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.reliabilityLevel?.toString()} 
                onValueChange={(value) => onFieldChange('reliabilityLevel', parseFloat(value))}
              >
                <SelectTrigger className={validationErrors.reliabilityLevel ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select reliability level" />
                </SelectTrigger>
                <SelectContent>
                  {RELIABILITY_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.reliabilityLevel && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.reliabilityLevel}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contractTerm">
                Contract Term <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.contractTerm?.toString()} 
                onValueChange={(value) => onFieldChange('contractTerm', parseInt(value))}
              >
                <SelectTrigger className={validationErrors.contractTerm ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select term length" />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20].map(term => (
                    <SelectItem key={term} value={term.toString()}>
                      {term} years
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.contractTerm && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.contractTerm}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Load Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="averageLoad">Average Load (kW)</Label>
              <Input
                id="averageLoad"
                type="number"
                placeholder="e.g., 750"
                onChange={(e) => onFieldChange('averageLoad', parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="peakLoad">Peak Load (kW)</Label>
              <Input
                id="peakLoad"
                type="number"
                placeholder="e.g., 950"
                onChange={(e) => onFieldChange('peakLoad', parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="baseLoad">Base Load (kW)</Label>
              <Input
                id="baseLoad"
                type="number"
                placeholder="e.g., 600"
                onChange={(e) => onFieldChange('baseLoad', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loadFactor">Load Factor (%)</Label>
              <Input
                id="loadFactor"
                type="number"
                placeholder="e.g., 75"
                min="0"
                max="100"
                onChange={(e) => onFieldChange('loadFactor', parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="powerQuality">Power Quality Requirements</Label>
              <Select onValueChange={(value) => onFieldChange('powerQuality', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select power quality level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High (UPS Quality)</SelectItem>
                  <SelectItem value="premium">Premium (Medical Grade)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm font-medium">✓</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-green-900">System Overview</h4>
              <div className="text-sm text-green-700 mt-1 space-y-1">
                <div>Solution: <strong>{formData.solutionType}</strong></div>
                <div>Capacity: <strong>{formatCapacity(formData.ratedCapacity)}</strong></div>
                <div>Reliability: <strong>{formData.reliabilityLevel}%</strong></div>
                <div>Term: <strong>{formData.contractTerm} years</strong></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};