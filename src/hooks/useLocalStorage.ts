import { useState, useCallback, useEffect } from 'react';
import { loadFromLocalStorage, saveToLocalStorage, StorageKey } from '../utils/storage';

/**
 * Custom hook for localStorage with React state management
 * Provides type-safe localStorage operations with automatic state updates
 */

export const useLocalStorage = <T>(
  key: StorageKey,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] => {
  // Initialize state from localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    return loadFromLocalStorage(key, initialValue);
  });

  // Update both state and localStorage
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      // Allow value to be a function for functional updates
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save to state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      saveToLocalStorage(key, valueToStore);
      
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Clear the stored value
  const clearValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, clearValue];
};

/**
 * Hook for managing multiple localStorage items
 */
export const useLocalStorageMultiple = <T extends Record<string, any>>(
  keys: Record<keyof T, StorageKey>,
  initialValues: T
) => {
  const [values, setValues] = useState<T>(() => {
    const loaded = {} as T;
    
    for (const [prop, key] of Object.entries(keys)) {
      loaded[prop as keyof T] = loadFromLocalStorage(key, initialValues[prop as keyof T]);
    }
    
    return loaded;
  });

  const updateValue = useCallback(<K extends keyof T>(
    prop: K,
    value: T[K] | ((prev: T[K]) => T[K])
  ) => {
    const key = keys[prop];
    const newValue = value instanceof Function ? value(values[prop]) : value;
    
    // Update state
    setValues(prev => ({
      ...prev,
      [prop]: newValue
    }));
    
    // Save to localStorage
    saveToLocalStorage(key, newValue);
  }, [keys, values]);

  const updateMultiple = useCallback((updates: Partial<T>) => {
    setValues(prev => {
      const newValues = { ...prev, ...updates };
      
      // Save each updated value to localStorage
      for (const [prop, value] of Object.entries(updates)) {
        const key = keys[prop as keyof T];
        if (key) {
          saveToLocalStorage(key, value);
        }
      }
      
      return newValues;
    });
  }, [keys]);

  const clearAll = useCallback(() => {
    setValues(initialValues);
    
    // Clear from localStorage
    for (const key of Object.values(keys)) {
      localStorage.removeItem(key);
    }
  }, [keys, initialValues]);

  return {
    values,
    updateValue,
    updateMultiple,
    clearAll
  };
};

/**
 * Hook for persistent form state
 * Automatically saves and restores form data
 */
export const usePersistedForm = <T extends Record<string, any>>(
  formKey: StorageKey,
  defaultValues: T,
  autoSave = true
) => {
  const [formData, setFormData, clearForm] = useLocalStorage(formKey, defaultValues);
  const [isDirty, setIsDirty] = useState(false);

  const updateForm = useCallback((updates: Partial<T>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
    setIsDirty(true);
  }, [setFormData]);

  const updateField = useCallback(<K extends keyof T>(
    field: K,
    value: T[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  }, [setFormData]);

  const resetForm = useCallback(() => {
    setFormData(defaultValues);
    setIsDirty(false);
  }, [setFormData, defaultValues]);

  const saveForm = useCallback(() => {
    // Form is already saved via setFormData
    setIsDirty(false);
  }, []);

  // Auto-save with debounce if enabled
  useEffect(() => {
    if (autoSave && isDirty) {
      const timer = setTimeout(() => {
        setIsDirty(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [formData, isDirty, autoSave]);

  return {
    formData,
    isDirty,
    updateForm,
    updateField,
    resetForm,
    saveForm,
    clearForm
  };
};

/**
 * Hook for localStorage with validation
 */
export const useValidatedStorage = <T>(
  key: StorageKey,
  initialValue: T,
  validator: (value: any) => value is T
) => {
  const [value, setValue, clearValue] = useLocalStorage(key, initialValue);
  const [isValid, setIsValid] = useState(true);

  const setValidatedValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const valueToValidate = newValue instanceof Function ? newValue(value) : newValue;
    
    if (validator(valueToValidate)) {
      setValue(valueToValidate);
      setIsValid(true);
    } else {
      console.warn(`Invalid value for localStorage key "${key}":`, valueToValidate);
      setIsValid(false);
    }
  }, [key, value, setValue, validator]);

  return [value, setValidatedValue, clearValue, isValid] as const;
};