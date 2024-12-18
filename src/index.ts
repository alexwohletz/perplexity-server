#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const API_KEY = process.env.PERPLEXITY_API_KEY;
if (!API_KEY) {
  throw new Error('PERPLEXITY_API_KEY environment variable is required');
}

interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  citations: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface SearchArguments {
  query: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  search_recency_filter?: 'day' | 'week' | 'month' | 'year';
}

function isSearchArguments(obj: unknown): obj is SearchArguments {
  if (typeof obj !== 'object' || obj === null) return false;
  const args = obj as Record<string, unknown>;
  
  if (typeof args.query !== 'string') return false;
  if (args.model !== undefined && typeof args.model !== 'string') return false;
  if (args.max_tokens !== undefined && typeof args.max_tokens !== 'number') return false;
  if (args.temperature !== undefined && typeof args.temperature !== 'number') return false;
  if (args.search_recency_filter !== undefined && 
      !['day', 'week', 'month', 'year'].includes(args.search_recency_filter as string)) return false;
  
  return true;
}

class PerplexityServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'perplexity-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: 'https://api.perplexity.ai',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search',
          description: 'Search using Perplexity AI',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query',
              },
              model: {
                type: 'string',
                description: 'Model to use for the search',
                default: 'llama-3.1-sonar-small-128k-online',
              },
              max_tokens: {
                type: 'number',
                description: 'Maximum number of tokens to generate',
              },
              temperature: {
                type: 'number',
                description: 'Sampling temperature',
                default: 0.2,
              },
              search_recency_filter: {
                type: 'string',
                description: 'Filter for search recency',
                enum: ['day', 'week', 'month', 'year'],
                default: 'month',
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'search') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!isSearchArguments(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid search arguments. Required: query (string)'
        );
      }

      try {
        const response = await this.axiosInstance.post<PerplexityResponse>('/chat/completions', {
          model: request.params.arguments.model || 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: 'Be precise and concise.',
            },
            {
              role: 'user',
              content: request.params.arguments.query,
            },
          ],
          max_tokens: request.params.arguments.max_tokens,
          temperature: request.params.arguments.temperature || 0.2,
          top_p: 0.9,
          search_domain_filter: ['perplexity.ai'],
          return_images: false,
          return_related_questions: false,
          search_recency_filter: request.params.arguments.search_recency_filter || 'month',
          top_k: 0,
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 1,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                answer: response.data.choices[0].message.content,
                citations: response.data.citations,
                usage: response.data.usage,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            content: [
              {
                type: 'text',
                text: `Perplexity API error: ${error.response?.data?.error || error.message}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Perplexity MCP server running on stdio');
  }
}

const server = new PerplexityServer();
server.run().catch(console.error);
