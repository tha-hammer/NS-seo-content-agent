import { RunStateSchema, type RunState, type Outline, type Draft, type Expanded, type Final, type Published } from '@/schemas';
import { OutlineAgent } from '@/agents/OutlineAgent';
import { DraftAgent } from '@/agents/DraftAgent';
import { ExpandAgent } from '@/agents/ExpandAgent';
import { PolishAgent } from '@/agents/PolishAgent';
import { FinalizeAgent } from '@/agents/FinalizeAgent';
import { PublisherAgent } from '@/agents/PublisherAgent';
import { getConfig } from '@/config';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export type PipelineStage = 'outline' | 'draft' | 'expand' | 'polish' | 'finalize' | 'publish' | 'complete';
export type PipelineBucket = 'daily' | 'weekly' | 'monthly';

export interface PipelineResult {
  success: boolean;
  runState: RunState;
  error?: string;
}

export interface StateResult {
  success: boolean;
  data?: RunState;
  error?: string;
}

export class Pipeline {
  static async runPipeline(topic: string, bucket: PipelineBucket): Promise<PipelineResult> {
    // Validate inputs
    if (!topic || topic.trim().length === 0) {
      return {
        success: false,
        runState: {} as RunState,
        error: 'Topic is required and cannot be empty'
      };
    }

    if (!['daily', 'weekly', 'monthly'].includes(bucket)) {
      return {
        success: false,
        runState: {} as RunState,
        error: 'Invalid bucket type. Must be daily, weekly, or monthly'
      };
    }

    const runId = randomUUID();
    const timestamp = new Date().toISOString();

    // Initialize run state
    let runState: RunState = {
      id: runId,
      topic,
      bucket,
      currentStage: 'outline',
      createdAt: timestamp,
      updatedAt: timestamp,
      errors: []
    };

    try {
      // Save initial state
      await this.saveRunState(runState);

      // Stage 1: Outline Generation
      const outlineResult = await OutlineAgent.generateOutline(topic);
      if (!outlineResult.success) {
        return await this.handleStageError(runState, 'outline', outlineResult.error || 'Outline generation failed');
      }

      runState.outline = outlineResult.data;
      runState.currentStage = 'draft';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      // Stage 2: Draft Creation
      const draftResult = await DraftAgent.createDraft(runState.outline!);
      if (!draftResult.success) {
        return await this.handleStageError(runState, 'draft', draftResult.error || 'Draft creation failed');
      }

      runState.draft = draftResult.data;
      runState.currentStage = 'expand';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      // Stage 3: Content Expansion
      const expandResult = await ExpandAgent.expandContent(runState.draft!);
      if (!expandResult.success) {
        return await this.handleStageError(runState, 'expand', expandResult.error || 'Content expansion failed');
      }

      runState.expanded = expandResult.data;
      runState.currentStage = 'polish';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      // Stage 4: Content Polishing
      const polishResult = await PolishAgent.polishContent(runState.expanded!);
      if (!polishResult.success) {
        return await this.handleStageError(runState, 'polish', polishResult.error || 'Content polishing failed');
      }

      runState.expanded = polishResult.data; // Update expanded with polished content
      runState.currentStage = 'finalize';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      // Stage 5: Content Finalization
      const finalizeResult = await FinalizeAgent.finalizeContent(runState.expanded!);
      if (!finalizeResult.success) {
        return await this.handleStageError(runState, 'finalize', finalizeResult.error || 'Content finalization failed');
      }

      runState.final = finalizeResult.data;
      runState.currentStage = 'publish';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      // Stage 6: Content Publishing
      const publishResult = await PublisherAgent.publishContent(runState.final!);
      if (!publishResult.success) {
        return await this.handleStageError(runState, 'publish', publishResult.error || 'Content publishing failed');
      }

      // Pipeline completed successfully
      runState.currentStage = 'complete';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      return {
        success: true,
        runState
      };

    } catch (error) {
      return await this.handleStageError(
        runState,
        runState.currentStage as any,
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  static async resumePipeline(runId: string): Promise<PipelineResult> {
    try {
      // Load existing run state
      const stateResult = await this.getRunState(runId);
      if (!stateResult.success || !stateResult.data) {
        return {
          success: false,
          runState: {} as RunState,
          error: stateResult.error || 'Failed to load run state'
        };
      }

      let runState = stateResult.data;

      // Resume from current stage
      switch (runState.currentStage) {
        case 'complete':
          return { success: true, runState };

        case 'outline':
          return await this.resumeFromOutline(runState);

        case 'draft':
          return await this.resumeFromDraft(runState);

        case 'expand':
          return await this.resumeFromExpand(runState);

        case 'polish':
          return await this.resumeFromPolish(runState);

        case 'finalize':
          return await this.resumeFromFinalize(runState);

        case 'publish':
          return await this.resumeFromPublish(runState);

        default:
          return {
            success: false,
            runState,
            error: `Unknown stage: ${runState.currentStage}`
          };
      }
    } catch (error) {
      return {
        success: false,
        runState: {} as RunState,
        error: `Resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async resumeFromOutline(runState: RunState): Promise<PipelineResult> {
    // Re-run the entire pipeline from outline
    return await this.runPipelineFromStage(runState, 'outline');
  }

  private static async resumeFromDraft(runState: RunState): Promise<PipelineResult> {
    return await this.runPipelineFromStage(runState, 'draft');
  }

  private static async resumeFromExpand(runState: RunState): Promise<PipelineResult> {
    return await this.runPipelineFromStage(runState, 'expand');
  }

  private static async resumeFromPolish(runState: RunState): Promise<PipelineResult> {
    return await this.runPipelineFromStage(runState, 'polish');
  }

  private static async resumeFromFinalize(runState: RunState): Promise<PipelineResult> {
    return await this.runPipelineFromStage(runState, 'finalize');
  }

  private static async resumeFromPublish(runState: RunState): Promise<PipelineResult> {
    return await this.runPipelineFromStage(runState, 'publish');
  }

  private static async runPipelineFromStage(runState: RunState, stage: PipelineStage): Promise<PipelineResult> {
    try {
      runState.updatedAt = new Date().toISOString();

      if (stage === 'outline' || (stage !== 'outline' && !runState.outline)) {
        const outlineResult = await OutlineAgent.generateOutline(runState.topic);
        if (!outlineResult.success) {
          return await this.handleStageError(runState, 'outline', outlineResult.error || 'Outline generation failed');
        }
        runState.outline = outlineResult.data;
        runState.currentStage = 'draft';
        await this.saveRunState(runState);
      }

      if (stage === 'draft' || (stage !== 'draft' && !runState.draft)) {
        const draftResult = await DraftAgent.createDraft(runState.outline!);
        if (!draftResult.success) {
          return await this.handleStageError(runState, 'draft', draftResult.error || 'Draft creation failed');
        }
        runState.draft = draftResult.data;
        runState.currentStage = 'expand';
        await this.saveRunState(runState);
      }

      if (stage === 'expand' || (stage !== 'expand' && !runState.expanded)) {
        const expandResult = await ExpandAgent.expandContent(runState.draft!);
        if (!expandResult.success) {
          return await this.handleStageError(runState, 'expand', expandResult.error || 'Content expansion failed');
        }
        runState.expanded = expandResult.data;
        runState.currentStage = 'polish';
        await this.saveRunState(runState);
      }

      if (stage === 'polish') {
        const polishResult = await PolishAgent.polishContent(runState.expanded!);
        if (!polishResult.success) {
          return await this.handleStageError(runState, 'polish', polishResult.error || 'Content polishing failed');
        }
        runState.expanded = polishResult.data;
        runState.currentStage = 'finalize';
        await this.saveRunState(runState);
      }

      if (stage === 'finalize' || !runState.final) {
        const finalizeResult = await FinalizeAgent.finalizeContent(runState.expanded!);
        if (!finalizeResult.success) {
          return await this.handleStageError(runState, 'finalize', finalizeResult.error || 'Content finalization failed');
        }
        runState.final = finalizeResult.data;
        runState.currentStage = 'publish';
        await this.saveRunState(runState);
      }

      if (stage === 'publish') {
        const publishResult = await PublisherAgent.publishContent(runState.final!);
        if (!publishResult.success) {
          return await this.handleStageError(runState, 'publish', publishResult.error || 'Content publishing failed');
        }
        runState.currentStage = 'complete';
        await this.saveRunState(runState);
      }

      return { success: true, runState };

    } catch (error) {
      return await this.handleStageError(
        runState,
        stage as any,
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private static async handleStageError(runState: RunState, stage: string, errorMessage: string): Promise<PipelineResult> {
    runState.errors.push({
      stage,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
    runState.updatedAt = new Date().toISOString();

    // Save error state
    await this.saveRunState(runState);

    return {
      success: false,
      runState,
      error: `Pipeline failed at stage: ${stage}. Error: ${errorMessage}`
    };
  }

  static async getRunState(runId: string): Promise<StateResult> {
    try {
      const config = getConfig();
      const runsDir = config.paths?.runs || '/tmp/runs';
      const statePath = path.join(runsDir, runId, 'state.json');

      const stateData = await fs.readFile(statePath, 'utf-8');
      const stateObj = JSON.parse(stateData);

      // Validate state against schema
      const validation = RunStateSchema.safeParse(stateObj);
      if (!validation.success) {
        return {
          success: false,
          error: `Invalid run state: ${validation.error.message}`
        };
      }

      return {
        success: true,
        data: validation.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load run state: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async saveRunState(runState: RunState): Promise<{ success: boolean; error?: string }> {
    try {
      const config = getConfig();
      const runsDir = config.paths?.runs || '/tmp/runs';
      const runDir = path.join(runsDir, runState.id);
      const statePath = path.join(runDir, 'state.json');

      // Ensure directory exists
      await fs.mkdir(runDir, { recursive: true });

      // Save state to file
      await fs.writeFile(statePath, JSON.stringify(runState, null, 2), 'utf-8');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save run state: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async listRuns(): Promise<{ success: boolean; runs?: string[]; error?: string }> {
    try {
      const config = getConfig();
      const runsDir = config.paths?.runs || '/tmp/runs';

      // Check if runs directory exists
      try {
        await fs.access(runsDir);
      } catch {
        return { success: true, runs: [] };
      }

      const entries = await fs.readdir(runsDir, { withFileTypes: true });
      const runs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

      return { success: true, runs };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list runs: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}