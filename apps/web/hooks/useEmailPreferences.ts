import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface EmailPreferences {
  newsletter: boolean;
  new_posts: boolean;
  comments: boolean;
  marketing: boolean;
  product_updates: boolean;
  digest_frequency: string;
  preferred_format: 'html' | 'text' | 'both';
  timezone: string;
  unsubscribe_token?: string;
}

interface PreferencesResponse {
  success: boolean;
  preferences: EmailPreferences;
}

const fetchPreferences = async (): Promise<PreferencesResponse> => {
  const response = await fetch('/api/email/preferences');
  if (!response.ok) {
    throw new Error('Failed to load email preferences');
  }
  return response.json();
};

const updatePreferencesRequest = async (payload: Partial<EmailPreferences>): Promise<PreferencesResponse> => {
  const response = await fetch('/api/email/preferences', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to save preferences' }));
    throw new Error(error?.error || 'Failed to save preferences');
  }

  return response.json();
};

export function useEmailPreferences() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['email-preferences'],
    queryFn: fetchPreferences,
  });

  const mutation = useMutation({
    mutationFn: updatePreferencesRequest,
    onSuccess: data => {
      queryClient.setQueryData(['email-preferences'], data);
    },
  });

  return {
    preferences: query.data?.preferences,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    error: query.error || mutation.error,
    updatePreferences: mutation.mutateAsync,
  };
}
