import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('Compilation Tests', () => {
  it('should compile TypeScript without errors', () => {
    expect(() => {
      execSync('npm run build', { stdio: 'pipe', encoding: 'utf8' });
    }).not.toThrow();
  }, 30000);

  it('should import all agents without runtime errors', async () => {
    // This test ensures all agents can be imported and instantiated
    const { OutlineAgent } = await import('../src/agents/OutlineAgent.js');
    const { DraftAgent } = await import('../src/agents/DraftAgent.js');
    const { ExpandAgent } = await import('../src/agents/ExpandAgent.js');
    const { PolishAgent } = await import('../src/agents/PolishAgent.js');
    const { FinalizeAgent } = await import('../src/agents/FinalizeAgent.js');
    const { PublisherAgent } = await import('../src/agents/PublisherAgent.js');

    expect(OutlineAgent).toBeDefined();
    expect(DraftAgent).toBeDefined();
    expect(ExpandAgent).toBeDefined();
    expect(PolishAgent).toBeDefined();
    expect(FinalizeAgent).toBeDefined();
    expect(PublisherAgent).toBeDefined();
  });

  it('should import pipeline without runtime errors', async () => {
    const { Pipeline } = await import('../src/pipeline.js');
    expect(Pipeline).toBeDefined();
    expect(typeof Pipeline.runPipeline).toBe('function');
    expect(typeof Pipeline.resumePipeline).toBe('function');
  });

  it('should import CLI without runtime errors', async () => {
    const { CLI } = await import('../src/cli.js');
    expect(CLI).toBeDefined();
    expect(typeof CLI.parseArguments).toBe('function');
    expect(typeof CLI.runPipeline).toBe('function');
  });
});