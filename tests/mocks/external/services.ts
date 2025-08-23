import { vi } from 'vitest';

// Anthropic SDK Types
export interface MockAnthropicMessage {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  stop_reason?: string;
}

export interface MockAnthropicCreateParams {
  model: string;
  max_tokens: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  system?: string;
}

// OpenAI SDK Types
export interface MockOpenAIEmbedding {
  object: 'embedding';
  embedding: number[];
  index: number;
}

export interface MockOpenAIEmbeddingResponse {
  object: 'list';
  data: MockOpenAIEmbedding[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface MockOpenAIChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Resend Types
export interface MockResendEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  created_at: string;
}

export interface MockResendSendResponse {
  data: MockResendEmail | null;
  error: any;
}

// External services configuration
interface ExternalServicesMockConfig {
  anthropic: {
    shouldResolve: boolean;
    resolveValue?: MockAnthropicMessage;
    rejectValue?: any;
    delay?: number;
  };
  openai: {
    embeddings: {
      shouldResolve: boolean;
      resolveValue?: MockOpenAIEmbeddingResponse;
      rejectValue?: any;
      delay?: number;
    };
    chat: {
      shouldResolve: boolean;
      resolveValue?: MockOpenAIChatCompletion;
      rejectValue?: any;
      delay?: number;
    };
  };
  resend: {
    shouldResolve: boolean;
    resolveValue?: MockResendSendResponse;
    rejectValue?: any;
    delay?: number;
  };
}

class ExternalServicesMocks {
  private _config: ExternalServicesMockConfig = {
    anthropic: {
      shouldResolve: true,
      resolveValue: undefined,
      delay: 0
    },
    openai: {
      embeddings: {
        shouldResolve: true,
        resolveValue: undefined,
        delay: 0
      },
      chat: {
        shouldResolve: true,
        resolveValue: undefined,
        delay: 0
      }
    },
    resend: {
      shouldResolve: true,
      resolveValue: undefined,
      delay: 0
    }
  };

  // Configuration methods
  configureAnthropic(config: Partial<ExternalServicesMockConfig['anthropic']>): void {
    this._config.anthropic = { ...this._config.anthropic, ...config };
  }

  configureOpenAIEmbeddings(config: Partial<ExternalServicesMockConfig['openai']['embeddings']>): void {
    this._config.openai.embeddings = { ...this._config.openai.embeddings, ...config };
  }

  configureOpenAIChat(config: Partial<ExternalServicesMockConfig['openai']['chat']>): void {
    this._config.openai.chat = { ...this._config.openai.chat, ...config };
  }

  configureResend(config: Partial<ExternalServicesMockConfig['resend']>): void {
    this._config.resend = { ...this._config.resend, ...config };
  }

  reset(): void {
    this._config = {
      anthropic: { shouldResolve: true, delay: 0 },
      openai: {
        embeddings: { shouldResolve: true, delay: 0 },
        chat: { shouldResolve: true, delay: 0 }
      },
      resend: { shouldResolve: true, delay: 0 }
    };
  }

  // Helper method to execute with config
  private async executeWithConfig<T>(
    configKey: 'anthropic' | 'resend' | any,
    defaultValue: T,
    configPath?: string
  ): Promise<T> {
    const config = configPath 
      ? configKey.split('.').reduce((obj: any, key: string) => obj?.[key], this._config)
      : this._config[configKey as keyof ExternalServicesMockConfig];

    if (config?.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config?.shouldResolve === false) {
      throw config.rejectValue || new Error(`Mock error for ${configKey}`);
    }

    return config?.resolveValue !== undefined ? config.resolveValue : defaultValue;
  }

