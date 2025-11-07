export interface FeatureFlags {
  enableAIAssistant: boolean;
  enableRulesExtraction: boolean;
  enableManagementPlatform: boolean;
  enableTextractOCR: boolean;
  enableRealTimeUpdates: boolean;
  enableAdvancedReporting: boolean;
  enableWebhooks: boolean;
  enableContractComparison: boolean;
  enableBulkOperations: boolean;
  enableAuditTrail: boolean;
}

const defaultFlags: FeatureFlags = {
  enableAIAssistant: true,
  enableRulesExtraction: true,
  enableManagementPlatform: true,
  enableTextractOCR: true,
  enableRealTimeUpdates: true,
  enableAdvancedReporting: true,
  enableWebhooks: true,
  enableContractComparison: true,
  enableBulkOperations: false,
  enableAuditTrail: true,
};

export const getFeatureFlags = (): FeatureFlags => {
  const savedFlags = localStorage.getItem('featureFlags');
  if (savedFlags) {
    try {
      return { ...defaultFlags, ...JSON.parse(savedFlags) };
    } catch {
      return defaultFlags;
    }
  }
  return defaultFlags;
};

export const setFeatureFlag = (flag: keyof FeatureFlags, value: boolean): void => {
  const currentFlags = getFeatureFlags();
  const updatedFlags = { ...currentFlags, [flag]: value };
  localStorage.setItem('featureFlags', JSON.stringify(updatedFlags));
};

export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  return getFeatureFlags()[flag];
};