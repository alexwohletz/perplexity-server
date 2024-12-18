# perplexity-server MCP Server

An MCP server that provides access to Perplexity AI's API for performing AI-powered searches with web citations.

## Features

### Tools
- `search` - Perform searches using Perplexity AI
  - Required parameters:
    - `query` (string): The search query to perform
  - Optional parameters:
    - `model` (string): Model to use for the search (default: 'llama-3.1-sonar-small-128k-online')
    - `max_tokens` (number): Maximum number of tokens to generate
    - `temperature` (number): Sampling temperature (default: 0.2)
    - `search_recency_filter` (string): Filter for search recency ('day', 'week', 'month', 'year'; default: 'month')
  - Returns:
    - Answer: The AI-generated response
    - Citations: List of web sources used
    - Usage: Token usage statistics

## Example Usage

```typescript
// Example MCP tool use
const result = await useMcpTool('perplexity', 'search', {
  query: "What is quantum computing?",
  temperature: 0.3,
  search_recency_filter: "month"
});

// Example response
{
  "answer": "Detailed explanation...",
  "citations": [
    "https://example.com/source1",
    "https://example.com/source2"
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 150,
    "total_tokens": 170
  }
}
```

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

### Prerequisites
- A Perplexity API key (obtain from https://www.perplexity.ai/settings)

### Configuration

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Linux: `~/.vscode-server/data/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "node",
      "args": ["/path/to/perplexity-server/build/index.js"],
      "env": {
        "PERPLEXITY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Replace `/path/to/perplexity-server` with the actual path to your installation and `your-api-key-here` with your Perplexity API key.

### Environment Variables

- `PERPLEXITY_API_KEY` (required): Your Perplexity API authentication key

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## Error Handling

The server handles common error cases including:
- Missing or invalid API key
- Invalid search parameters
- API rate limits and errors
- Network connectivity issues

Errors are returned in a structured format with descriptive messages to help diagnose issues.
