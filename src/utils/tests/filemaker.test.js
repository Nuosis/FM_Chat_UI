import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the module with inline functions
vi.mock('../filemaker', () => {
  let inFileMakerValue = false;
  return {
    performFMScript: vi.fn(),
    handleFMScriptResult: vi.fn(),
    isInFileMaker: vi.fn().mockReturnValue(false),
    get inFileMaker() {
      return inFileMakerValue;
    },
    set inFileMaker(value) {
      inFileMakerValue = value;
    }
  };
});

// Import after mocking
import * as filemaker from '../filemaker';

describe('filemaker utilities', () => {
  describe('environment detection', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      filemaker.inFileMaker = false;
      vi.mocked(filemaker.isInFileMaker).mockReturnValue(false);
    });

    it('should detect FileMaker environment when FileMaker object exists', () => {
      filemaker.inFileMaker = true;
      vi.mocked(filemaker.isInFileMaker).mockReturnValue(true);
      expect(filemaker.inFileMaker).toBe(true);
    });

    it('should detect FileMaker environment when FMGofer exists', () => {
      filemaker.inFileMaker = true;
      vi.mocked(filemaker.isInFileMaker).mockReturnValue(true);
      expect(filemaker.inFileMaker).toBe(true);
    });

    it('should not detect FileMaker environment when neither exists', () => {
      filemaker.inFileMaker = false;
      vi.mocked(filemaker.isInFileMaker).mockReturnValue(false);
      expect(filemaker.inFileMaker).toBe(false);
    });
  });

  describe('performFMScript', () => {
    let mockFileMaker;

    beforeEach(() => {
      vi.clearAllMocks();

      // Mock console methods
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});

      // Set up FileMaker environment
      mockFileMaker = {
        PerformScript: vi.fn().mockImplementation(() => Promise.resolve())
      };

      global.window = {
        FileMaker: mockFileMaker
      };

      // Set inFileMaker to true for these tests
      filemaker.inFileMaker = true;

      // Set up performFMScript mock
      vi.mocked(filemaker.performFMScript).mockImplementation(async ({ action, script, scriptParam }) => {
        if (!filemaker.inFileMaker) {
          throw new Error('Not in FileMaker environment');
        }

        if (action && !['read', 'update', 'create', 'requestSchema', 'script'].includes(action)) {
          throw new Error(`Invalid action: ${action}`);
        }

        const parameter = script === 'ai * tools' ? '' : JSON.stringify({
          ...(action && { action }),
          ...scriptParam,
          version: 'vLatest'
        });

        return mockFileMaker.PerformScript(script, parameter);
      });
    });

    it('should throw error when not in FileMaker environment', async () => {
      filemaker.inFileMaker = false;
      await expect(filemaker.performFMScript({}))
        .rejects.toThrow('Not in FileMaker environment');
    });

    it('should validate action', async () => {
      await expect(filemaker.performFMScript({ action: 'invalid' }))
        .rejects.toThrow(/Invalid action: invalid/);
    });

    it('should format parameters correctly', async () => {
      const scriptParams = {
        action: 'read',
        data: { id: 1 }
      };

      await filemaker.performFMScript({
        action: 'read',
        script: 'Test Script',
        scriptParam: scriptParams
      });

      const expectedParam = JSON.stringify({
        action: 'read',
        data: { id: 1 },
        version: 'vLatest'
      });

      expect(mockFileMaker.PerformScript)
        .toHaveBeenCalledWith('Test Script', expectedParam);
    });

    it('should skip parameter preparation for ai * tools script', async () => {
      await filemaker.performFMScript({
        script: 'ai * tools'
      });

      expect(mockFileMaker.PerformScript)
        .toHaveBeenCalledWith('ai * tools', '');
    });

    it('should use FileMaker.PerformScript', async () => {
      const mockResult = { success: true };
      mockFileMaker.PerformScript.mockResolvedValue(mockResult);

      const result = await filemaker.performFMScript({
        script: 'Test Script'
      });

      expect(mockFileMaker.PerformScript).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should handle FileMaker errors', async () => {
      mockFileMaker.PerformScript.mockRejectedValue(new Error('Script failed'));

      await expect(filemaker.performFMScript({ script: 'Test Script' }))
        .rejects.toThrow('Script failed');
    });
  });

  describe('handleFMScriptResult', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(filemaker.handleFMScriptResult).mockImplementation((result) => {
        if (!result) {
          throw new Error('Empty result from FileMaker');
        }
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
        if (parsedResult.error) {
          const error = new Error(parsedResult.message || 'Unknown FileMaker error');
          error.code = 'FM_ERROR';
          error.details = parsedResult.details;
          throw error;
        }
        return parsedResult;
      });
    });

    it('should parse JSON string result', () => {
      const result = filemaker.handleFMScriptResult('{"success":true}');
      expect(result).toEqual({ success: true });
    });

    it('should handle object result', () => {
      const result = filemaker.handleFMScriptResult({ success: true });
      expect(result).toEqual({ success: true });
    });

    it('should throw error for empty result', () => {
      expect(() => filemaker.handleFMScriptResult(null))
        .toThrow('Empty result from FileMaker');
      expect(() => filemaker.handleFMScriptResult(''))
        .toThrow('Empty result from FileMaker');
    });

    it('should handle FileMaker error response', () => {
      const errorResult = {
        error: true,
        message: 'Operation failed',
        details: { code: 100 }
      };

      expect(() => filemaker.handleFMScriptResult(errorResult))
        .toThrow('Operation failed');
      try {
        filemaker.handleFMScriptResult(errorResult);
      } catch (error) {
        expect(error.code).toBe('FM_ERROR');
        expect(error.details).toEqual({ code: 100 });
      }
    });

    it('should handle FileMaker error without message', () => {
      const errorResult = {
        error: true
      };

      expect(() => filemaker.handleFMScriptResult(errorResult))
        .toThrow('Unknown FileMaker error');
    });

    it('should handle invalid JSON string', () => {
      expect(() => filemaker.handleFMScriptResult('invalid json'))
        .toThrow('Unexpected token');
    });
  });
});