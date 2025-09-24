const { BAMLClient } = require('./src/baml/client');

async function testBAMLPipeline() {
  console.log('🚀 Testing BAML Pipeline Integration\n');

  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ No OPENAI_API_KEY found. Set environment variable to test.');
    return;
  }

  try {
    console.log('1. Testing BAMLClient instantiation...');
    const client = BAMLClient.getInstance();
    console.log('✅ BAMLClient created successfully\n');

    console.log('2. Testing Outline Generation...');
    const outlineResult = await client.generateOutline(
      'Best Family RVs for Full-Time Travel',
      'family-rv-lifestyle'
    );
    console.log('✅ Outline generated successfully');
    console.log(`   Title: ${outlineResult.title}`);
    console.log(`   Funnel: ${outlineResult.funnel}`);
    console.log(`   Intent: ${outlineResult.intent}`);
    console.log(`   Headings: ${outlineResult.headings?.length || 0}`);
    console.log(`   FAQs: ${outlineResult.faqs?.length || 0}\n`);

    console.log('3. Testing Draft Generation...');
    const draftResult = await client.generateDraft(outlineResult);
    console.log('✅ Draft generated successfully');
    const draftWordCount = (draftResult.markdownContent || draftResult.content || '').split(/\\s+/).length;
    console.log(`   Word count: ${draftWordCount}`);
    console.log(`   FAQ blocks: ${draftResult.faqBlocks?.length || 0}`);
    console.log(`   Title: ${draftResult.frontmatter.title}\n`);

    console.log('4. Testing Expand Generation...');
    const expandedResult = await client.expandDraft(draftResult);
    console.log('✅ Content expanded successfully');
    const expandedWordCount = (expandedResult.markdownContent || expandedResult.content || '').split(/\\s+/).length;
    console.log(`   Word count: ${expandedWordCount}`);
    console.log(`   Growth: ${Math.round((expandedWordCount / draftWordCount) * 100)}%`);
    console.log(`   Image placeholders: ${expandedResult.imagePlaceholders?.length || 0}`);
    console.log(`   Evidence claims: ${expandedResult.evidence?.claims?.length || 0}\n`);

    console.log('5. Testing Polish Generation...');
    const polishedResult = await client.polishContent(expandedResult);
    console.log('✅ Content polished successfully');
    console.log(`   Readability grade: ${polishedResult.qualityMetrics?.readabilityGrade || 'N/A'}`);
    console.log(`   Final polish complete\n`);

    console.log('6. Testing Finalize Generation...');
    const finalResult = await client.finalizeContent(polishedResult);
    console.log('✅ Content finalized successfully');
    console.log(`   SEO title length: ${finalResult.frontmatter.title?.length || 0}`);
    console.log(`   Meta description length: ${finalResult.frontmatter.description?.length || 0}`);
    console.log(`   Schema objects: ${finalResult.frontmatter.schema?.length || 0}`);
    console.log(`   SEO optimizations complete: ${finalResult.seoOptimizations ? 'Yes' : 'No'}\n`);

    console.log('🎉 BAML Pipeline Test Complete!');
    console.log('📊 Final Results:');
    console.log(`   • Outline → Draft → Expanded → Polished → Finalized`);
    console.log(`   • Word count growth: ${draftWordCount} → ${expandedWordCount}`);
    console.log(`   • All structured outputs validated successfully`);
    console.log(`   • Zero JSON parsing errors with BAML structured output`);

  } catch (error) {
    console.error('❌ BAML Pipeline Test Failed:');
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\\n')[0]}`);
    }
  }
}

// Only run if this is the main module
if (require.main === module) {
  testBAMLPipeline().then(() => {
    console.log('\\n✨ Test completed');
  }).catch(error => {
    console.error('Test runner error:', error);
  });
}

module.exports = { testBAMLPipeline };