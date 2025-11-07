import React from 'react';
import { ContractChatAssistant } from './ContractChatAssistant';
import { ContractFormData, ValidationError } from '../../types';

interface AIAssistantTabProps {
  formData: ContractFormData;
  validationErrors: ValidationError;
  onFieldChange: (field: keyof ContractFormData, value: any) => void;
}

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
  formData,
  validationErrors,
  onFieldChange
}) => {
  return (
    <div className="h-full">
      <ContractChatAssistant />
    </div>
  );
};

export default AIAssistantTab;