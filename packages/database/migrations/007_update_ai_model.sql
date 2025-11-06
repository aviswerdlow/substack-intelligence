-- Update default Anthropic model to the current Claude Sonnet release
ALTER TABLE user_settings
  ALTER COLUMN ai_settings
  SET DEFAULT '{
    "provider": "anthropic",
    "model": "claude-sonnet-4-5",
    "temperature": 0.7,
    "maxTokens": 4096,
    "enableEnrichment": true
  }'::jsonb;

-- Migrate any stored settings that still reference deprecated Claude models
UPDATE user_settings
SET ai_settings = jsonb_set(
    coalesce(ai_settings, '{}'::jsonb),
    '{model}',
    '"claude-sonnet-4-5"'::jsonb,
    true
  )
WHERE ai_settings->>'model' IN (
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-latest'
);
