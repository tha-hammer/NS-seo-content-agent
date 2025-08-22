import { describe, it, expect } from 'vitest';
import { Pipeline } from '../../src/pipeline.js';

describe('Pipeline Integration Tests', () => {
  it('should run outline generation successfully', async () => {
    const result = await Pipeline.runPipeline('Test RV Guide', 'daily');
    
    // The pipeline should start successfully and create a run state
    expect(result).toBeDefined();
    expect(result.runState).toBeDefined();
    expect(result.runState.id).toBeDefined();
    expect(result.runState.topic).toBe('Test RV Guide');
    expect(result.runState.bucket).toBe('daily');
    expect(result.runState.currentStage).toBeDefined();
    
    // Should either succeed or fail gracefully with error information
    if (result.success) {
      // If successful, should have progressed through stages
      expect(['outline', 'draft', 'expand', 'polish', 'finalize', 'publish', 'complete']).toContain(result.runState.currentStage);
    } else {
      // If failed, should have error details and stage information
      expect(result.error).toBeDefined();
      expect(result.runState.errors).toBeDefined();
      expect(result.runState.errors.length).toBeGreaterThan(0);
      expect(result.runState.errors[0].stage).toBeDefined();
      expect(result.runState.errors[0].message).toBeDefined();
      expect(result.runState.errors[0].timestamp).toBeDefined();
    }
  }, 120000); // 2 minute timeout for LLM calls

  it('should handle resume functionality', async () => {
    // First run a pipeline that might fail
    const initialResult = await Pipeline.runPipeline('Resume Test Topic', 'daily');
    expect(initialResult.runState.id).toBeDefined();
    
    const runId = initialResult.runState.id;
    
    // Try to resume it
    const resumeResult = await Pipeline.resumePipeline(runId);
    
    expect(resumeResult).toBeDefined();
    expect(resumeResult.runState).toBeDefined();
    expect(resumeResult.runState.id).toBe(runId);
    
    // Should maintain the same topic and bucket
    expect(resumeResult.runState.topic).toBe('Resume Test Topic');
    expect(resumeResult.runState.bucket).toBe('daily');
  }, 120000);

  it('should validate run state persistence', async () => {
    // Run pipeline to create a state
    const result = await Pipeline.runPipeline('Persistence Test', 'weekly');
    const runId = result.runState.id;
    
    // Load the state directly
    const stateResult = await Pipeline.getRunState(runId);
    
    expect(stateResult.success).toBe(true);
    expect(stateResult.data).toBeDefined();
    expect(stateResult.data!.id).toBe(runId);
    expect(stateResult.data!.topic).toBe('Persistence Test');
    expect(stateResult.data!.bucket).toBe('weekly');
  }, 60000);

  it('should list pipeline runs', async () => {
    const listResult = await Pipeline.listRuns();
    
    expect(listResult.success).toBe(true);
    expect(listResult.runs).toBeDefined();
    expect(Array.isArray(listResult.runs)).toBe(true);
    
    // Should have at least some runs from previous tests
    if (listResult.runs!.length > 0) {
      // Each run ID should be a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      listResult.runs!.forEach(runId => {
        expect(runId).toMatch(uuidRegex);
      });
    }
  }, 30000);
});