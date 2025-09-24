import chalk from 'chalk';

export interface StageProgress {
  stage: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  details?: string;
  metrics?: Record<string, any>;
}

export interface PipelineProgress {
  runId: string;
  topic: string;
  currentStage: string;
  stages: StageProgress[];
  startTime: Date;
  totalStages: number;
  completedStages: number;
}

export class ProgressFeedback {
  private static instance: ProgressFeedback;
  private currentProgress: PipelineProgress | null = null;

  static getInstance(): ProgressFeedback {
    if (!ProgressFeedback.instance) {
      ProgressFeedback.instance = new ProgressFeedback();
    }
    return ProgressFeedback.instance;
  }

  initializePipeline(runId: string, topic: string, stages: string[]): void {
    this.currentProgress = {
      runId,
      topic,
      currentStage: stages[0],
      stages: stages.map(stage => ({
        stage,
        status: 'pending'
      })),
      startTime: new Date(),
      totalStages: stages.length,
      completedStages: 0
    };

    console.log(chalk.blue.bold(`\n🚀 Starting SEO Content Pipeline`));
    console.log(chalk.gray(`Run ID: ${runId}`));
    console.log(chalk.gray(`Topic: ${topic}`));
    console.log(chalk.gray(`Stages: ${stages.length}\n`));
  }

  startStage(stageName: string, details?: string): void {
    if (!this.currentProgress) return;

    const stage = this.currentProgress.stages.find(s => s.stage === stageName);
    if (stage) {
      stage.status = 'running';
      stage.startTime = new Date();
      stage.details = details;
    }

    this.currentProgress.currentStage = stageName;

    const stageIndex = this.currentProgress.stages.findIndex(s => s.stage === stageName);
    const progress = Math.round((stageIndex / this.currentProgress.totalStages) * 100);

    console.log(chalk.yellow.bold(`⚙️  ${stageName} [${progress}%]`));
    if (details) {
      console.log(chalk.gray(`   ${details}`));
    }
  }

  updateStageProgress(stageName: string, details: string, metrics?: Record<string, any>): void {
    if (!this.currentProgress) return;

    const stage = this.currentProgress.stages.find(s => s.stage === stageName);
    if (stage) {
      stage.details = details;
      stage.metrics = { ...stage.metrics, ...metrics };
    }

    console.log(chalk.cyan(`   📝 ${details}`));

    if (metrics) {
      Object.entries(metrics).forEach(([key, value]) => {
        console.log(chalk.gray(`      ${key}: ${value}`));
      });
    }
  }

  completeStage(stageName: string, metrics?: Record<string, any>): void {
    if (!this.currentProgress) return;

    const stage = this.currentProgress.stages.find(s => s.stage === stageName);
    if (stage) {
      stage.status = 'completed';
      stage.endTime = new Date();
      stage.metrics = { ...stage.metrics, ...metrics };
    }

    this.currentProgress.completedStages++;

    const duration = stage?.startTime && stage?.endTime
      ? Math.round((stage.endTime.getTime() - stage.startTime.getTime()) / 1000)
      : 0;

    console.log(chalk.green.bold(`✅ ${stageName} completed (${duration}s)`));

    if (metrics) {
      Object.entries(metrics).forEach(([key, value]) => {
        console.log(chalk.green(`   ${key}: ${value}`));
      });
    }
    console.log('');
  }

  failStage(stageName: string, error: string): void {
    if (!this.currentProgress) return;

    const stage = this.currentProgress.stages.find(s => s.stage === stageName);
    if (stage) {
      stage.status = 'failed';
      stage.endTime = new Date();
      stage.details = error;
    }

    console.log(chalk.red.bold(`❌ ${stageName} failed`));
    console.log(chalk.red(`   Error: ${error}`));
    console.log('');
  }

