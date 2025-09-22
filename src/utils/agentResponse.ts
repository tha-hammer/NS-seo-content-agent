import type { RunResult } from '@openai/agents';
PublishedSchema

export function extractAgentOutput(result: RunResult<any, any>): string | null {
  // Try to extract output from the current step
  const currentStep = result.state._currentStep;
  if (currentStep && currentStep.type === 'next_step_final_output') {
    return currentStep.output;
  }

  // Try to extract from generated items
  if (result.state._generatedItems && result.state._generatedItems.length > 0) {
    const lastItem = result.state._generatedItems[result.state._generatedItems.length - 1];
    
    if (lastItem.type === 'message_output_item' && lastItem.rawItem) {
      const rawItem = lastItem.rawItem;
      if (rawItem.content && Array.isArray(rawItem.content) && rawItem.content.length > 0) {
        const firstContent = rawItem.content[0];
        if (firstContent && typeof firstContent === 'object' && 'text' in firstContent) {
          return firstContent.text;
        }
      }
    }
  }

  // Try to extract from model responses as last resort
  if (result.state._modelResponses && result.state._modelResponses.length > 0) {
    const lastResponse = result.state._modelResponses[result.state._modelResponses.length - 1];
    
    if (lastResponse.output && Array.isArray(lastResponse.output) && lastResponse.output.length > 0) {
      const firstOutput = lastResponse.output[0];
      if (firstOutput && firstOutput.content && Array.isArray(firstOutput.content) && firstOutput.content.length > 0) {
        const firstContent = firstOutput.content[0];
        if (firstContent && typeof firstContent === 'object' && 'text' in firstContent) {
          return firstContent.text;
        }
      }
    }
  }

  return null;
}

export function parseJsonResponse(output: string): { success: boolean; data?: any; error?: string } {
  try {
    // Try to repair and parse the full output first
    const repaired = jsonRepair(output);
    return { success: true, data: JSON.parse(repaired) };
  } catch (jsonError) {
    // If that fails, try to extract a JSON substring and repair/parse it
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const repaired = jsonRepair(jsonMatch[0]);
        return { success: true, data: JSON.parse(repaired) };
      } catch (innerError) {
        return {
          success: false,
          error: `Failed to parse extracted JSON: ${innerError instanceof Error ? innerError.message : 'Unknown error'}`
        };
      }
    } else {
      return {
        success: false,
        error: `No valid JSON found in output: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`
      };
    }
  }
}