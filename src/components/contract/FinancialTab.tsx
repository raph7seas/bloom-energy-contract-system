import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { ContractFormData, ValidationError } from '../../types';
import { calculateYearlyRates, calculateTotalContractValue, formatCurrency, formatCurrencyDetailed } from '../../utils/calculations';
import { FINANCIAL_RULES } from '../../utils/constants';

interface FinancialTabProps {
  formData: ContractFormData;
  validationErrors: ValidationError;
  onFieldChange: (field: keyof ContractFormData, value: any) => void;
}

export const FinancialTab: React.FC<FinancialTabProps> = ({
  formData,
  validationErrors,
  onFieldChange
}) => {
  // Calculate derived financial values
  const yearlyRates = useMemo(() => {
    return calculateYearlyRates(
      formData.baseRate,
      formData.annualEscalation,
      formData.contractTerm
    );
  }, [formData.baseRate, formData.annualEscalation, formData.contractTerm]);

  const totalContractValue = useMemo(() => {
    return calculateTotalContractValue(formData.ratedCapacity, yearlyRates);
  }, [formData.ratedCapacity, yearlyRates]);

  const monthlyPaymentYear1 = useMemo(() => {
    return (formData.ratedCapacity * formData.baseRate) / 12;
  }, [formData.ratedCapacity, formData.baseRate]);

  const handleEscalationChange = (value: number[]) => {
    onFieldChange('annualEscalation', value[0]);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Financial Parameters</h2>
        <p className="text-gray-600 mt-2">
          Configure pricing, escalation, and additional financial terms
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Base Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="baseRate">
                Base Rate ($/kW) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="baseRate"
                type="number"
                value={formData.baseRate}
                onChange={(e) => onFieldChange('baseRate', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 65.00"
                step="0.01"
                className={validationErrors.baseRate ? 'border-red-500' : ''}
              />
              {validationErrors.baseRate && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.baseRate}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Range: ${FINANCIAL_RULES.BASE_RATE.MIN} - ${FINANCIAL_RULES.BASE_RATE.MAX}/kW
              </p>
            </div>

            <div>
              <Label htmlFor="microgridAdder">Microgrid Adder ($/kW)</Label>
              <Input
                id="microgridAdder"
                type="number"
                value={formData.microgridAdder}
                onChange={(e) => onFieldChange('microgridAdder', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 8.50"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">
                Additional cost for microgrid functionality
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>
                Annual Escalation <span className="text-red-500">*</span>
              </Label>
              <Badge variant="outline">
                {formData.annualEscalation.toFixed(1)}%
              </Badge>
            </div>
            
            <Slider
              value={[formData.annualEscalation]}
              onValueChange={handleEscalationChange}
              min={FINANCIAL_RULES.ESCALATION.MIN}
              max={FINANCIAL_RULES.ESCALATION.MAX}
              step={0.1}
              className="mb-2"
            />
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>{FINANCIAL_RULES.ESCALATION.MIN}%</span>
              <span>{FINANCIAL_RULES.ESCALATION.MAX}%</span>
            </div>
            
            {validationErrors.annualEscalation && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.annualEscalation}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Costs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="thermalCycleFee">Thermal Cycle Fee ($)</Label>
              <Input
                id="thermalCycleFee"
                type="number"
                value={formData.thermalCycleFee}
                onChange={(e) => onFieldChange('thermalCycleFee', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 1000"
                step="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Fee for excessive system cycling
              </p>
            </div>

            <div>
              <Label htmlFor="electricalBudget">Electrical Budget ($)</Label>
              <Input
                id="electricalBudget"
                type="number"
                value={formData.electricalBudget}
                onChange={(e) => onFieldChange('electricalBudget', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 650000"
                step="1000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Budget for electrical infrastructure
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="commissioningAllowance">Commissioning Allowance ($)</Label>
            <Input
              id="commissioningAllowance"
              type="number"
              value={formData.commissioningAllowance}
              onChange={(e) => onFieldChange('commissioningAllowance', parseFloat(e.target.value) || 0)}
              placeholder="e.g., 20000"
              step="1000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Allowance for system commissioning and startup
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Metrics */}
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Year 1 Monthly Payment</div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(monthlyPaymentYear1)}
                </div>
                <div className="text-xs text-green-600">
                  {formatCurrencyDetailed(formData.baseRate)}/kW × {formData.ratedCapacity}kW ÷ 12
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Total Contract Value</div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(totalContractValue)}
                </div>
                <div className="text-xs text-green-600">
                  Over {formData.contractTerm} years with {formData.annualEscalation}% escalation
                </div>
              </div>
            </div>

            {/* Rate Progression */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Rate Progression</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {yearlyRates.slice(0, 10).map((rate, index) => (
                  <div key={rate.year} className="flex justify-between items-center py-1 px-2 rounded bg-gray-50">
                    <span className="text-sm text-gray-600">Year {rate.year}</span>
                    <span className="text-sm font-medium">
                      ${rate.rate}/kW
                    </span>
                  </div>
                ))}
                {yearlyRates.length > 10 && (
                  <div className="text-center text-xs text-gray-500">
                    ... and {yearlyRates.length - 10} more years
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500">First Year Rate</div>
                <div className="font-semibold">${yearlyRates[0]?.rate}/kW</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Final Year Rate</div>
                <div className="font-semibold">${yearlyRates[yearlyRates.length - 1]?.rate}/kW</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Average Rate</div>
                <div className="font-semibold">
                  ${(yearlyRates.reduce((sum, rate) => sum + rate.amount, 0) / yearlyRates.length).toFixed(2)}/kW
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Effective Rate</div>
                <div className="font-semibold">
                  ${(totalContractValue / (formData.ratedCapacity * formData.contractTerm * 12)).toFixed(2)}/kW
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="invoiceFrequency">Invoice Frequency</Label>
              <select 
                id="invoiceFrequency"
                className="w-full p-2 border border-gray-300 rounded-md"
                onChange={(e) => onFieldChange('invoiceFrequency', e.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>

            <div>
              <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
              <Input
                id="paymentTerms"
                type="number"
                defaultValue="30"
                placeholder="e.g., 30"
                onChange={(e) => onFieldChange('paymentTerms', parseInt(e.target.value) || 30)}
              />
            </div>

            <div>
              <Label htmlFor="latePaymentFee">Late Payment Fee (%)</Label>
              <Input
                id="latePaymentFee"
                type="number"
                step="0.1"
                placeholder="e.g., 1.5"
                onChange={(e) => onFieldChange('latePaymentFee', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};