  // Anthropic SDK Mocks
  createAnthropicMessage = vi.fn(async (params: MockAnthropicCreateParams): Promise<MockAnthropicMessage> => {
    return this.executeWithConfig('anthropic', {
      id: 'msg_test_id',
      type: 'message' as const,
      role: 'assistant' as const,
      model: params.model || 'claude-3-5-sonnet-20241022',
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          companies: [],
          metadata: {
            processingTime: 1000,
            tokenCount: 100,
            modelVersion: params.model || 'claude-3-5-sonnet-20241022'
          }
        })
      }],
      usage: {
        input_tokens: 100,
        output_tokens: 50
      },
      stop_reason: 'end_turn'
    });
  });

  // OpenAI SDK Mocks
  createOpenAIEmbedding = vi.fn(async (params: { input: string | string[]; model: string }): Promise<MockOpenAIEmbeddingResponse> => {
    const inputs = Array.isArray(params.input) ? params.input : [params.input];
    
    return this.executeWithConfig('openai.embeddings', {
      object: 'list' as const,
      data: inputs.map((_, index) => ({
        object: 'embedding' as const,
        embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5),
        index
      })),
      model: params.model || 'text-embedding-3-small',
      usage: {
        prompt_tokens: inputs.length * 10,
        total_tokens: inputs.length * 10
      }
    });
  });

  createOpenAIChatCompletion = vi.fn(async (params: any): Promise<MockOpenAIChatCompletion> => {
    return this.executeWithConfig('openai.chat', {
      id: 'chatcmpl-test',
      object: 'chat.completion' as const,
      created: Date.now(),
      model: params.model || 'gpt-4-turbo-preview',
      choices: [{
        index: 0,
        message: {
          role: 'assistant' as const,
          content: 'Test response'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    });
  });

  // Resend Mocks
  sendEmail = vi.fn(async (params: {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
  }): Promise<MockResendSendResponse> => {
    return this.executeWithConfig('resend', {
      data: {
        id: 'email-123',
        from: params.from,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        created_at: new Date().toISOString()
      },
      error: null
    });
  });

  getEmail = vi.fn(async (id: string) => {
    return {
      data: {
        id,
        status: 'delivered',
        created_at: new Date().toISOString(),
        last_event: 'delivered'
      }
    };
  });

  // Utility methods for common test scenarios
  mockAnthropicSuccess(responseText?: string): void {
    this.configureAnthropic({
      shouldResolve: true,
      resolveValue: {
        id: 'msg_test_success',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-5-sonnet-20241022',
        content: [{
          type: 'text',
          text: responseText || JSON.stringify({
            companies: [
              {
                name: 'Test Company',
                description: 'A test company',
                website: 'https://test.com',
                context: 'Mentioned in newsletter'
              }
            ],
            metadata: {
              processingTime: 1200,
              tokenCount: 150,
              modelVersion: 'claude-3-5-sonnet-20241022'
            }
          })
        }],
        usage: {
          input_tokens: 150,
          output_tokens: 75
        }
      }
    });
  }

  mockAnthropicError(error?: any): void {
    this.configureAnthropic({
      shouldResolve: false,
      rejectValue: error || new Error('Anthropic API error')
    });
  }

  mockOpenAIEmbeddingsSuccess(embeddings?: number[][]): void {
    this.configureOpenAIEmbeddings({
      shouldResolve: true,
      resolveValue: {
        object: 'list',
        data: embeddings ? embeddings.map((embedding, index) => ({
          object: 'embedding',
          embedding,
          index
        })) : [{
          object: 'embedding',
          embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5),
          index: 0
        }],
        model: 'text-embedding-3-small',
        usage: {
          prompt_tokens: 10,
          total_tokens: 10
        }
      }
    });
  }

  mockOpenAIEmbeddingsError(error?: any): void {
    this.configureOpenAIEmbeddings({
      shouldResolve: false,
      rejectValue: error || new Error('OpenAI API error')
    });
  }

  mockResendSuccess(emailId?: string): void {
    this.configureResend({
      shouldResolve: true,
      resolveValue: {
        data: {
          id: emailId || 'email-success-123',
          from: 'test@example.com',
          to: ['recipient@example.com'],
          subject: 'Test Email',
          created_at: new Date().toISOString()
        },
        error: null
      }
    });
  }

  mockResendError(error?: any): void {
    this.configureResend({
      shouldResolve: false,
      rejectValue: error || new Error('Resend API error')
    });
  }

  // Reset all mocks
  resetAllMocks(): void {
    Object.getOwnPropertyNames(this)
      .filter(name => typeof (this as any)[name]?.mockReset === 'function')
      .forEach(name => (this as any)[name].mockReset());
    
    this.reset();
  }
}

// Export singleton instance
export const externalServicesMocks = new ExternalServicesMocks();

// Export individual mocks for direct use
export const {
  createAnthropicMessage,
  createOpenAIEmbedding,
  createOpenAIChatCompletion,
  sendEmail,
  getEmail
} = externalServicesMocks;

// Mock implementations for vi.mock()
export const anthropicMocks = {
  default: vi.fn(() => ({
    messages: {
      create: createAnthropicMessage
    }
  })),
  Anthropic: vi.fn(() => ({
    messages: {
      create: createAnthropicMessage
    }
  }))
};

export const openaiMocks = {
  default: vi.fn(() => ({
    embeddings: {
      create: createOpenAIEmbedding
    },
    chat: {
      completions: {
        create: createOpenAIChatCompletion
      }
    }
  })),
  OpenAI: vi.fn(() => ({
    embeddings: {
      create: createOpenAIEmbedding
    },
    chat: {
      completions: {
        create: createOpenAIChatCompletion
      }
    }
  }))
};

export const resendMocks = {
  Resend: vi.fn(() => ({
    emails: {
      send: sendEmail,
      get: getEmail
    },
    domains: {
      list: vi.fn().mockResolvedValue({ data: [] })
    },
    apiKeys: {
      list: vi.fn().mockResolvedValue({ data: [] })
    }
  })),
  default: vi.fn(() => ({
    emails: {
      send: sendEmail,
      get: getEmail
    }
  }))
};