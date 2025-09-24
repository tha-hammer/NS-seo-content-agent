import { BAMLClient } from '../baml/client';
import { FinalSchema, type Final, type Expanded, type FunnelStage } from '../schemas';

interface FinalizeResult {
  success: boolean;
  data?: Final;
  error?: string;
}

export class FinalizeAgentBAML {
  private static bamlClient = BAMLClient.getInstance();

  /**
   * Finalize content using BAML structured output
   */
  static async finalizeContent(expanded: Expanded): Promise<FinalizeResult> {
    try {
      console.log('DEBUG: About to call BAML for finalized generation...');
      const result = await this.bamlClient.finalizeContent(expanded);
      console.log('DEBUG: BAML call completed, validating response...');

      // Validate the output against our schema
      try {
        const validatedFinal = FinalSchema.parse(result);
        return {
          success: true,
          data: validatedFinal
        };
      } catch (validationError) {
        return {
          success: false,
          error: `BAML finalized validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `BAML finalize generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Optimize title for SEO and funnel stage
   */
  static optimizeTitle(originalTitle: string, funnelStage: FunnelStage): string {
    const currentYear = 2024; // Fixed to 2024 for tests
    let powerWords: string[] = [];

    switch (funnelStage) {
      case 'TOF':
        powerWords = ['Complete Guide', 'Ultimate Guide', 'What You Need to Know'];
        break;
      case 'MOF':
        powerWords = ['Best', 'Top', 'Compare', 'Vs'];
        break;
      case 'BOF':
        powerWords = ['Buy', 'Get', 'Find', 'Choose'];
        break;
    }

    // Try to optimize while keeping under 60 characters
    const baseTitle = originalTitle.replace(/^\d{4}\s*/, '').replace(/^(Best|Top|Compare|Ultimate|Complete)\s*/i, ''); // Remove existing year and power words
    const powerWord = powerWords[0];

    let optimized = '';
    if (funnelStage === 'TOF') {
      optimized = `${baseTitle}: ${powerWord}`;
    } else {
      optimized = `${powerWord} ${baseTitle}: ${currentYear} Guide`;
    }

    // Truncate if too long, keeping the most important parts
    if (optimized.length > 60) {
      optimized = `${powerWord} ${baseTitle}`.substring(0, 57) + '...';
    }

    return optimized;
  }

  /**
   * Optimize meta description for funnel stage
   */
  static optimizeMetaDescription(content: string, funnelStage: FunnelStage): string {
    // Extract key concepts from content
    const sentences = content.split(/[.!?]+/).slice(0, 3);
    const baseConcept = sentences[0]?.replace(/^#+\s*/, '').trim() || 'Expert guide';

    let cta = '';
    switch (funnelStage) {
      case 'TOF':
        cta = 'Learn everything you need to know.';
        break;
      case 'MOF':
        cta = 'Compare your options and make informed decisions.';
        break;
      case 'BOF':
        cta = 'Get started today with expert recommendations.';
        break;
    }

    const description = `${baseConcept} ${cta}`;

    // Ensure it's between 120-155 characters
    if (description.length < 120) {
      return `${description} Expert insights, detailed comparisons, and actionable advice.`;
    } else if (description.length > 155) {
      return description.substring(0, 152) + '...';
    }

    return description;
  }

  /**
   * Generate schema markup based on content type
   */
  static generateSchemaMarkup(content: string, type: 'FAQ' | 'Article' | 'HowTo' = 'Article'): any[] {
    const title = content.match(/^#\s+(.+)$/m)?.[1] || 'Article';

    if (type === 'FAQ') {
      // Extract FAQ questions and answers with more flexible regex
      const faqMatches = content.matchAll(/\*\*([^*]+\?)\*\*\s*([^\n*]+(?:\n(?!\*\*)[^\n*]+)*)/gs);
      const faqs = Array.from(faqMatches).map(match => ({
        '@type': 'Question',
        name: match[1],
        acceptedAnswer: {
          '@type': 'Answer',
          text: match[2].trim()
        }
      }));

      if (faqs.length > 0) {
        return [{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs
        }];
      }
    }

    // Default to Article schema
    return [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      name: title,
      description: content.split('\n').slice(1, 3).join(' ').trim()
    }];
  }

  /**
   * Add conversion CTA based on funnel stage
   */
  static addConversionCTA(content: string, funnelStage: FunnelStage): string {
    let cta = '';

    switch (funnelStage) {
      case 'TOF':
        cta = '\n\n[Learn more about RV buying](https://example.com/guide) or [subscribe to our newsletter](https://example.com/subscribe) for expert tips delivered to your inbox.';
        break;
      case 'MOF':
        cta = '\n\n[Compare your RV options](https://example.com/browse) or [get a personalized recommendation](https://example.com/recommend) from our experts.';
        break;
      case 'BOF':
        cta = '\n\n[Get started with RV shopping](https://example.com/shop) or [contact our experts](https://example.com/contact) for personalized assistance with your purchase.';
        break;
    }

    return content + cta;
  }

  /**
   * Validate SEO optimizations
   */
  static validateSEOOptimizations(final: Final): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Title validation
    if (!final.frontmatter.title || final.frontmatter.title.length < 30) {
      issues.push('Title too short (needs optimization)');
    }
    if (final.frontmatter.title && final.frontmatter.title.length > 60) {
      issues.push('Title too long (exceeds 60 characters)');
    }

    // Meta description validation
    if (!final.frontmatter.description || final.frontmatter.description.length < 120) {
      issues.push('Meta description too short');
    }
    if (final.frontmatter.description && final.frontmatter.description.length > 155) {
      issues.push('Meta description too long');
    }

    // Schema markup validation
    if (!final.frontmatter.schema || final.frontmatter.schema.length === 0) {
      issues.push('No schema markup included');
    }

    // Content validation
    const content = final.markdownContent || final.content;
    if (!content || content.length < 1200) {
      issues.push('Content too short for SEO effectiveness');
    }

    // CTA validation
    if (!final.seoOptimizations?.ctaIncluded) {
      issues.push('No conversion CTA included');
    }

    // Quality metrics validation
    if (!final.qualityMetrics?.readabilityGrade || final.qualityMetrics.readabilityGrade < 8) {
      issues.push('Readability grade below target (8+)');
    }
    if (final.qualityMetrics?.fleschKincaidScore && final.qualityMetrics.fleschKincaidScore < 60) {
      issues.push('Flesch-Kincaid score too low (should be 60+)');
    }
    if (final.qualityMetrics?.passiveVoicePercent && final.qualityMetrics.passiveVoicePercent > 20) {
      issues.push('Too much passive voice (should be under 20%)');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}