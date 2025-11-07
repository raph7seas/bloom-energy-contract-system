export const FeatureFlags = {
  AI_ASSISTANCE: true,
  DOCUMENT_UPLOAD: true,
  CONTRACT_COMPARISON: true,
  ANALYTICS_DASHBOARD: false,
  TEMPLATE_MANAGEMENT: false,
  RULES_ENGINE: false,
} as const;

export type FeatureFlag = keyof typeof FeatureFlags;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FeatureFlags[flag];
};