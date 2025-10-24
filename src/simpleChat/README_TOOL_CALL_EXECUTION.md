# Tool Call Execution Function

This document describes the `processToolCallExecution` global function that processes FileMaker payloads containing JavaScript tool calls.

## Overview

The `processToolCallExecution` function accepts a FileMaker payload, extracts JavaScript code from tool calls, executes it safely, and returns the result as a tool call response in the messages chain. It then calls the FileMaker script "AI * Make Call" with the updated payload.

## Function Signature

```javascript
window.processToolCallExecution(payload)
```

## Parameters

- `payload` (Object): The FileMaker payload containing:
  - `callbackName` (string): FileMaker callback identifier
  - `parameter` (Object): Contains the API configuration and payload
    - `apiKey` (string): API key for the service
    - `endpoint` (string): API endpoint URL
    - `headers` (Array): HTTP headers
    - `payload` (Object): The actual payload containing messages
      - `messages` (Array): Array of conversation messages
  - `promiseID` (string): Promise identifier

## Return Value

Returns a Promise that resolves to an object containing:
- `success` (boolean): Whether the operation succeeded
- `executionResult` (any): The result of the JavaScript code execution
- `scriptResult` (Object): Result from the FileMaker script execution
- `updatedParameter` (Object): The updated parameter (only the parameter key) with the tool call response

## Usage Example

```javascript
const payload = {
  "callbackName": "fmGoferCallbackD7738642C91848E08720EAC24EDDA483",
  "parameter": {
    "apiKey": "",
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "headers": ["content-type: application/json", "authorization: Bearer {{API_KEY}}"],
    "payload": {
      "max_tokens": 1000,
      "messages": [
        {
          "content": "You are a helpful AI assistant.",
          "role": "system"
        },
        // ... other messages
        {
          "role": "assistant",
          "tool_calls": [
            {
              "function": {
                "arguments": "{\"code\":\"const sentence = \\\"Hello World\\\";\\nconst reversed = sentence.split(' ').reverse().join(' ');\\nreversed;\"}",
                "name": "execute_javascript"
              },
              "id": "call_123",
              "type": "function"
            }
          ]
        }
      ],
      "model": "gpt-4.1-nano",
      "temperature": 0.7
    },
    "provider": "openai"
  },
  "promiseID": "50b5b4a25f284f7182346d34e0d32421"
};

// Execute the tool call
try {
  const result = await window.processToolCallExecution(payload);
  console.log('Execution result:', result.executionResult);
  console.log('Updated parameter:', result.updatedParameter);
} catch (error) {
  console.error('Error:', error);
}
```

## Error Handling

The function provides rich error reporting when JavaScript code execution fails:

### Error Response Structure

When code execution fails, the `executionResult` will be an object containing:

```javascript
{
  error: true,
  message: "Error executing code: ReferenceError: variable is not defined",
  details: {
    type: "CODE_EXECUTION_ERROR",
    originalError: "variable is not defined",
    code: "console.log(variable);",
    timestamp: "2025-01-06T06:11:25.000Z"
  },
  suggestions: [
    "Variable 'variable' is not defined. Check if it's declared before use.",
    "Ensure all variables are properly declared with 'const', 'let', or 'var'."
  ]
}
```

### Error Types and Suggestions

The function provides specific suggestions based on the error type:

1. **Undefined Variable Errors**
   - Suggests checking variable declarations
   - Recommends using proper variable declaration keywords

2. **Syntax Errors**
   - Suggests checking for missing semicolons, brackets, or quotes
   - Recommends verifying JavaScript code formatting

3. **Property Access Errors**
   - Suggests adding null/undefined checks
   - Recommends defensive programming practices

4. **Function Call Errors**
   - Suggests verifying method existence
   - Recommends checking function definitions

## Tool Call Response Format

The function creates a tool call response message that gets added to the messages array:

### Successful Execution
```javascript
{
  role: "tool",
  tool_call_id: "call_123",
  content: "World Hello"  // The actual result
}
```

### Failed Execution
```javascript
{
  role: "tool",
  tool_call_id: "call_123",
  content: JSON.stringify({
    error: true,
    message: "Error executing code: ...",
    suggestions: [...],
    details: {...}
  }, null, 2)
}
```

## Global Availability

The function is automatically made globally available when the application loads through:

1. Import in `main.jsx`: `import './src/service/filemaker.js';`
2. Global assignment in `filemaker.js`: `window.processToolCallExecution = processToolCallExecution;`

## FileMaker Integration

After processing the tool call, the function automatically calls the FileMaker script "AI * Make Call" with only the updated `parameter` object (not the full payload with `callbackName` and `promiseID`). The parameter contains the tool call response, allowing the conversation to continue with the execution result.

## Security Considerations

- The function uses `new Function()` to execute JavaScript code in a controlled environment
- Code execution is contained within a function scope to prevent global variable pollution
- Error handling prevents crashes and provides meaningful feedback
- All errors are logged for debugging purposes

## Testing

Comprehensive tests are available in `src/test/toolCallExecution.test.js` covering:
- Successful code execution
- Error handling scenarios
- Payload validation
- Message array management
- Rich error reporting

Run tests with:
```bash
npm test -- toolCallExecution.test.js