import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ContractFormData, ValidationError } from '../../types';
import { INDUSTRY_TYPES } from '../../utils/constants';

interface BasicInfoTabProps {
  formData: ContractFormData;
  validationErrors: ValidationError;
  onFieldChange: (field: keyof ContractFormData, value: any) => void;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  validationErrors,
  onFieldChange
}) => {
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
            <div>
              <Label htmlFor="customerName">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => onFieldChange('customerName', e.target.value)}
                placeholder="Enter customer company name"
                className={validationErrors.customerName ? 'border-red-500' : ''}
              />
              {validationErrors.customerName && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.customerName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="industry">Customer Industry</Label>
              <Select onValueChange={(value) => onFieldChange('industry', value)}>
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
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="siteLocation">
              Site Location <span className="text-red-500">*</span>
            </Label>
            <Input
              id="siteLocation"
              value={formData.siteLocation}
              onChange={(e) => onFieldChange('siteLocation', e.target.value)}
              placeholder="City, State (e.g., North Haven, CT)"
              className={validationErrors.siteLocation ? 'border-red-500' : ''}
            />
            {validationErrors.siteLocation && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.siteLocation}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="facilitySize">Facility Size (sq ft)</Label>
              <Input
                id="facilitySize"
                type="number"
                placeholder="e.g., 50000"
                onChange={(e) => onFieldChange('facilitySize', parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="employees">Number of Employees</Label>
              <Input
                id="employees"
                type="number"
                placeholder="e.g., 250"
                onChange={(e) => onFieldChange('employees', parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="operatingHours">Operating Hours/Day</Label>
              <Input
                id="operatingHours"
                type="number"
                placeholder="e.g., 16"
                max="24"
                onChange={(e) => onFieldChange('operatingHours', parseInt(e.target.value) || 24)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderDate">
                Order Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="orderDate"
                type="date"
                value={formData.orderDate}
                onChange={(e) => onFieldChange('orderDate', e.target.value)}
                className={validationErrors.orderDate ? 'border-red-500' : ''}
              />
              {validationErrors.orderDate && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.orderDate}</p>
              )}
            </div>

            <div>
              <Label htmlFor="effectiveDate">
                Effective Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="effectiveDate"
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => onFieldChange('effectiveDate', e.target.value)}
                className={validationErrors.effectiveDate ? 'border-red-500' : ''}
              />
              {validationErrors.effectiveDate && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.effectiveDate}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                When the contract terms become active
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="contactPerson">Primary Contact</Label>
            <Input
              id="contactPerson"
              placeholder="Contact name and role"
              onChange={(e) => onFieldChange('contactPerson', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="contact@company.com"
                onChange={(e) => onFieldChange('contactEmail', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                placeholder="(555) 123-4567"
                onChange={(e) => onFieldChange('contactPhone', e.target.value)}
              />
            </div>
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