import React from 'react';
import { Badge } from '../ui/badge';
import { Brain } from 'lucide-react';
import { ContractFormData, AIExtractionMetadata } from '../../types';

interface ReadOnlyFieldDisplayProps {
  label: string;
  value: string | number | boolean | undefined;
  fieldName: keyof ContractFormData;
  aiMetadata?: AIExtractionMetadata;
  unit?: string;
  formatValue?: (value: any) => string;
  className?: string;
}

export const ReadOnlyFieldDisplay: React.FC<ReadOnlyFieldDisplayProps> = ({
  label,
  value,
  fieldName,
  aiMetadata,
  unit,
  formatValue,
  className = ""
}) => {
  // Helper function to check if field was AI extracted and get confidence
  const getFieldAiInfo = () => {
    if (!aiMetadata?.isAiExtracted) return null;
    const confidence = aiMetadata.fieldConfidences[fieldName];
    return confidence ? { confidence, isAiExtracted: true } : null;
  };

  const aiInfo = getFieldAiInfo();
  
  // Format the display value
  let displayValue = '';
  if (value !== undefined && value !== null) {
    if (formatValue) {
      displayValue = formatValue(value);
    } else if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else if (typeof value === 'number') {
      displayValue = value.toLocaleString();
    } else {
      displayValue = String(value);
    }
    
    if (unit) {
      displayValue += ` ${unit}`;
    }
  } else {
    displayValue = '—';
  }

  return (
    <div className={className}>
      <div className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
        {label}
        {aiInfo && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
            <Brain className="h-2 w-2 mr-1" />
            AI {Math.round(aiInfo.confidence * 100)}%
          </Badge>
        )}
      </div>
      <div className={`text-gray-900 ${
        aiInfo 
          ? 'bg-blue-50 px-3 py-2 rounded border border-blue-200' 
          : 'bg-gray-50 px-3 py-2 rounded border'
      }`}>
        {displayValue}
      </div>
    </div>
  );
};