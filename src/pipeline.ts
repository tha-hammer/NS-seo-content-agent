import { type Published } from '@/schemas';
import { b, type Outline, type Draft, type Expanded, type Final } from '../baml_client';
import { BAMLClient } from '@/baml/client';

// Define RunState type using BAML types instead of Zod
export interface RunState {
  id: string;
  topic: string;
  bucket: 'daily' | 'weekly' | 'monthly';
  currentStage: 'outline' | 'draft' | 'expand' | 'polish' | 'finalize' | 'link' | 'publish' | 'complete';
  outline?: Outline;
  draft?: Draft;
  expanded?: Expanded;
  final?: Final;
  published?: Published;
  createdAt: string;
  updatedAt: string;
  errorHistory: Array<{
    stage: string;
    message: string;
    timestamp: string;
  }>;
}
import { DraftAgent } from '@/agents/DraftAgent';
import { ExpandAgent } from '@/agents/ExpandAgent';
import { PolishAgent } from '@/agents/PolishAgent';
import { FinalizeAgent } from '@/agents/FinalizeAgent';
import { PublisherAgent } from '@/agents/PublisherAgent';
import { ProgressFeedback } from '@/utils/progressFeedback';
import { getConfig } from '@/config';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { repairJson } from '@toolsycc/json-repair';

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
  private static progressFeedback = ProgressFeedback.getInstance();
  private static bamlClient = BAMLClient.getInstance();

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

    // Initialize progress tracking with all pipeline stages
    const stages = ['outline', 'draft', 'expand', 'polish', 'finalize', 'publish'];
    this.progressFeedback.initializePipeline(runId, topic, stages);

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
      this.progressFeedback.startStage('outline', 'Creating structured outline with SEO planning');
      // Convert bucket to cluster name
      const cluster = bucket === 'daily' ? 'daily-content' : bucket === 'weekly' ? 'weekly-guides' : 'monthly-deep-dives';
      runState.outline = await this.bamlClient.generateOutline(topic, cluster);
      this.progressFeedback.completeStage('outline', {
        'Title': runState.outline.title,
        'Sections': runState.outline.headings?.length || 0,
        'FAQs': runState.outline.faqs?.length || 0,
        'Target Words': runState.outline.metadata?.wordcountTarget || 0
      });

      runState.currentStage = 'draft';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      // Stage 2: Draft Creation
      this.progressFeedback.startStage('draft', 'Writing initial content with citations');
      runState.draft = await this.bamlClient.generateDraft(runState.outline!);
      const draftWordCount = (runState.draft.markdownContent || runState.draft.content || '').split(/\s+/).length;
      this.progressFeedback.completeStage('draft', {
        'Word Count': draftWordCount,
        'FAQ Blocks': runState.draft.faqBlocks?.length || 0,
        'How-To Blocks': runState.draft.howtoBlocks?.length || 0
      });

      runState.currentStage = 'expand';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      // Stage 3: Content Expansion
      this.progressFeedback.startStage('expand', 'Enriching with tables, examples, and E-E-A-T signals');
      runState.expanded = await this.bamlClient.expandDraft(runState.draft!);
      const expandedWordCount = (runState.expanded.markdownContent || runState.expanded.content || '').split(/\s+/).length;
      const baseDraftWordCount = (runState.draft!.markdownContent || runState.draft!.content || '').split(/\s+/).length;
      this.progressFeedback.completeStage('expand', {
        'Word Count': expandedWordCount,
        'Growth': `${Math.round((expandedWordCount / baseDraftWordCount) * 100)}%`,
        'Images': runState.expanded.imagePlaceholders?.length || 0,
        'Evidence Claims': runState.expanded.evidence?.claims?.length || 0
      });

      runState.currentStage = 'polish';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      // Stage 4: Content Polishing
      this.progressFeedback.startStage('polish', 'Polishing for clarity, scannability, and inclusivity');
      runState.expanded = await this.bamlClient.polishContent(runState.expanded!); // Update expanded with polished content
      this.progressFeedback.completeStage('polish', {
        'Readability Grade': runState.expanded.qualityMetrics?.readabilityGrade || 'N/A',
        'Scannability': 'Optimized',
        'PAA Questions': 'Integrated',
        'Inclusivity': 'Verified'
      });

      runState.currentStage = 'finalize';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      // Stage 5: Content Finalization
      this.progressFeedback.startStage('finalize', 'Applying SEO optimization and schema markup');
      runState.final = await this.bamlClient.finalizeContent(runState.expanded!);
      this.progressFeedback.completeStage('finalize', {
        'Title Length': runState.final.frontmatter.title?.length || 0,
        'Meta Description': runState.final.frontmatter.description?.length || 0,
        'Schema Objects': runState.final.frontmatter.schema?.length || 0,
        'SEO Score': runState.final.seoOptimizations ? 'Optimized' : 'Pending'
      });

      runState.currentStage = 'publish';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      // Stage 6: Content Publishing
      this.progressFeedback.startStage('publish', 'Publishing to markdown files and generating backups');
      const publishResult = await PublisherAgent.publishContent(runState.final!, runState.id);
      if (!publishResult.success) {
        this.progressFeedback.failStage('publish', publishResult.error || 'Content publishing failed');
        return await this.handleStageError(runState, 'publish', publishResult.error || 'Content publishing failed');
      }

      runState.published = publishResult.data;
      const finalWordCount = (runState.final!.markdownContent || runState.final!.content || '').split(/\s+/).length;
      this.progressFeedback.completeStage('publish', {
        'File Path': publishResult.data?.filePath || 'Generated',
        'Final Word Count': finalWordCount,
        'Backup Created': publishResult.data?.backupPath ? 'Yes' : 'No',
        'Publication': 'Complete'
      });

      // Pipeline completed successfully
      runState.currentStage = 'complete';
      runState.updatedAt = new Date().toISOString();
      await this.saveRunState(runState);

      // Complete pipeline with final metrics
      const processingTime = new Date().getTime() - new Date(runState.createdAt).getTime();
      this.progressFeedback.completePipeline(true, {
        'Total Word Count': finalWordCount,
        'Processing Time': `${Math.round(processingTime / 1000)}s`,
        'Pipeline': 'Success',
        'Run ID': runState.id
      });

      return {
        success: true,
        runState
      };

    } catch (error) {
      // Complete pipeline with failure
      this.progressFeedback.completePipeline(false);
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
        const cluster = runState.bucket === 'daily' ? 'daily-content' : runState.bucket === 'weekly' ? 'weekly-guides' : 'monthly-deep-dives';
        runState.outline = await this.bamlClient.generateOutline(runState.topic, cluster);
        runState.currentStage = 'draft';
        await this.saveRunState(runState);
      }

      if (stage === 'draft' || (stage !== 'draft' && !runState.draft)) {
        runState.draft = await this.bamlClient.generateDraft(runState.outline!);
        runState.currentStage = 'expand';
        await this.saveRunState(runState);
      }

      if (stage === 'expand' || (stage !== 'expand' && !runState.expanded)) {
        runState.expanded = await this.bamlClient.expandDraft(runState.draft!);
        runState.currentStage = 'polish';
        await this.saveRunState(runState);
      }

      if (stage === 'polish') {
        runState.expanded = await this.bamlClient.polishContent(runState.expanded!);
        runState.currentStage = 'finalize';
        await this.saveRunState(runState);
      }

      if (stage === 'finalize' || !runState.final) {
        runState.final = await this.bamlClient.finalizeContent(runState.expanded!);
        runState.currentStage = 'publish';
        await this.saveRunState(runState);
      }

      if (stage === 'publish') {
        const publishResult = await PublisherAgent.publishContent(runState.final!, runState.id);
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
      //const stateObj = JSON.parse(stateData);
      const repairedJson = repairJson(stateData);
      const stateObj = JSON.parse(repairedJson);

      // Return state object directly since BAML handles validation
      return {
        success: true,
        data: stateObj as RunState
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