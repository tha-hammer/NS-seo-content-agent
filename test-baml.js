const { OutlineAgentBAML } = require('./dist/agents/OutlineAgentBAML');

async function testBAML() {
  console.log('Testing BAML implementation...');

  try {
    const result = await OutlineAgentBAML.generateOutline(
      'Best RV for Families with Kids',
      'family-rv'
    );

    console.log('BAML Result:', result.success ? 'SUCCESS' : 'FAILED');
    if (result.error) {
      console.log('Error:', result.error);
    }
    if (result.data) {
      console.log('Title:', result.data.title);
      console.log('Funnel:', result.data.funnel);
      console.log('Headings:', result.data.headings.length);
    }
  } catch (error) {
    console.log('Test failed:', error.message);
  }
}

// Only run if we have an API key
if (process.env.OPENAI_API_KEY) {
  testBAML();
} else {
  console.log('BAML files created successfully - set OPENAI_API_KEY to test');
}