  displayPipelineProgress(): void {
    if (!this.currentProgress) return;

    const { completedStages, totalStages } = this.currentProgress;
    const percentage = Math.round((completedStages / totalStages) * 100);

    console.log(chalk.blue(`📊 Pipeline Progress: ${completedStages}/${totalStages} (${percentage}%)`));

    // Progress bar
    const barLength = 20;
    const filledLength = Math.round((completedStages / totalStages) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    console.log(chalk.blue(`   [${bar}] ${percentage}%`));

    // Stage status
    this.currentProgress.stages.forEach(stage => {
      const icon = this.getStageIcon(stage.status);
      const color = this.getStageColor(stage.status);
      console.log(color(`   ${icon} ${stage.stage}`));
    });
    console.log('');
  }

  completePipeline(success: boolean, finalMetrics?: Record<string, any>): void {
    if (!this.currentProgress) return;

    const endTime = new Date();
    const totalDuration = Math.round((endTime.getTime() - this.currentProgress.startTime.getTime()) / 1000);

    if (success) {
      console.log(chalk.green.bold(`🎉 Pipeline completed successfully! (${totalDuration}s)`));
      console.log(chalk.green(`Topic: ${this.currentProgress.topic}`));

      if (finalMetrics) {
        console.log(chalk.green.bold(`📊 Final Metrics:`));
        Object.entries(finalMetrics).forEach(([key, value]) => {
          console.log(chalk.green(`   ${key}: ${value}`));
        });
      }
    } else {
      console.log(chalk.red.bold(`💥 Pipeline failed! (${totalDuration}s)`));
      console.log(chalk.red(`Topic: ${this.currentProgress.topic}`));
    }

    console.log('');
    this.currentProgress = null;
  }

  private getStageIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '⚙️';
      case 'failed': return '❌';
      default: return '⏳';
    }
  }

  private getStageColor(status: string): (text: string) => string {
    switch (status) {
      case 'completed': return chalk.green;
      case 'running': return chalk.yellow;
      case 'failed': return chalk.red;
      default: return chalk.gray;
    }
  }

  // Quality metrics display helpers
  displayQualityMetrics(metrics: Record<string, any>): void {
    console.log(chalk.blue.bold('📊 Quality Metrics:'));

    Object.entries(metrics).forEach(([category, data]) => {
      console.log(chalk.cyan(`   ${category}:`));

      if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([key, value]) => {
          const color = this.getMetricColor(key, value);
          console.log(color(`      ${key}: ${value}`));
        });
      } else {
        console.log(chalk.gray(`      ${data}`));
      }
    });
    console.log('');
  }

  private getMetricColor(key: string, value: any): (text: string) => string {
    if (typeof value !== 'number') return chalk.gray;

    // SEO metrics
    if (key.includes('density') || key.includes('Density')) {
      return value >= 1.5 && value <= 2.5 ? chalk.green : chalk.yellow;
    }

    // Readability metrics
    if (key.includes('readability') || key.includes('Readability')) {
      return value >= 8 && value <= 10 ? chalk.green : chalk.yellow;
    }

    // Quality scores (usually 0-100)
    if (key.includes('score') || key.includes('Score')) {
      if (value >= 80) return chalk.green;
      if (value >= 60) return chalk.yellow;
      return chalk.red;
    }

    // Percentages
    if (key.includes('percent') || key.includes('Percent')) {
      if (key.includes('passive')) {
        return value <= 15 ? chalk.green : chalk.yellow;
      }
      return value >= 75 ? chalk.green : chalk.yellow;
    }

    return chalk.gray;
  }

  // Agent-specific feedback
  displayAgentFeedback(agentName: string, input: any, output: any, processingTime: number): void {
    console.log(chalk.magenta.bold(`🤖 ${agentName} Processing:`));
    console.log(chalk.gray(`   Processing time: ${processingTime}ms`));

    // Input summary
    if (input?.frontmatter?.title) {
      console.log(chalk.gray(`   Input: ${input.frontmatter.title}`));
    }

    // Output summary
    if (output?.frontmatter?.title) {
      console.log(chalk.gray(`   Output: ${output.frontmatter.title}`));
    }

    // Content length tracking
    const inputLength = (input?.content || input?.markdownContent || '').length;
    const outputLength = (output?.content || output?.markdownContent || '').length;

    if (inputLength && outputLength) {
      const growth = Math.round(((outputLength - inputLength) / inputLength) * 100);
      const color = growth > 0 ? chalk.green : chalk.red;
      console.log(color(`   Content growth: ${growth}% (${inputLength} → ${outputLength} chars)`));
    }

    console.log('');
  }
}