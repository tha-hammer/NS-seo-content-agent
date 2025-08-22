import { describe, it, expect } from 'vitest';
import { DraftSchema } from '../../src/schemas.js';

describe('HowTo Blocks Normalization', () => {
  it('should handle string steps in howtoBlocks', () => {
    const mockDraftWithStringSteps = {
      frontmatter: { title: 'Test Draft' },
      markdownContent: '# Test Content\n\nThis is a comprehensive guide about RV buying that contains detailed information, tips, and step-by-step instructions to help you make informed decisions.',
      howtoBlocks: [
        {
          name: 'How to Buy an RV',
          title: 'RV Buying Guide',
          steps: [
            'Research different RV types',
            'Set your budget',
            'Visit dealerships',
            'Inspect the RV thoroughly',
            'Negotiate the price',
            'Complete the purchase'
          ]
        },
        {
          name: 'RV Setup',
          title: 'Setting Up Your New RV',
          steps: [
            'Connect utilities',
            'Test all systems',
            'Stock supplies',
            'Plan your first trip',
            'Enjoy your adventure'
          ]
        }
      ]
    };

    // Apply the same normalization logic as DraftAgent
    if (mockDraftWithStringSteps.howtoBlocks && Array.isArray(mockDraftWithStringSteps.howtoBlocks)) {
      mockDraftWithStringSteps.howtoBlocks = mockDraftWithStringSteps.howtoBlocks.map(block => {
        if (block.steps && Array.isArray(block.steps)) {
          block.steps = block.steps.map((step, index) => {
            // Convert string steps to object format
            if (typeof step === 'string') {
              return {
                step: index + 1,
                description: step,
                text: step
              };
            }
            return step;
          });
        }
        return block;
      });
    }

    // Should now validate against schema
    const result = DraftSchema.safeParse(mockDraftWithStringSteps);
    expect(result.success).toBe(true);

    if (result.success) {
      // Check that steps were properly converted
      expect(result.data.howtoBlocks).toBeDefined();
      expect(result.data.howtoBlocks![0].steps).toBeDefined();
      expect(result.data.howtoBlocks![0].steps![0]).toEqual({
        step: 1,
        description: 'Research different RV types',
        text: 'Research different RV types'
      });
      expect(result.data.howtoBlocks![1].steps![2]).toEqual({
        step: 3,
        description: 'Stock supplies',
        text: 'Stock supplies'
      });
    }
  });

  it('should preserve object steps in howtoBlocks', () => {
    const mockDraftWithObjectSteps = {
      frontmatter: { title: 'Test Draft' },
      markdownContent: '# Test Content\n\nThis is a comprehensive guide about RV buying that contains detailed information, tips, and step-by-step instructions to help you make informed decisions.',
      howtoBlocks: [
        {
          name: 'How to Maintain RV',
          title: 'RV Maintenance Guide',
          steps: [
            { step: 1, description: 'Check tire pressure', text: 'Inspect and inflate tires as needed' },
            { step: 2, description: 'Test brakes', text: 'Ensure braking system works properly' }
          ]
        }
      ]
    };

    const result = DraftSchema.safeParse(mockDraftWithObjectSteps);
    expect(result.success).toBe(true);

    if (result.success) {
      // Check that object steps were preserved
      expect(result.data.howtoBlocks![0].steps![0]).toEqual({
        step: 1,
        description: 'Check tire pressure',
        text: 'Inspect and inflate tires as needed'
      });
    }
  });

  it('should handle mixed string and object steps', () => {
    const mockDraftWithMixedSteps = {
      frontmatter: { title: 'Test Draft' },
      markdownContent: '# Test Content\n\nThis is a comprehensive guide about RV buying that contains detailed information, tips, and step-by-step instructions to help you make informed decisions.',
      howtoBlocks: [
        {
          name: 'Mixed Steps Example',
          title: 'Example Guide',
          steps: [
            'First step as string',
            { step: 2, description: 'Second step as object', text: 'Detailed second step' },
            'Third step as string'
          ]
        }
      ]
    };

    // Apply normalization
    if (mockDraftWithMixedSteps.howtoBlocks && Array.isArray(mockDraftWithMixedSteps.howtoBlocks)) {
      mockDraftWithMixedSteps.howtoBlocks = mockDraftWithMixedSteps.howtoBlocks.map(block => {
        if (block.steps && Array.isArray(block.steps)) {
          block.steps = block.steps.map((step, index) => {
            if (typeof step === 'string') {
              return {
                step: index + 1,
                description: step,
                text: step
              };
            }
            return step;
          });
        }
        return block;
      });
    }

    const result = DraftSchema.safeParse(mockDraftWithMixedSteps);
    expect(result.success).toBe(true);
  });
});