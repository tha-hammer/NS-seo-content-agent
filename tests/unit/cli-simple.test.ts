import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Pipeline module
const mockRunPipeline = vi.fn();
const mockResumePipeline = vi.fn();
const mockListRuns = vi.fn();

vi.mock('@/pipeline', () => ({
  Pipeline: {
    runPipeline: mockRunPipeline,
    resumePipeline: mockResumePipeline,
    listRuns: mockListRuns
  }
}));

// Mock chalk
vi.mock('chalk', () => ({
  default: {
    blue: (str: string) => str,
    green: (str: string) => str,
    red: (str: string) => str,
    yellow: (str: string) => str,
    gray: (str: string) => str,
    cyan: (str: string) => str,
    white: (str: string) => str,
    bold: (str: string) => str
  }
}));

// Mock process.exit to throw instead of actually exiting
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`Process would exit with code: ${code}`);
});

describe('CLI Interface - Core Functionality', () => {
  let CLI: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    CLI = (await import('@/cli')).CLI;
  });

  describe('parseArguments', () => {
    it('should parse basic run command', () => {
      const args = ['node', 'script.js', 'Best Budget RVs Under $30k'];
      const result = CLI.parseArguments(args);

      expect(result.command).toBe('run');
      expect(result.topic).toBe('Best Budget RVs Under $30k');
      expect(result.bucket).toBe('daily');
    });

    it('should parse run command with bucket', () => {
      const args = ['node', 'script.js', 'RV Maintenance Tips', '--bucket', 'weekly'];
      const result = CLI.parseArguments(args);

      expect(result.command).toBe('run');
      expect(result.topic).toBe('RV Maintenance Tips');
      expect(result.bucket).toBe('weekly');
    });

    it('should parse resume command', () => {
      const args = ['node', 'script.js', '--resume', 'test-run-123'];
      const result = CLI.parseArguments(args);

      expect(result.command).toBe('resume');
      expect(result.runId).toBe('test-run-123');
    });

    it('should parse list command', () => {
      const args = ['node', 'script.js', '--list'];
      const result = CLI.parseArguments(args);

      expect(result.command).toBe('list');
    });

    it('should parse help command', () => {
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
  });

  describe('Pipeline Integration', () => {
    it('should call Pipeline.runPipeline with correct arguments', async () => {
      mockRunPipeline.mockResolvedValue({
        success: true,
        runState: { id: 'test-123', currentStage: 'complete' }
      });

      await CLI.runPipeline('Test Topic', 'daily');
      expect(mockRunPipeline).toHaveBeenCalledWith('Test Topic', 'daily');
    });

    it('should call Pipeline.resumePipeline with correct arguments', async () => {
      mockResumePipeline.mockResolvedValue({
        success: true,
        runState: { id: 'test-123', currentStage: 'complete' }
      });

      await CLI.resumePipeline('test-run-123');
      expect(mockResumePipeline).toHaveBeenCalledWith('test-run-123');
    });

    it('should call Pipeline.listRuns', async () => {
      mockListRuns.mockResolvedValue({
        success: true,
        runs: ['run-1', 'run-2']
      });

      await CLI.listRuns();
      expect(mockListRuns).toHaveBeenCalled();
    });

    it('should handle pipeline failures with process exit', async () => {
      mockRunPipeline.mockResolvedValue({
        success: false,
        runState: { id: 'failed-123', currentStage: 'draft' },
        error: 'Pipeline failed'
      });

      await expect(CLI.runPipeline('Test Topic', 'daily')).rejects.toThrow('Process would exit with code: 1');
    });
  });

  describe('Main CLI Entry Point', () => {
    it('should handle run command through main', async () => {
      mockRunPipeline.mockResolvedValue({
        success: true,
        runState: { id: 'test-123', currentStage: 'complete' }
      });

      const args = ['node', 'script.js', 'Test Topic', '--bucket', 'daily'];
      await CLI.main(args);

      expect(mockRunPipeline).toHaveBeenCalledWith('Test Topic', 'daily');
    });

    it('should handle resume command through main', async () => {
      mockResumePipeline.mockResolvedValue({
        success: true,
        runState: { id: 'test-123', currentStage: 'complete' }
      });

      const args = ['node', 'script.js', '--resume', 'test-run-123'];
      await CLI.main(args);

      expect(mockResumePipeline).toHaveBeenCalledWith('test-run-123');
    });

    it('should handle list command through main', async () => {
      mockListRuns.mockResolvedValue({
        success: true,
        runs: []
      });

      const args = ['node', 'script.js', '--list'];
      await CLI.main(args);

      expect(mockListRuns).toHaveBeenCalled();
    });

    it('should handle help command through main', async () => {
      const args = ['node', 'script.js', '--help'];
      await CLI.main(args);
      
      // Help command should not throw or call pipeline methods
      expect(mockRunPipeline).not.toHaveBeenCalled();
      expect(mockResumePipeline).not.toHaveBeenCalled();
      expect(mockListRuns).not.toHaveBeenCalled();
    });

    it('should handle argument errors', async () => {
      const args = ['node', 'script.js']; // Missing topic

      await expect(CLI.main(args)).rejects.toThrow('Process would exit with code: 1');
    });
  });

  describe('Utility Functions', () => {
    it('should format durations correctly', () => {
      expect(CLI.formatDuration(30000)).toBe('30s');
      expect(CLI.formatDuration(90000)).toBe('1m 30s');
      expect(CLI.formatDuration(3661000)).toBe('61m 1s');
    });
  });
});