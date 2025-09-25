import { Pipeline } from './pipeline';
import chalk from 'chalk';

export interface CLIArgs {
  command: 'run' | 'resume' | 'list' | 'help';
  topic?: string;
  bucket?: 'daily' | 'weekly' | 'monthly';
  runId?: string;
}

export class CLI {
  static parseArguments(args: string[]): CLIArgs {
    const [, , ...userArgs] = args;

    // Handle help command
    if (userArgs.includes('--help') || userArgs.includes('-h')) {
      return { command: 'help' };
    }

    // Handle list command
    if (userArgs.includes('--list') || userArgs.includes('-l')) {
      return { command: 'list' };
    }

    // Handle resume command
    const resumeIndex = userArgs.findIndex(arg => arg === '--resume' || arg === '-r');
    if (resumeIndex !== -1) {
      const runId = userArgs[resumeIndex + 1];
      if (!runId || runId.startsWith('-')) {
        throw new Error('Run ID is required for resume command');
      }
      return { command: 'resume', runId };
    }

    // Handle run command (default)
    const bucketIndex = userArgs.findIndex(arg => arg === '--bucket' || arg === '-b');
    let bucket: 'daily' | 'weekly' | 'monthly' = 'daily';
    let topicArgs = [...userArgs];

    if (bucketIndex !== -1) {
      const bucketValue = userArgs[bucketIndex + 1];
      if (!bucketValue || !['daily', 'weekly', 'monthly'].includes(bucketValue)) {
        throw new Error('Invalid bucket type. Must be daily, weekly, or monthly');
      }
      bucket = bucketValue as 'daily' | 'weekly' | 'monthly';
      // Remove bucket args from topic args
      topicArgs.splice(bucketIndex, 2);
    }

    const topic = topicArgs.join(' ').trim();
    if (!topic) {
      throw new Error('Topic is required for pipeline execution');
    }

    return { command: 'run', topic, bucket };
  }

