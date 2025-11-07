import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { ContractFormData, AIExtractionMetadata } from '../../types';
import { ReadOnlyFieldDisplay } from './ReadOnlyFieldDisplay';

interface ReadOnlyTechnicalTabProps {
  formData: ContractFormData;
  aiMetadata?: AIExtractionMetadata;
}

export const ReadOnlyTechnicalTab: React.FC<ReadOnlyTechnicalTabProps> = ({
  formData,
  aiMetadata
}) => {
  const componentTypeMap = {
    'RI': 'Renewable Integration',
    'AC': 'Advanced Controls',
    'UC': 'Utility Connections',
    'BESS': 'Battery Energy Storage',
    'Solar': 'Solar Integration',
    'Wind': 'Wind Integration'
  };

  const getFieldAiInfo = (fieldName: keyof ContractFormData) => {
    if (!aiMetadata?.isAiExtracted) return null;
    const confidence = aiMetadata.fieldConfidences[fieldName];
    return confidence ? { confidence, isAiExtracted: true } : null;
  };

  const aiInfo = getFieldAiInfo('selectedComponents');

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Technical Specifications</h2>
        <p className="text-gray-600 mt-2">
          System technical requirements and component configuration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Electrical Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyFieldDisplay
              label="Grid Parallel Voltage"
              value={formData.gridParallelVoltage}
              fieldName="gridParallelVoltage"
              aiMetadata={aiMetadata}
            />
            <ReadOnlyFieldDisplay
              label="Number of Servers"
              value={formData.numberOfServers}
              fieldName="numberOfServers"
              aiMetadata={aiMetadata}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              Selected Components
              {aiInfo && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                  AI {Math.round(aiInfo.confidence * 100)}%
                </Badge>
              )}
            </div>
            <div className={`p-3 rounded border ${
              aiInfo 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-gray-50 border-gray-300'
            }`}>
              {formData.selectedComponents && formData.selectedComponents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.selectedComponents.map((component) => (
                    <Badge key={component} variant="outline" className="bg-white">
                      {component} - {componentTypeMap[component] || component}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500">No components selected</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReadOnlyFieldDisplay
            label="Special Requirements"
            value={formData.specialRequirements || 'None specified'}
            fieldName="specialRequirements"
            aiMetadata={aiMetadata}
            className="col-span-full"
          />
        </CardContent>
      </Card>
    </div>
  );
};