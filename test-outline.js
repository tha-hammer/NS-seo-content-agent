const { OutlineAgent } = require('./dist/agents/OutlineAgent.js');

async function testOutline() {
  console.log('Testing outline generation...');
  try {
    const result = await OutlineAgent.generateOutline('Test RV Topic', 'daily');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testOutline();