  static async runPipeline(topic: string, bucket: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    console.log(chalk.blue('🚀 Starting pipeline execution...'));
    console.log(chalk.gray(`   Topic: ${topic}`));
    console.log(chalk.gray(`   Bucket: ${bucket}`));
    console.log();

    const startTime = Date.now();

    try {
      const result = await Pipeline.runPipeline(topic, bucket);

      if (result.success) {
        const duration = Date.now() - startTime;
        console.log(chalk.green('✅ Pipeline completed successfully!'));
        console.log();
        console.log(chalk.bold('Results:'));
        console.log(`   Run ID: ${chalk.cyan(result.runState.id)}`);
        console.log(`   Topic: ${chalk.white(result.runState.topic)}`);
        console.log(`   Final Stage: ${chalk.green(result.runState.currentStage)}`);
        console.log(`   Duration: ${chalk.yellow(this.formatDuration(duration))}`);
        console.log();

        if (result.runState.final) {
          console.log(chalk.bold('Content Details:'));
          console.log(`   Title: ${chalk.white(result.runState.final.frontmatter.title)}`);
          console.log(`   Word Count: ${chalk.cyan(result.runState.final.frontmatter.wordcount)}`);
          console.log(`   Reading Time: ${chalk.cyan(result.runState.final.frontmatter.readingTime)} minutes`);
          console.log(`   SEO Score: ${chalk.green('✅ Optimized')}`);
        }
      } else {
        console.log(chalk.red('❌ Pipeline failed'));
        console.log();
        console.log(chalk.bold('Error Details:'));
        console.log(`   Run ID: ${chalk.cyan(result.runState.id)}`);
        console.log(`   Failed at Stage: ${chalk.red(result.runState.currentStage)}`);
        console.log(`   Error: ${chalk.red(result.error)}`);
        console.log();

        if (result.runState.errors && result.runState.errors.length > 0) {
          console.log(chalk.bold('Error History:'));
          result.runState.errors.forEach(error => {
            console.log(`   ${chalk.red('•')} ${error.stage}: ${error.message}`);
          });
          console.log();
        }

        console.log(chalk.yellow('💡 You can resume this pipeline with:'));
        console.log(`   ${chalk.gray('npm run pipeline -- --resume')} ${chalk.cyan(result.runState.id)}`);
        
        process.exit(1);
      }
    } catch (error) {
      console.log(chalk.red('❌ Pipeline execution failed unexpectedly'));
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }

  static async resumePipeline(runId: string): Promise<void> {
    console.log(chalk.blue('🔄 Resuming pipeline execution...'));
    console.log(chalk.gray(`   Run ID: ${runId}`));
    console.log();

    const startTime = Date.now();

    try {
      const result = await Pipeline.resumePipeline(runId);

      if (result.success) {
        const duration = Date.now() - startTime;
        console.log(chalk.green('✅ Pipeline resumed successfully!'));
        console.log();
        console.log(chalk.bold('Results:'));
        console.log(`   Run ID: ${chalk.cyan(result.runState.id)}`);
        console.log(`   Topic: ${chalk.white(result.runState.topic)}`);
        console.log(`   Final Stage: ${chalk.green(result.runState.currentStage)}`);
        console.log(`   Duration: ${chalk.yellow(this.formatDuration(duration))}`);
      } else {
        console.log(chalk.red('❌ Failed to resume pipeline'));
        console.error(chalk.red(`Error: ${result.error}`));
        process.exit(1);
      }
    } catch (error) {
      console.log(chalk.red('❌ Pipeline resume failed unexpectedly'));
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }

  static async listRuns(): Promise<void> {
    console.log(chalk.blue('📋 Listing pipeline runs...'));
    console.log();

    try {
      const result = await Pipeline.listRuns();

      if (result.success && result.runs) {
        if (result.runs.length === 0) {
          console.log(chalk.yellow('No pipeline runs found.'));
          console.log();
          console.log(chalk.gray('Start a new pipeline with:'));
          console.log(`   ${chalk.gray('npm run pipeline')} ${chalk.cyan('"Your Topic Here"')}`);
        } else {
          console.log(chalk.bold(`Available pipeline runs (${result.runs.length}):`));
          console.log();
          result.runs.forEach(runId => {
            console.log(`   ${chalk.cyan('•')} ${runId}`);
          });
          console.log();
          console.log(chalk.gray('Resume a pipeline with:'));
          console.log(`   ${chalk.gray('npm run pipeline -- --resume')} ${chalk.cyan('<run-id>')}`);
        }
      } else {
        console.log(chalk.red('❌ Failed to list runs'));
        console.error(chalk.red(`Error: ${result.error}`));
      }
    } catch (error) {
      console.log(chalk.red('❌ Failed to list runs'));
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  static showHelp(): void {
    console.log();
    console.log(chalk.bold.blue('NS SEO Content Agent'));
    console.log(chalk.gray('AI-powered content generation pipeline'));
    console.log();
    console.log(chalk.bold('Usage:'));
    console.log(`  ${chalk.cyan('npm run pipeline')} ${chalk.yellow('"<topic>"')} ${chalk.gray('[options]')}`);
    console.log();
    console.log(chalk.bold('Commands:'));
    console.log(`  ${chalk.cyan('npm run pipeline')} ${chalk.yellow('"Best RVs Under $30k"')}     Generate content for topic`);
    console.log(`  ${chalk.cyan('npm run pipeline -- --resume')} ${chalk.yellow('<run-id>')}     Resume failed pipeline`);
    console.log(`  ${chalk.cyan('npm run pipeline -- --list')}                List all pipeline runs`);
    console.log(`  ${chalk.cyan('npm run pipeline -- --help')}                Show this help message`);
    console.log();
    console.log(chalk.bold('Options:'));
    console.log(`  ${chalk.green('-b, --bucket')} ${chalk.yellow('<type>')}   Bucket type: daily, weekly, monthly (default: daily)`);
    console.log(`  ${chalk.green('-r, --resume')} ${chalk.yellow('<id>')}     Resume pipeline by run ID`);
    console.log(`  ${chalk.green('-l, --list')}             List available pipeline runs`);
    console.log(`  ${chalk.green('-h, --help')}             Show help information`);
    console.log();
    console.log(chalk.bold('Examples:'));
    console.log(`  ${chalk.gray('# Run pipeline with weekly bucket')}`);
    console.log(`  ${chalk.cyan('npm run pipeline')} ${chalk.yellow('"RV Maintenance Tips"')} ${chalk.green('--bucket weekly')}`);
    console.log();
    console.log(`  ${chalk.gray('# Resume a failed pipeline')}`);
    console.log(`  ${chalk.cyan('npm run pipeline -- --resume')} ${chalk.yellow('a1b2c3d4-e5f6-7890-abcd-ef1234567890')}`);
    console.log();
    console.log(`  ${chalk.gray('# List all pipeline runs')}`);
    console.log(`  ${chalk.cyan('npm run pipeline -- --list')}`);
    console.log();
    console.log(chalk.bold('Pipeline Stages:'));
    console.log(`  ${chalk.green('1.')} ${chalk.white('Outline')} - Create structured outline with SEO planning`);
    console.log(`  ${chalk.green('2.')} ${chalk.white('Draft')} - Write initial content with citations`);
    console.log(`  ${chalk.green('3.')} ${chalk.white('Expand')} - Enrich with examples, tables, and E-E-A-T signals`);
    console.log(`  ${chalk.green('4.')} ${chalk.white('Polish')} - Improve clarity and ensure PAA coverage`);
    console.log(`  ${chalk.green('5.')} ${chalk.white('Finalize')} - Apply SEO optimization and schema markup`);
    console.log(`  ${chalk.green('6.')} ${chalk.white('Publish')} - Output formatted markdown files`);
    console.log();
  }

  static formatDuration(milliseconds: number): string {
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  static async main(args: string[]): Promise<void> {
    try {
      const parsed = this.parseArguments(args);

      switch (parsed.command) {
        case 'run':
          await this.runPipeline(parsed.topic!, parsed.bucket!);
          break;
        case 'resume':
          await this.resumePipeline(parsed.runId!);
          break;
        case 'list':
          await this.listRuns();
          break;
        case 'help':
          this.showHelp();
          break;
        default:
          throw new Error(`Unknown command: ${parsed.command}`);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      console.log();
      console.log(chalk.gray('Use --help for usage information'));
      process.exit(1);
    }
  }
}