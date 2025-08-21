import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs/promises';

// Mock the Pipeline module
vi.mock('@/pipeline', () => ({
  Pipeline: {
    runPipeline: vi.fn(),
    resumePipeline: vi.fn(),
    listRuns: vi.fn()
  }
}));

// Mock chalk to return plain strings
vi.mock('chalk', () => {
  const mockChalk = (str: string) => str;
  return {
    default: Object.assign(mockChalk, {
      blue: mockChalk,
      green: mockChalk,
      red: mockChalk,
      yellow: mockChalk,
      gray: mockChalk,
      cyan: mockChalk,
      white: mockChalk,
      bold: Object.assign(mockChalk, {
        blue: mockChalk,
        green: mockChalk,
      })
    })
  };
});

// Mock console methods to capture output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation((code?: string | number) => {
  throw new Error(`Process exit called with code: ${code}`);
});

describe('CLI Interface', () => {
  let CLI: any;
  let Pipeline: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import modules after mocks are set up
    CLI = (await import('@/cli')).CLI;
    Pipeline = (await import('@/pipeline')).Pipeline;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseArguments', () => {
    it('should parse topic and bucket arguments correctly', () => {
      const args = ['node', 'script.js', 'Best Budget RVs Under $30k', '--bucket', 'weekly'];
      
      const result = CLI.parseArguments(args);

      expect(result.topic).toBe('Best Budget RVs Under $30k');
      expect(result.bucket).toBe('weekly');
      expect(result.command).toBe('run');
    });

    it('should use default bucket when not specified', () => {
      const args = ['node', 'script.js', 'RV Maintenance Tips'];
      
      const result = CLI.parseArguments(args);

      expect(result.topic).toBe('RV Maintenance Tips');
      expect(result.bucket).toBe('daily');
      expect(result.command).toBe('run');
    });

    it('should handle resume command with run ID', () => {
      const args = ['node', 'script.js', '--resume', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'];
      
      const result = CLI.parseArguments(args);

      expect(result.command).toBe('resume');
      expect(result.runId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });

    it('should handle list command', () => {
      const args = ['node', 'script.js', '--list'];
      
      const result = CLI.parseArguments(args);

      expect(result.command).toBe('list');
    });

    it('should handle help command', () => {
      const args = ['node', 'script.js', '--help'];
      
      const result = CLI.parseArguments(args);

      expect(result.command).toBe('help');
    });

    it('should validate bucket values', () => {
      const args = ['node', 'script.js', 'Test Topic', '--bucket', 'invalid'];
      
      expect(() => CLI.parseArguments(args)).toThrow('Invalid bucket type');
    });

    it('should require topic for run command', () => {
      const args = ['node', 'script.js'];
      
      expect(() => CLI.parseArguments(args)).toThrow('Topic is required');
    });

    it('should require run ID for resume command', () => {
      const args = ['node', 'script.js', '--resume'];
      
      expect(() => CLI.parseArguments(args)).toThrow('Run ID is required for resume');
    });
  });

  describe('runPipeline', () => {
    it('should execute pipeline successfully', async () => {
      const mockRunState = {
        id: 'test-run-123',
        topic: 'Test Topic',
        bucket: 'daily' as const,
        currentStage: 'complete' as const,
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:30:00Z',
        errors: []
      };

      Pipeline.runPipeline.mockResolvedValue({
        success: true,
        runState: mockRunState
      });

      // Should not throw an error
      await expect(CLI.runPipeline('Test Topic', 'daily')).resolves.not.toThrow();
      expect(Pipeline.runPipeline).toHaveBeenCalledWith('Test Topic', 'daily');
    });

    it('should handle pipeline failures gracefully', async () => {
      Pipeline.runPipeline.mockResolvedValue({
        success: false,
        runState: {
          id: 'failed-run-123',
          currentStage: 'draft',
          errors: [{ stage: 'draft', message: 'Draft creation failed', timestamp: '2024-03-15T10:15:00Z' }]
        },
        error: 'Pipeline failed at stage: draft'
      });

      // Should call process.exit(1) on failure
      await expect(CLI.runPipeline('Test Topic', 'daily')).rejects.toThrow('Process exit called with code: 1');
      expect(Pipeline.runPipeline).toHaveBeenCalledWith('Test Topic', 'daily');
    });

    it('should call pipeline with correct parameters', async () => {
      const mockRunState = {
        id: 'test-run-123',
        topic: 'Test Topic',
        bucket: 'daily' as const,
        currentStage: 'complete' as const,
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:30:00Z',
        errors: []
      };

      Pipeline.runPipeline.mockResolvedValue({
        success: true,
        runState: mockRunState
      });

      await expect(CLI.runPipeline('Test Topic', 'daily')).resolves.not.toThrow();
      expect(Pipeline.runPipeline).toHaveBeenCalledWith('Test Topic', 'daily');
    });
  });

  describe('resumePipeline', () => {
    it('should resume pipeline and display success message', async () => {
      const mockRunState = {
        id: 'resume-run-123',
        topic: 'Resumed Topic',
        bucket: 'weekly' as const,
        currentStage: 'complete' as const,
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:30:00Z',
        errors: []
      };

      Pipeline.resumePipeline.mockResolvedValue({
        success: true,
        runState: mockRunState
      });

      await CLI.resumePipeline('resume-run-123');

      expect(Pipeline.resumePipeline).toHaveBeenCalledWith('resume-run-123');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Pipeline resumed successfully!'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Topic: Resumed Topic'));
    });

    it('should handle resume failures', async () => {
      Pipeline.resumePipeline.mockResolvedValue({
        success: false,
        runState: {} as any,
        error: 'Failed to load run state'
      });

      await CLI.resumePipeline('invalid-run-123');

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Failed to resume pipeline'));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('listRuns', () => {
    it('should display list of available runs', async () => {
      Pipeline.listRuns.mockResolvedValue({
        success: true,
        runs: ['run-1', 'run-2', 'run-3']
      });

      await CLI.listRuns();

      expect(Pipeline.listRuns).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Available pipeline runs:'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('run-1'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('run-2'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('run-3'));
    });

    it('should handle empty runs list', async () => {
      Pipeline.listRuns.mockResolvedValue({
        success: true,
        runs: []
      });

      await CLI.listRuns();

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No pipeline runs found'));
    });

    it('should handle list failures', async () => {
      Pipeline.listRuns.mockResolvedValue({
        success: false,
        error: 'Failed to access runs directory'
      });

      await CLI.listRuns();

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Failed to list runs'));
    });
  });

  describe('showHelp', () => {
    it('should display help information', () => {
      CLI.showHelp();

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('NS SEO Content Agent'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('npm run pipeline'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
    });
  });

  describe('formatDuration', () => {
    it('should format durations correctly', () => {
      expect(CLI.formatDuration(30000)).toBe('30s');
      expect(CLI.formatDuration(90000)).toBe('1m 30s');
      expect(CLI.formatDuration(3661000)).toBe('61m 1s');
      expect(CLI.formatDuration(500)).toBe('1s');
    });
  });

  describe('main', () => {
    it('should handle run command', async () => {
      const mockRunState = {
        id: 'test-run-123',
        currentStage: 'complete' as const,
        errors: []
      };

      Pipeline.runPipeline.mockResolvedValue({
        success: true,
        runState: mockRunState
      });

      await CLI.main(['node', 'script.js', 'Test Topic', '--bucket', 'daily']);

      expect(Pipeline.runPipeline).toHaveBeenCalledWith('Test Topic', 'daily');
    });

    it('should handle resume command', async () => {
      const mockRunState = {
        id: 'resume-run-123',
        currentStage: 'complete' as const,
        errors: []
      };

      Pipeline.resumePipeline.mockResolvedValue({
        success: true,
        runState: mockRunState
      });

      await CLI.main(['node', 'script.js', '--resume', 'resume-run-123']);

      expect(Pipeline.resumePipeline).toHaveBeenCalledWith('resume-run-123');
    });

    it('should handle list command', async () => {
      Pipeline.listRuns.mockResolvedValue({
        success: true,
        runs: []
      });

      await CLI.main(['node', 'script.js', '--list']);

      expect(Pipeline.listRuns).toHaveBeenCalled();
    });

    it('should handle help command', async () => {
      await CLI.main(['node', 'script.js', '--help']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    });

    it('should handle argument parsing errors', async () => {
      try {
        await CLI.main(['node', 'script.js']);
      } catch (error) {
        // Process.exit throws error in test
      }

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Error:'));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle unexpected errors', async () => {
      Pipeline.runPipeline.mockRejectedValue(new Error('Unexpected error'));

      try {
        await CLI.main(['node', 'script.js', 'Test Topic']);
      } catch (error) {
        // Process.exit throws error in test
      }

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Unexpected error'));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Integration with package.json scripts', () => {
    it('should work with npm run pipeline command', async () => {
      // This test would verify the actual script execution
      // For now, just verify the CLI interface exists
      expect(CLI.main).toBeDefined();
      expect(CLI.parseArguments).toBeDefined();
      expect(CLI.runPipeline).toBeDefined();
    });
  });
});