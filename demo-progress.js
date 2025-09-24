#!/usr/bin/env node

// Demo script to show the new progress feedback system
// Run with: node demo-progress.js

const { ProgressFeedback } = require('./src/utils/progressFeedback');

async function demoProgressFeedback() {
  console.log('🎬 Demo: New Progress Feedback System\n');

  const progressFeedback = ProgressFeedback.getInstance();
  const stages = ['outline', 'draft', 'expand', 'polish', 'finalize', 'publish'];

  // Initialize pipeline
  progressFeedback.initializePipeline('demo-123', 'How to Finance an RV Purchase', stages);

  // Simulate each stage with delays
  for (const stage of stages) {
    const stageDetails = getStageDetails(stage);

    progressFeedback.startStage(stage, stageDetails.description);

    // Simulate processing time
    await sleep(1000 + Math.random() * 2000); // 1-3 seconds

    // Simulate some progress updates
    if (Math.random() > 0.7) {
      progressFeedback.updateStageProgress(stage, 'Processing content structure...', {
        'Progress': '50%'
      });
      await sleep(500);
    }

    if (Math.random() > 0.8) {
      progressFeedback.updateStageProgress(stage, 'Validating output...', {
        'Validation': 'In Progress'
      });
      await sleep(300);
    }

    // Complete the stage
    progressFeedback.completeStage(stage, stageDetails.metrics);

    // Show pipeline progress every few stages
    if (['draft', 'polish', 'publish'].includes(stage)) {
      progressFeedback.displayPipelineProgress();
    }

    await sleep(500); // Brief pause between stages
  }

  // Complete the pipeline
  progressFeedback.completePipeline(true, {
    'Total Word Count': 2450,
    'Processing Time': '2m 15s',
    'SEO Score': 92,
    'Quality Score': 88
  });

  console.log('\\n🎯 This is what you\'ll see when you run:');
  console.log('   npm run pipeline "how to finance an RV purchase"');
  console.log('\\n📝 Key Features Demonstrated:');
  console.log('   ✅ Real-time stage progress with color-coded status');
  console.log('   ✅ Progress bars showing pipeline completion');
  console.log('   ✅ Detailed metrics for each stage');
  console.log('   ✅ Agent-specific processing feedback');
  console.log('   ✅ Final summary with quality scores');
}

function getStageDetails(stage) {
  const details = {
    outline: {
      description: 'Creating structured outline with SEO planning',
      metrics: {
        'Title': 'How to Finance an RV Purchase: Complete 2024 Guide',
        'Sections': 6,
        'FAQs': 8,
        'Target Words': 2200
      }
    },
    draft: {
      description: 'Writing initial content with citations',
      metrics: {
        'Word Count': 1250,
        'FAQ Blocks': 3,
        'How-To Blocks': 2,
        'Citations': 12
      }
    },
    expand: {
      description: 'Enriching with tables, examples, and E-E-A-T signals',
      metrics: {
        'Word Count': 2180,
        'Growth': '174%',
        'Images': 5,
        'Evidence Claims': 18,
        'Tables': 3
      }
    },
    polish: {
      description: 'Polishing for clarity, scannability, and inclusivity',
      metrics: {
        'Readability Grade': 9.2,
        'Scannability': 'Optimized',
        'PAA Questions': '6 Integrated',
        'Inclusivity': 'Verified'
      }
    },
    finalize: {
      description: 'Applying SEO optimization and schema markup',
      metrics: {
        'Title Length': 54,
        'Meta Description': 147,
        'Schema Objects': 2,
        'SEO Score': 'Optimized',
        'Keyword Density': '2.1%'
      }
    },
    publish: {
      description: 'Publishing to markdown files and generating backups',
      metrics: {
        'File Path': './output/2024-09-24/finance/rv-financing-guide.md',
        'Final Word Count': 2450,
        'Backup Created': 'Yes',
        'Validation': 'Passed'
      }
    }
  };

  return details[stage] || { description: 'Processing...', metrics: {} };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
if (require.main === module) {
  demoProgressFeedback().catch(console.error);
}

module.exports = { demoProgressFeedback };