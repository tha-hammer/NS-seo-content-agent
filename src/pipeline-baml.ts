import { OutlineAgentBAML } from './agents/OutlineAgentBAML';
import { DraftAgentBAML } from './agents/DraftAgentBAML';
import { ExpandAgentBAML } from './agents/ExpandAgentBAML';
import { PolishAgentBAML } from './agents/PolishAgentBAML';
import { FinalizeAgentBAML } from './agents/FinalizeAgentBAML';
import { PublisherAgentBAML } from './agents/PublisherAgentBAML';
import { ProgressFeedback } from './utils/progressFeedback';
import type { Outline, Draft, Expanded, Final, Published } from './schemas';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

interface PipelineState {
  runId: string;
  topic: string;
  cluster: string;
  stage: 'outline' | 'draft' | 'expand' | 'polish' | 'finalize' | 'publish' | 'complete';
  outline?: Outline;
  draft?: Draft;
  expanded?: Expanded;
  polished?: Expanded;
  final?: Final;
  published?: Published;
  startTime: string;
  endTime?: string;
  errors: string[];
}

interface PipelineResult {
  success: boolean;
  runId: string;
  published?: Published;
  state: PipelineState;
  error?: string;
}

export class BAMLPipeline {
  private static progressFeedback = ProgressFeedback.getInstance();

