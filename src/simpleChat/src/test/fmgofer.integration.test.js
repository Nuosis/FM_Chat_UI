import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeFileMakerScript, handleFMScriptResult } from '../service/filemaker.js';

describe('FMGofer Integration Tests - REAL BEHAVIOR', () => {
  beforeEach(() => {
    // Set up a realistic FMGofer mock that behaves like the real thing
    global.window = {
      FMGofer: {
        PerformScript: vi.fn()
      }
    };
  });

  it('should handle FMGofer rejecting valid JSON responses as errors', async () => {
    const validJsonResponse = JSON.stringify({
      "id": "chatcmpl-test",
      "object": "chat.completion",
      "choices": [
        {
          "index": 0,
          "message": {
            "role": "assistant",
            "content": "Hello! This is a test response.",
            "refusal": null,
            "annotations": []
          },
          "logprobs": null,
          "finish_reason": "stop"
        }
      ]
    });

    // Mock FMGofer to REJECT with valid JSON (the actual bug behavior)
    window.FMGofer.PerformScript.mockRejectedValue(validJsonResponse);

    console.log('🧪 Testing FMGofer rejecting valid JSON as error...');
    
    try {
      const result = await executeFileMakerScript('AI * Make Call', {});
      
      // If our fix works, this should succeed and return the parsed content
      expect(result).toBeDefined();
      expect(result.choices).toBeDefined();
      expect(result.choices[0].message.content).toBe('Hello! This is a test response.');
      
      console.log('✅ Fix works! FMGofer rejection was handled correctly');
    } catch (error) {
      console.error('❌ Fix failed! Error:', error.message);
      throw error;
    }
  });

  it('should handle real FMGofer errors correctly', async () => {
    // Mock FMGofer to reject with a real error
    const realError = new Error('Actual FileMaker script error');
    window.FMGofer.PerformScript.mockRejectedValue(realError);

    console.log('🧪 Testing real FMGofer error...');
    
    await expect(executeFileMakerScript('AI * Make Call', {}))
      .rejects
      .toThrow('Actual FileMaker script error');
      
    console.log('✅ Real errors are still thrown correctly');
  });

  it('should handle FMGofer resolving correctly', async () => {
    const validJsonResponse = {
      "id": "chatcmpl-test",
      "object": "chat.completion",
      "choices": [
        {
          "index": 0,
          "message": {
            "role": "assistant",
            "content": "Hello! This is a resolved response.",
            "refusal": null,
            "annotations": []
          },
          "logprobs": null,
          "finish_reason": "stop"
        }
      ]
    };

    // Mock FMGofer to resolve correctly (how it should work)
    window.FMGofer.PerformScript.mockResolvedValue(validJsonResponse);

    console.log('🧪 Testing FMGofer resolving correctly...');
    
    const result = await executeFileMakerScript('AI * Make Call', {});
    
    expect(result).toBeDefined();
    expect(result.choices[0].message.content).toBe('Hello! This is a resolved response.');
    
    console.log('✅ Normal resolution works correctly');
  });

  describe('handleFMScriptResult edge cases', () => {
    it('should handle string JSON input', () => {
      const jsonString = '{"choices":[{"message":{"content":"Test"}}]}';
      const result = handleFMScriptResult(jsonString);
      expect(result.choices[0].message.content).toBe('Test');
    });

    it('should handle object input', () => {
      const jsonObject = {"choices":[{"message":{"content":"Test"}}]};
      const result = handleFMScriptResult(jsonObject);
      expect(result.choices[0].message.content).toBe('Test');
    });

    it('should throw on malformed JSON string', () => {
      expect(() => handleFMScriptResult('{"invalid": json}'))
        .toThrow('Failed to parse FileMaker result as JSON');
    });

    it('should throw on empty result', () => {
      expect(() => handleFMScriptResult(null))
        .toThrow('Empty result from FileMaker');
    });
  });
});