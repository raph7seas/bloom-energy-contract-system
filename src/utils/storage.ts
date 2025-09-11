/**
 * LocalStorage utility functions with error handling
 * Following the existing localStorage pattern from the monolithic component
 */

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.error(`Failed to load from localStorage with key: ${key}`, error);
    return defaultValue;
  }
};

export const saveToLocalStorage = <T>(key: string, data: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Failed to save to localStorage with key: ${key}`, error);
    return false;
  }
};

export const removeFromLocalStorage = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove from localStorage with key: ${key}`, error);
    return false;
  }
};

export const clearAllLocalStorage = (): boolean => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Failed to clear localStorage', error);
    return false;
  }
};

// Bloom Energy specific storage keys
export const STORAGE_KEYS = {
  CONTRACTS: 'bloom_contracts',
  LEARNED_RULES: 'bloom_learned_rules',
  CONTRACT_FORM_DATA: 'bloom_contract_form_data',
  AI_MESSAGES: 'bloom_ai_messages',
  USER_PREFERENCES: 'bloom_user_preferences',
  TEMPLATES: 'bloom_contract_templates',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];