import { useCallback, useEffect, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { ValidationError } from '@/lib/validation/settings-schemas';

export function useSettingsValidation(tab?: string) {
  const { settings, validateTab, validateAll } = useSettings();
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Validate on settings change
  useEffect(() => {
    setIsValidating(true);
    
    const timer = setTimeout(() => {
      if (tab) {
        const tabErrors = validateTab(tab);
        setErrors(tabErrors);
      } else {
        const allErrors = validateAll();
        setErrors(Object.values(allErrors).flat());
      }
      setIsValidating(false);
    }, 300); // Debounce validation

    return () => clearTimeout(timer);
  }, [settings, tab, validateTab, validateAll]);

  // Get errors for a specific field
  const getFieldError = useCallback((fieldPath: string): string | undefined => {
    const error = errors.find(e => e.field === fieldPath);
    return error?.message;
  }, [errors]);

  // Check if a field has an error
  const hasFieldError = useCallback((fieldPath: string): boolean => {
    return errors.some(e => e.field === fieldPath);
  }, [errors]);

  // Get all errors for a section
  const getSectionErrors = useCallback((sectionPath: string): ValidationError[] => {
    return errors.filter(e => e.field.startsWith(sectionPath));
  }, [errors]);

  // Check if the current tab/settings are valid
  const isValid = errors.length === 0 && !isValidating;

  return {
    errors,
    isValidating,
    isValid,
    getFieldError,
    hasFieldError,
    getSectionErrors,
  };
}

// Hook for individual field validation
export function useFieldValidation(fieldPath: string, tab?: string) {
  const validation = useSettingsValidation(tab);
  
  return {
    error: validation.getFieldError(fieldPath),
    hasError: validation.hasFieldError(fieldPath),
    isValidating: validation.isValidating,
  };
}