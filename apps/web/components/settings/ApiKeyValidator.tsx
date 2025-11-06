'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@radix-ui/react-progress';
import {
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  TestTube,
  AlertTriangle,
  Info,
  Zap,
  DollarSign,
  Shield,
  Key,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useApiKeyValidation } from '@/hooks/useSettingsHooks';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@radix-ui/react-popover';

interface ApiKeyValidatorProps {
  provider: 'anthropic' | 'openai';
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  showTestButton?: boolean;
  showMetrics?: boolean;
  className?: string;
}

export function ApiKeyValidator({
  provider,
  value,
  onChange,
  onValidationChange,
  showTestButton = true,
  showMetrics = true,
  className,
}: ApiKeyValidatorProps) {
  const { validateApiKey, getValidationStatus } = useApiKeyValidation();
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    models?: string[];
    rateLimit?: { limit: number; remaining: number; reset: Date };
    usage?: { credits: number; spent: number };
    error?: string;
  } | null>(null);
  
  // Debounced validation
  useEffect(() => {
    if (!value || value.length < 20) {
      setValidationResult(null);
      onValidationChange?.(false);
      return;
    }
    
    const timer = setTimeout(() => {
      handleValidate();
    }, 1000); // Validate after 1 second of no typing
    
    return () => clearTimeout(timer);
  }, [value]);
  
  const handleValidate = async () => {
    if (!value) return;
    
    setIsValidating(true);
    try {
      const response = await axios.post('/api/settings/validate-api-key', {
        provider,
        apiKey: value,
      });
      
      setValidationResult({
        isValid: true,
        models: response.data.models,
        rateLimit: response.data.rateLimit,
        usage: response.data.usage,
      });
      
      onValidationChange?.(true);
    } catch (error: any) {
      setValidationResult({
        isValid: false,
        error: error.response?.data?.error || 'Invalid API key',
      });
      
      onValidationChange?.(false);
    } finally {
      setIsValidating(false);
    }
  };
  
  const handleTestConnection = async () => {
    setIsValidating(true);
    
    try {
      const response = await axios.post('/api/settings/test-api-connection', {
        provider,
        apiKey: value,
      });
      
      toast({
        title: 'Connection successful',
        description: `Successfully connected to ${provider} API`,
      });
      
      setValidationResult(prev => ({
        ...prev!,
        isValid: true,
        models: response.data.models,
      }));
    } catch (error: any) {
      toast({
        title: 'Connection failed',
        description: error.response?.data?.error || 'Failed to connect to API',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };
  
  const maskApiKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return key;
    return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`;
  };
  
  const copyApiKey = () => {
    navigator.clipboard.writeText(value);
    toast({
      title: 'Copied to clipboard',
      description: 'API key copied securely',
    });
  };
  
  const getProviderInfo = () => {
    if (provider === 'anthropic') {
      return {
        name: 'Anthropic',
        color: 'purple',
        docsUrl: 'https://console.anthropic.com/account/keys',
        keyFormat: 'sk-ant-api03-...',
        models: ['Claude Sonnet 4.5', 'Claude 3 Opus', 'Claude 3 Haiku'],
      };
    } else {
      return {
        name: 'OpenAI',
        color: 'green',
        docsUrl: 'https://platform.openai.com/api-keys',
        keyFormat: 'sk-...',
        models: ['GPT-4 Turbo', 'GPT-4', 'GPT-3.5 Turbo'],
      };
    }
  };
  
  const providerInfo = getProviderInfo();
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* API Key Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            {providerInfo.name} API Key
          </label>
          <a
            href={providerInfo.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Get API Key
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        
        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={providerInfo.keyFormat}
            className={cn(
              'pr-24',
              validationResult?.isValid && 'border-green-500 focus:ring-green-500',
              validationResult?.error && 'border-red-500 focus:ring-red-500'
            )}
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Validation status icon */}
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : validationResult?.isValid ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : validationResult?.error ? (
              <X className="h-4 w-4 text-red-500" />
            ) : null}
            
            {/* Show/Hide button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowKey(!showKey)}
              type="button"
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            
            {/* Copy button */}
            {value && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={copyApiKey}
                type="button"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Validation error message */}
        {validationResult?.error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {validationResult.error}
          </p>
        )}
        
        {/* Key format hint */}
        {!value && (
          <p className="text-xs text-gray-500">
            Format: {providerInfo.keyFormat}
          </p>
        )}
      </div>
      
      {/* Test connection button */}
      {showTestButton && value && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={isValidating || !value}
          className="w-full"
        >
          {isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing connection...
            </>
          ) : (
            <>
              <TestTube className="mr-2 h-4 w-4" />
              Test Connection
            </>
          )}
        </Button>
      )}
      
      {/* Validation results and metrics */}
      {showMetrics && validationResult?.isValid && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  API Key Validated
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Available models */}
                {validationResult.models && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-600">Available Models:</p>
                    <div className="flex flex-wrap gap-1">
                      {validationResult.models.map((model) => (
                        <Badge key={model} variant="secondary" className="text-xs">
                          {model}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Rate limits */}
                {validationResult.rateLimit && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-600">Rate Limits:</p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-orange-500" />
                        <span>{validationResult.rateLimit.remaining}/{validationResult.rateLimit.limit}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 text-blue-500" />
                        <span>Resets in 1h</span>
                      </div>
                    </div>
                    <Progress 
                      value={(validationResult.rateLimit.remaining / validationResult.rateLimit.limit) * 100}
                      className="h-1"
                    />
                  </div>
                )}
                
                {/* Usage and costs */}
                {validationResult.usage && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-600">Usage & Costs:</p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-green-500" />
                        <span>${validationResult.usage.spent.toFixed(2)} spent</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Key className="h-3 w-3 text-purple-500" />
                        <span>{validationResult.usage.credits} credits</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// Batch API key validator for multiple providers
export function MultiProviderApiValidator({
  providers,
  className,
}: {
  providers: Array<{
    provider: 'anthropic' | 'openai';
    value: string;
    onChange: (value: string) => void;
  }>;
  className?: string;
}) {
  const [validationResults, setValidationResults] = useState<Record<string, boolean>>({});
  
  const allValid = providers.every(p => validationResults[p.provider]);
  
  return (
    <div className={cn('space-y-6', className)}>
      {providers.map((config) => (
        <ApiKeyValidator
          key={config.provider}
          provider={config.provider}
          value={config.value}
          onChange={config.onChange}
          onValidationChange={(isValid) => {
            setValidationResults(prev => ({
              ...prev,
              [config.provider]: isValid,
            }));
          }}
        />
      ))}
      
      {/* Overall status */}
      {Object.keys(validationResults).length === providers.length && (
        <div className={cn(
          'p-3 rounded-lg text-sm',
          allValid ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
        )}>
          {allValid ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              All API keys validated successfully
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Some API keys need validation
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// API Key cost estimator
export function ApiCostEstimator({
  provider,
  settings,
  className,
}: {
  provider: 'anthropic' | 'openai';
  settings: {
    maxTokens: number;
    estimatedRequestsPerDay: number;
  };
  className?: string;
}) {
  const calculateCost = () => {
    const pricing = {
      anthropic: {
        'claude-sonnet-4-5': { input: 0.003, output: 0.015 },
        'claude-3-opus': { input: 0.015, output: 0.075 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      },
      openai: {
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      },
    };
    
    // Calculate estimated daily cost
    const avgTokensPerRequest = settings.maxTokens * 0.7; // Assume 70% usage
    const requestsPerMonth = settings.estimatedRequestsPerDay * 30;
    
    // This is a simplified calculation
    const costPerRequest = 0.001; // Placeholder
    const monthlyCost = costPerRequest * requestsPerMonth;
    
    return {
      daily: (monthlyCost / 30).toFixed(2),
      monthly: monthlyCost.toFixed(2),
      yearly: (monthlyCost * 12).toFixed(2),
    };
  };
  
  const costs = calculateCost();
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Estimated API Costs
        </CardTitle>
        <CardDescription className="text-xs">
          Based on current settings and usage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500">Daily</p>
            <p className="font-medium">${costs.daily}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Monthly</p>
            <p className="font-medium">${costs.monthly}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Yearly</p>
            <p className="font-medium">${costs.yearly}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
