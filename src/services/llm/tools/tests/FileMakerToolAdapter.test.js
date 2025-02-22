import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileMakerToolAdapter } from '../FileMakerToolAdapter';
import * as filemaker from '../../../utils/filemaker';

// Mock filemaker utility
vi.mock('../../../utils/filemaker', () => ({
  executeScript: vi.fn(),
  findRecords: vi.fn(),
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn()
}));

describe('FileMakerToolAdapter', () => {
  let tool;

  beforeEach(() => {
    tool = new FileMakerToolAdapter();
    vi.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have required properties', () => {
      expect(tool.name).toBe('filemaker');
      expect(tool.description).toContain('FileMaker');
      expect(tool.schema).toBeDefined();
    });

    it('should have valid JSON schema', () => {
      expect(tool.schema).toEqual({
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['find', 'create', 'update', 'delete', 'script']
          },
          layout: { type: 'string' },
          data: { type: 'object' },
          scriptName: { type: 'string' },
          scriptParameter: { type: 'string' }
        },
        required: ['action', 'layout']
      });
    });
  });

  describe('execute', () => {
    describe('find action', () => {
      it('should find records', async () => {
        const mockRecords = [{ id: 1, name: 'Test' }];
        filemaker.findRecords.mockResolvedValue(mockRecords);

        const result = await tool.execute({
          action: 'find',
          layout: 'Users',
          data: { name: 'Test' }
        });

        expect(filemaker.findRecords).toHaveBeenCalledWith('Users', { name: 'Test' });
        expect(result).toEqual(mockRecords);
      });

      it('should handle empty results', async () => {
        filemaker.findRecords.mockResolvedValue([]);

        const result = await tool.execute({
          action: 'find',
          layout: 'Users',
          data: { name: 'NonExistent' }
        });

        expect(result).toEqual([]);
      });

      it('should handle find errors', async () => {
        filemaker.findRecords.mockRejectedValue(new Error('Find error'));

        await expect(tool.execute({
          action: 'find',
          layout: 'Users',
          data: { name: 'Test' }
        })).rejects.toThrow('Find error');
      });
    });

    describe('create action', () => {
      it('should create record', async () => {
        const mockRecord = { id: 1, name: 'New User' };
        filemaker.createRecord.mockResolvedValue(mockRecord);

        const result = await tool.execute({
          action: 'create',
          layout: 'Users',
          data: { name: 'New User' }
        });

        expect(filemaker.createRecord).toHaveBeenCalledWith('Users', { name: 'New User' });
        expect(result).toEqual(mockRecord);
      });

      it('should require data for create', async () => {
        await expect(tool.execute({
          action: 'create',
          layout: 'Users'
        })).rejects.toThrow('Data is required for create action');
      });

      it('should handle create errors', async () => {
        filemaker.createRecord.mockRejectedValue(new Error('Create error'));

        await expect(tool.execute({
          action: 'create',
          layout: 'Users',
          data: { name: 'New User' }
        })).rejects.toThrow('Create error');
      });
    });

    describe('update action', () => {
      it('should update record', async () => {
        const mockRecord = { id: 1, name: 'Updated User' };
        filemaker.updateRecord.mockResolvedValue(mockRecord);

        const result = await tool.execute({
          action: 'update',
          layout: 'Users',
          data: { id: 1, name: 'Updated User' }
        });

        expect(filemaker.updateRecord).toHaveBeenCalledWith('Users', { id: 1, name: 'Updated User' });
        expect(result).toEqual(mockRecord);
      });

      it('should require data with id for update', async () => {
        await expect(tool.execute({
          action: 'update',
          layout: 'Users',
          data: { name: 'Updated User' }
        })).rejects.toThrow('Record ID is required for update action');
      });

      it('should handle update errors', async () => {
        filemaker.updateRecord.mockRejectedValue(new Error('Update error'));

        await expect(tool.execute({
          action: 'update',
          layout: 'Users',
          data: { id: 1, name: 'Updated User' }
        })).rejects.toThrow('Update error');
      });
    });

    describe('delete action', () => {
      it('should delete record', async () => {
        filemaker.deleteRecord.mockResolvedValue(true);

        const result = await tool.execute({
          action: 'delete',
          layout: 'Users',
          data: { id: 1 }
        });

        expect(filemaker.deleteRecord).toHaveBeenCalledWith('Users', 1);
        expect(result).toBe(true);
      });

      it('should require record id for delete', async () => {
        await expect(tool.execute({
          action: 'delete',
          layout: 'Users'
        })).rejects.toThrow('Record ID is required for delete action');
      });

      it('should handle delete errors', async () => {
        filemaker.deleteRecord.mockRejectedValue(new Error('Delete error'));

        await expect(tool.execute({
          action: 'delete',
          layout: 'Users',
          data: { id: 1 }
        })).rejects.toThrow('Delete error');
      });
    });

    describe('script action', () => {
      it('should execute script', async () => {
        const mockResult = { success: true };
        filemaker.executeScript.mockResolvedValue(mockResult);

        const result = await tool.execute({
          action: 'script',
          layout: 'Users',
          scriptName: 'TestScript',
          scriptParameter: 'TestParam'
        });

        expect(filemaker.executeScript).toHaveBeenCalledWith('Users', 'TestScript', 'TestParam');
        expect(result).toEqual(mockResult);
      });

      it('should require script name', async () => {
        await expect(tool.execute({
          action: 'script',
          layout: 'Users'
        })).rejects.toThrow('Script name is required for script action');
      });

      it('should handle script errors', async () => {
        filemaker.executeScript.mockRejectedValue(new Error('Script error'));

        await expect(tool.execute({
          action: 'script',
          layout: 'Users',
          scriptName: 'TestScript'
        })).rejects.toThrow('Script error');
      });

      it('should handle script without parameter', async () => {
        const mockResult = { success: true };
        filemaker.executeScript.mockResolvedValue(mockResult);

        const result = await tool.execute({
          action: 'script',
          layout: 'Users',
          scriptName: 'TestScript'
        });

        expect(filemaker.executeScript).toHaveBeenCalledWith('Users', 'TestScript', undefined);
        expect(result).toEqual(mockResult);
      });
    });

    describe('error handling', () => {
      it('should handle invalid action', async () => {
        await expect(tool.execute({
          action: 'invalid',
          layout: 'Users'
        })).rejects.toThrow('Invalid action');
      });

      it('should handle missing layout', async () => {
        await expect(tool.execute({
          action: 'find'
        })).rejects.toThrow('Layout is required');
      });

      it('should handle FileMaker connection errors', async () => {
        filemaker.findRecords.mockRejectedValue(new Error('Connection failed'));

        await expect(tool.execute({
          action: 'find',
          layout: 'Users'
        })).rejects.toThrow('Connection failed');
      });
    });
  });
});