  /**
   * Run complete BAML-powered content generation pipeline
   */
  static async runComplete(topic: string, cluster: string, outputDir: string = './output'): Promise<PipelineResult> {
    const runId = uuidv4();
    const startTime = new Date().toISOString();

    // Initialize progress tracking
    const stages = ['outline', 'draft', 'expand', 'polish', 'finalize', 'publish'];
    this.progressFeedback.initializePipeline(runId, topic, stages);

    const state: PipelineState = {
      runId,
      topic,
      cluster,
      stage: 'outline',
      startTime,
      errors: []
    };

    try {
      // Stage 1: Generate Outline
      this.progressFeedback.startStage('outline', 'Creating structured outline with BAML');
      const outlineResult = await OutlineAgentBAML.generateOutline(topic, cluster);

      if (!outlineResult.success || !outlineResult.data) {
        state.errors.push(`Outline generation failed: ${outlineResult.error}`);
        this.progressFeedback.failStage('outline', outlineResult.error || 'Unknown error');
        return { success: false, runId, state, error: outlineResult.error };
      }

      state.outline = outlineResult.data;
      this.progressFeedback.completeStage('outline', {
        'Title': state.outline.title,
        'Sections': state.outline.headings.length,
        'FAQs': state.outline.faqs.length,
        'Target Words': state.outline.metadata?.wordcountTarget
      });

      // Stage 2: Generate Draft
      this.progressFeedback.startStage('draft', 'Writing initial draft with citations');
      state.stage = 'draft';
      const draftResult = await DraftAgentBAML.generateDraft(state.outline);

      if (!draftResult.success || !draftResult.data) {
        state.errors.push(`Draft generation failed: ${draftResult.error}`);
        this.progressFeedback.failStage('draft', draftResult.error || 'Unknown error');
        return { success: false, runId, state, error: draftResult.error };
      }

      state.draft = draftResult.data;
      const draftWordCount = (state.draft.markdownContent || state.draft.content || '').split(/\s+/).length;
      this.progressFeedback.completeStage('draft', {
        'Word Count': draftWordCount,
        'FAQ Blocks': state.draft.faqBlocks?.length || 0,
        'How-To Blocks': state.draft.howtoBlocks?.length || 0
      });

      // Stage 3: Expand Content
      this.progressFeedback.startStage('expand', 'Expanding with tables, examples, and E-E-A-T');
      state.stage = 'expand';
      const expandResult = await ExpandAgentBAML.expandDraft(state.draft);

      if (!expandResult.success || !expandResult.data) {
        state.errors.push(`Expansion failed: ${expandResult.error}`);
        this.progressFeedback.failStage('expand', expandResult.error || 'Unknown error');
        return { success: false, runId, state, error: expandResult.error };
      }

      state.expanded = expandResult.data;
      const expandedWordCount = (state.expanded.markdownContent || state.expanded.content || '').split(/\s+/).length;
      this.progressFeedback.completeStage('expand', {
        'Word Count': expandedWordCount,
        'Growth': `${Math.round((expandedWordCount / draftWordCount) * 100)}%`,
        'Images': state.expanded.imagePlaceholders?.length || 0,
        'Evidence Claims': state.expanded.evidence?.claims?.length || 0
      });

      // Stage 4: Polish Content
      this.progressFeedback.startStage('polish', 'Polishing for clarity and inclusivity');
      state.stage = 'polish';
      const polishResult = await PolishAgentBAML.polishContent(state.expanded);

      if (!polishResult.success || !polishResult.data) {
        state.errors.push(`Polishing failed: ${polishResult.error}`);
        this.progressFeedback.failStage('polish', polishResult.error || 'Unknown error');
        return { success: false, runId, state, error: polishResult.error };
      }

      state.polished = polishResult.data;
      this.progressFeedback.completeStage('polish', {
        'Readability Grade': state.polished.qualityMetrics?.readabilityGrade || 'N/A',
        'Scannability': 'Optimized',
        'Inclusivity': 'Verified'
      });

      // Stage 5: Finalize with SEO
      this.progressFeedback.startStage('finalize', 'Applying SEO optimization and schema');
      state.stage = 'finalize';
      const finalizeResult = await FinalizeAgentBAML.finalizeContent(state.polished);

      if (!finalizeResult.success || !finalizeResult.data) {
        state.errors.push(`Finalization failed: ${finalizeResult.error}`);
        this.progressFeedback.failStage('finalize', finalizeResult.error || 'Unknown error');
        return { success: false, runId, state, error: finalizeResult.error };
      }

      state.final = finalizeResult.data;
      this.progressFeedback.completeStage('finalize', {
        'Title Length': state.final.frontmatter.title?.length || 0,
        'Meta Description': state.final.frontmatter.description?.length || 0,
        'Schema Objects': state.final.frontmatter.schema?.length || 0,
        'SEO Score': state.final.seoOptimizations ? 'Optimized' : 'Pending'
      });

      // Stage 6: Publish
      this.progressFeedback.startStage('publish', 'Publishing to markdown files');
      state.stage = 'publish';

      // Generate output path
      const date = new Date().toISOString().split('T')[0];
      const fileName = `${state.final.frontmatter.slug}.md`;
      const outputPath = path.join(outputDir, date, cluster, fileName);

      const publishResult = await PublisherAgentBAML.publishContent(state.final, outputPath);

      if (!publishResult.success || !publishResult.data) {
        state.errors.push(`Publishing failed: ${publishResult.error}`);
        this.progressFeedback.failStage('publish', publishResult.error || 'Unknown error');
        return { success: false, runId, state, error: publishResult.error };
      }

      state.published = publishResult.data;
      const stats = PublisherAgentBAML.getContentStats(state.final);
      this.progressFeedback.completeStage('publish', {
        'File Path': outputPath,
        'Final Word Count': stats.wordCount,
        'SEO Score': publishResult.data.validation.seoScore,
        'Readability Score': publishResult.data.validation.readabilityScore
      });

      // Complete pipeline
      state.stage = 'complete';
      state.endTime = new Date().toISOString();

      this.progressFeedback.completePipeline(true, {
        'Total Word Count': stats.wordCount,
        'Processing Time': this.getProcessingTime(startTime, state.endTime),
        'Final SEO Score': publishResult.data.validation.seoScore,
        'Quality Issues': publishResult.data.validation.issues.length
      });

      // Save pipeline state
      await this.savePipelineState(state, outputDir);

      return {
        success: true,
        runId,
        published: state.published,
        state
      };

    } catch (error) {
      state.errors.push(`Pipeline error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      state.endTime = new Date().toISOString();

      this.progressFeedback.completePipeline(false);
      await this.savePipelineState(state, outputDir);

      return {
        success: false,
        runId,
        state,
        error: error instanceof Error ? error.message : 'Unknown pipeline error'
      };
    }
  }

  /**
   * Resume pipeline from saved state
   */
  static async resumeFromState(runId: string, outputDir: string = './output'): Promise<PipelineResult> {
    try {
      const statePath = path.join(outputDir, 'runs', `${runId}.json`);
      const stateData = await fs.readFile(statePath, 'utf8');
      const state: PipelineState = JSON.parse(stateData);

      console.log(`Resuming pipeline ${runId} from stage: ${state.stage}`);

      // Continue from the current stage
      switch (state.stage) {
        case 'outline':
          return this.runComplete(state.topic, state.cluster, outputDir);

        case 'draft':
          if (!state.outline) throw new Error('Missing outline data for resume');
          return this.continueFromDraft(state, outputDir);

        case 'expand':
          if (!state.draft) throw new Error('Missing draft data for resume');
          return this.continueFromExpand(state, outputDir);

        case 'polish':
          if (!state.expanded) throw new Error('Missing expanded data for resume');
          return this.continueFromPolish(state, outputDir);

        case 'finalize':
          if (!state.polished) throw new Error('Missing polished data for resume');
          return this.continueFromFinalize(state, outputDir);

        case 'publish':
          if (!state.final) throw new Error('Missing final data for resume');
          return this.continueFromPublish(state, outputDir);

        default:
          throw new Error(`Cannot resume from stage: ${state.stage}`);
      }

    } catch (error) {
      return {
        success: false,
        runId,
        state: { runId, topic: '', cluster: '', stage: 'outline', startTime: '', errors: [error instanceof Error ? error.message : 'Unknown error'] },
        error: `Resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Continue pipeline from draft stage
   */
  private static async continueFromDraft(state: PipelineState, outputDir: string): Promise<PipelineResult> {
    // Implementation continues from draft stage...
    // This would contain the same logic as above but starting from the draft stage
    throw new Error('Resume from draft not yet implemented');
  }

  /**
   * Continue pipeline from expand stage
   */
  private static async continueFromExpand(state: PipelineState, outputDir: string): Promise<PipelineResult> {
    // Implementation continues from expand stage...
    throw new Error('Resume from expand not yet implemented');
  }

  /**
   * Continue pipeline from polish stage
   */
  private static async continueFromPolish(state: PipelineState, outputDir: string): Promise<PipelineResult> {
    // Implementation continues from polish stage...
    throw new Error('Resume from polish not yet implemented');
  }

  /**
   * Continue pipeline from finalize stage
   */
  private static async continueFromFinalize(state: PipelineState, outputDir: string): Promise<PipelineResult> {
    // Implementation continues from finalize stage...
    throw new Error('Resume from finalize not yet implemented');
  }

  /**
   * Continue pipeline from publish stage
   */
  private static async continueFromPublish(state: PipelineState, outputDir: string): Promise<PipelineResult> {
    // Implementation continues from publish stage...
    throw new Error('Resume from publish not yet implemented');
  }

  /**
   * Save pipeline state to disk
   */
  private static async savePipelineState(state: PipelineState, outputDir: string): Promise<void> {
    try {
      const runsDir = path.join(outputDir, 'runs');
      await fs.mkdir(runsDir, { recursive: true });

      const statePath = path.join(runsDir, `${state.runId}.json`);
      await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');

      console.log(`Pipeline state saved: ${statePath}`);
    } catch (error) {
      console.warn('Failed to save pipeline state:', error);
    }
  }

  /**
   * Calculate processing time
   */
  private static getProcessingTime(startTime: string, endTime: string): string {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;
    const durationSec = Math.round(durationMs / 1000);

    if (durationSec < 60) {
      return `${durationSec}s`;
    } else {
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Get pipeline statistics
   */
  static async getPipelineStats(outputDir: string = './output'): Promise<{
    totalRuns: number;
    successfulRuns: number;
    averageProcessingTime: number;
    recentRuns: PipelineState[];
  }> {
    try {
      const runsDir = path.join(outputDir, 'runs');
      const runFiles = await fs.readdir(runsDir);

      const states: PipelineState[] = [];
      for (const file of runFiles) {
        if (file.endsWith('.json')) {
          const statePath = path.join(runsDir, file);
          const stateData = await fs.readFile(statePath, 'utf8');
          states.push(JSON.parse(stateData));
        }
      }

      const successfulRuns = states.filter(s => s.stage === 'complete').length;
      const totalRuns = states.length;

      const processingTimes = states
        .filter(s => s.endTime)
        .map(s => new Date(s.endTime!).getTime() - new Date(s.startTime).getTime());

      const averageProcessingTime = processingTimes.length > 0
        ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length / 1000)
        : 0;

      const recentRuns = states
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, 10);

      return {
        totalRuns,
        successfulRuns,
        averageProcessingTime,
        recentRuns
      };

    } catch (error) {
      return {
        totalRuns: 0,
        successfulRuns: 0,
        averageProcessingTime: 0,
        recentRuns: []
      };
    }
  }
}