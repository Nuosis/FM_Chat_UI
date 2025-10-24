import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processToolCallExecution } from '../service/filemaker.js';

describe('Tool Call Execution Tests', () => {
  beforeEach(() => {
    // Set up a realistic FMGofer mock
    global.window = {
      FMGofer: {
        PerformScript: vi.fn()
      }
    };
  });

  it('should process FileMaker payload and execute JavaScript code', async () => {
    const testPayload = {
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
            {
              "content": "Reverse the words in the sentence 'OpenAI builds advanced AI models' using JavaScript.",
              "role": "user"
            },
            {
              "content": "I will generate the JavaScript code to reverse the words in the sentence \"OpenAI builds advanced AI models.\" Then I will execute it for you.",
              "role": "assistant"
            },
            {
              "content": "OK",
              "role": "user"
            },
            {
              "content": "Here's the JavaScript code to reverse the words in the sentence:\n\n```javascript\nconst sentence = \"OpenAI builds advanced AI models\";\nconst reversedWords = sentence.split(\" \").reverse().join(\" \");\nreversedWords;\n```\n\nI will now execute this code to get the result.",
              "role": "assistant"
            },
            {
              "content": "Sure",
              "role": "user"
            },
            {
              "annotations": [],
              "content": null,
              "refusal": null,
              "role": "assistant",
              "tool_calls": [
                {
                  "function": {
                    "arguments": "{\"code\":\"const sentence = \\\"OpenAI builds advanced AI models\\\";\\nconst reversedWords = sentence.split(\\\" \\\").reverse().join(\\\" \\\");\\nreversedWords;\"}",
                    "name": "execute_javascript"
                  },
                  "id": "call_AbbLidT6G6KxBaTCbjDpsPix",
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

    // Mock successful FileMaker script execution
    const mockScriptResult = {
      success: true,
      message: "Script executed successfully"
    };
    window.FMGofer.PerformScript.mockResolvedValue(mockScriptResult);

    console.log('🧪 Testing tool call execution...');
    
    const result = await processToolCallExecution(testPayload);
    
    // Verify the function executed successfully
    expect(result.success).toBe(true);
    expect(result.executionResult).toBe("models AI advanced builds OpenAI");
    expect(result.scriptResult).toEqual(mockScriptResult);
    
    // Verify the messages array was updated correctly
    const updatedMessages = result.updatedParameter.payload.messages;
    
    // Should have 7 messages now (original 7 messages, minus 1 popped, plus 1 tool response = 7)
    expect(updatedMessages).toHaveLength(7);
    
    // Last message should be the tool call response
    const lastMessage = updatedMessages[updatedMessages.length - 1];
    expect(lastMessage.role).toBe("tool");
    expect(lastMessage.tool_call_id).toBe("call_AbbLidT6G6KxBaTCbjDpsPix");
    expect(lastMessage.content).toBe("models AI advanced builds OpenAI");
    
    // Verify FileMaker script was called with updated parameter (not full payload)
    expect(window.FMGofer.PerformScript).toHaveBeenCalledWith('AI * Make Call', result.updatedParameter);
    
    console.log('✅ Tool call execution test passed!');
  });

  it('should handle invalid payload structure', async () => {
    const invalidPayload = {
      "callbackName": "test",
      // Missing parameter field
    };

    console.log('🧪 Testing invalid payload handling...');
    
    await expect(processToolCallExecution(invalidPayload))
      .rejects
      .toThrow('Invalid payload structure: missing required fields');
      
    console.log('✅ Invalid payload handling test passed!');
  });

  it('should handle missing tool calls', async () => {
    const payloadWithoutToolCalls = {
      "callbackName": "test",
      "parameter": {
        "payload": {
          "messages": [
            {
              "role": "assistant",
              "content": "No tool calls here"
            }
          ]
        }
      }
    };

    console.log('🧪 Testing missing tool calls handling...');
    
    await expect(processToolCallExecution(payloadWithoutToolCalls))
      .rejects
      .toThrow('Last message does not contain valid tool calls');
      
    console.log('✅ Missing tool calls handling test passed!');
  });

  it('should handle code execution errors gracefully with rich error reporting', async () => {
    const payloadWithBadCode = {
      "callbackName": "test",
      "parameter": {
        "payload": {
          "messages": [
            {
              "role": "assistant",
              "tool_calls": [
                {
                  "function": {
                    "arguments": "{\"code\":\"undefinedVariable.someMethod();\"}",
                    "name": "execute_javascript"
                  },
                  "id": "call_test",
                  "type": "function"
                }
              ]
            }
          ]
        }
      }
    };

    // Mock successful FileMaker script execution
    window.FMGofer.PerformScript.mockResolvedValue({ success: true });

    console.log('🧪 Testing code execution error handling with rich reporting...');
    
    const result = await processToolCallExecution(payloadWithBadCode);
    
    // Should still succeed but with detailed error information
    expect(result.success).toBe(true);
    expect(result.executionResult.error).toBe(true);
    expect(result.executionResult.suggestions).toBeDefined();
    expect(result.executionResult.suggestions.length).toBeGreaterThan(0);
    expect(result.executionResult.details).toBeDefined();
    expect(result.executionResult.details.type).toBe('CODE_EXECUTION_ERROR');
    
    // Verify the tool call response contains structured error information
    const updatedMessages = result.updatedParameter.payload.messages;
    const lastMessage = updatedMessages[updatedMessages.length - 1];
    expect(lastMessage.role).toBe("tool");
    
    // Parse the content to verify it's structured error information
    const errorContent = JSON.parse(lastMessage.content);
    expect(errorContent.error).toBe(true);
    expect(errorContent.suggestions).toBeDefined();
    expect(errorContent.details).toBeDefined();
    
    console.log('✅ Rich error reporting test passed!');
  });

  it('should provide specific suggestions for undefined variable errors', async () => {
    const payloadWithUndefinedVar = {
      "callbackName": "test",
      "parameter": {
        "payload": {
          "messages": [
            {
              "role": "assistant",
              "tool_calls": [
                {
                  "function": {
                    "arguments": "{\"code\":\"console.log(nonExistentVariable);\"}",
                    "name": "execute_javascript"
                  },
                  "id": "call_test_undefined",
                  "type": "function"
                }
              ]
            }
          ]
        }
      }
    };

    // Mock successful FileMaker script execution
    window.FMGofer.PerformScript.mockResolvedValue({ success: true });

    console.log('🧪 Testing undefined variable error suggestions...');
    
    const result = await processToolCallExecution(payloadWithUndefinedVar);
    
    // Should provide specific suggestions for undefined variables
    const suggestions = result.executionResult.suggestions;
    console.log('Actual suggestions:', suggestions);
    
    // Check that we have suggestions and they contain relevant content
    expect(suggestions).toBeDefined();
    expect(suggestions.length).toBeGreaterThan(0);
    
    // Look for suggestions about undefined variables or variable declaration
    const hasUndefinedVariableSuggestion = suggestions.some(suggestion =>
      suggestion.includes('not defined') || suggestion.includes('declared')
    );
    expect(hasUndefinedVariableSuggestion).toBe(true);
    
    console.log('✅ Undefined variable error suggestions test passed!');
  });
});