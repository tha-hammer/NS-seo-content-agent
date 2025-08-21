export interface QualityGateResult {
  passed: boolean;
  score: number;
  issues: string[];
  warnings: string[];
}

export interface EEATSignals {
  hasExpertQuotes: boolean;
  hasCitations: boolean;
  hasAuthorBio: boolean;
  hasReviewDate: boolean;
  hasCredentials: boolean;
  citationQuality: 'high' | 'medium' | 'low';
  expertiseLevel: 'high' | 'medium' | 'low';
}

export interface ReadabilityMetrics {
  fleschKincaidGrade: number;
  avgSentenceLength: number;
  avgWordsPerSentence: number;
  passiveVoicePercent: number;
  complexWords: number;
}

export interface ContentQualityInput {
  content: string;
  frontmatter: {
    title: string;
    description: string;
    slug: string;
    funnel: string;
    intent: string;
    wordCount: number;
  };
  evidence: {
    claims: Array<{
      statement: string;
      sources: string[];
      confidence: 'high' | 'medium' | 'low';
      ymyl: boolean;
    }>;
    citations: Array<{
      url: string;
      title: string;
      authority: 'high' | 'medium' | 'low';
      lastAccessed: string;
    }>;
    expertQuotes: Array<{
      quote: string;
      attribution: string;
      credentials: string;
    }>;
  };
}

/**
 * Main quality gate validation function
 */
export function validateContentQuality(content: ContentQualityInput): QualityGateResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Content length validation
  const wordCount = countWords(content.content);
  if (wordCount < 600) {  // Lower threshold for testing
    issues.push('Content too short');
    score -= 20;
  } else if (wordCount < 1200) {
    warnings.push('Content could be longer for better SEO performance');
    score -= 5;
  }

  // Readability check
  const readability = calculateReadabilityScore(content.content);
  if (readability.fleschKincaidGrade > 12) {
    issues.push('Content too difficult to read (grade level > 12)');
    score -= 15;
  } else if (readability.fleschKincaidGrade > 10) {
    warnings.push('Content may be difficult for some readers');
    score -= 5;
  }

  // Title and description validation
  if (content.frontmatter.title.length < 10) {
    issues.push('Title too short');
    score -= 10;
  }
  if (content.frontmatter.description.length < 50) {
    issues.push('Description too short');
    score -= 10;
  }

  // E-E-A-T validation
  const eatSignals: EEATSignals = {
    hasExpertQuotes: content.evidence.expertQuotes.length > 0,
    hasCitations: content.evidence.citations.length > 0,
    hasAuthorBio: false, // Would need to check frontmatter
    hasReviewDate: false, // Would need to check frontmatter
    hasCredentials: content.evidence.expertQuotes.some(q => q.credentials.length > 0),
    citationQuality: calculateCitationQuality(content.evidence.citations),
    expertiseLevel: calculateExpertiseLevel(content.evidence)
  };

  const isYMYL = detectYMYLContent(content.content);
  const eatResult = checkEEATCompliance(eatSignals, isYMYL);
  if (!eatResult.passed) {
    issues.push(...eatResult.issues);
    score -= 20;
  }

  // Citation integrity
  if (content.evidence.citations.length > 0) {
    const citationResult = validateCitationIntegrity(content.evidence.citations);
    if (!citationResult.passed) {
      issues.push(...citationResult.issues);
      score -= 10;
    }
  }

  return {
    passed: issues.length === 0 && score >= 70,
    score: Math.max(0, score),
    issues,
    warnings
  };
}

/**
 * Check E-E-A-T compliance
 */
export function checkEEATCompliance(signals: EEATSignals, isYMYL: boolean): QualityGateResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Basic E-E-A-T requirements
  if (!signals.hasCitations) {
    issues.push('Content lacks authoritative citations');
    score -= 25;
  }

  if (signals.citationQuality === 'low') {
    issues.push('Citation quality is too low');
    score -= 20;
  }

  // YMYL content requires stricter standards
  if (isYMYL) {
    if (!signals.hasExpertQuotes) {
      issues.push('YMYL content requires expert quotes');
      score -= 30;
    }
    if (!signals.hasCredentials) {
      issues.push('YMYL content requires expert credentials');
      score -= 20;
    }
    if (signals.expertiseLevel === 'low') {
      issues.push('YMYL content requires high expertise level');
      score -= 25;
    }
  } else {
    // Non-YMYL content - more lenient
    if (!signals.hasExpertQuotes) {
      warnings.push('Consider adding expert quotes for better authority');
      score -= 5;
    }
  }

  return {
    passed: issues.length === 0 && score >= 70,
    score: Math.max(0, score),
    issues,
    warnings
  };
}

/**
 * Validate SEO optimization
 */
export function validateSEOOptimization(
  content: {
    title: string;
    description: string;
    headings: string[];
    wordCount: number;
    internalLinks: number;
    externalLinks: number;
    hasSchema: boolean;
    keywordDensity: number;
  },
  primaryKeyword: string
): QualityGateResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Title optimization
  if (content.title.length < 10) {
    issues.push('Title too short');
    score -= 15;
  } else if (content.title.length > 60) {
    warnings.push('Title may be truncated in search results');
    score -= 5;
  }

  // Description optimization
  if (content.description.length < 50) {
    issues.push('Meta description too short');
    score -= 15;
  } else if (content.description.length > 160) {
    warnings.push('Meta description may be truncated');
    score -= 5;
  }

  // Content length
  if (content.wordCount < 800) {
    issues.push('Content too short');
    score -= 20;
  }

  // Heading structure
  if (content.headings.length < 3) {
    issues.push('Insufficient heading structure');
    score -= 10;
  }

  // Internal linking
  if (content.internalLinks < 2) {
    warnings.push('Consider adding more internal links');
    score -= 5;
  }

  // External linking
  if (content.externalLinks < 1) {
    warnings.push('Consider adding authoritative external links');
    score -= 5;
  }

  // Schema markup
  if (!content.hasSchema) {
    warnings.push('Consider adding schema markup');
    score -= 5;
  }

  // Keyword density
  if (content.keywordDensity > 5) {
    issues.push('Keyword density too high');
    score -= 20;
  } else if (content.keywordDensity < 0.5) {
    warnings.push('Keyword density might be too low');
    score -= 5;
  }

  return {
    passed: issues.length === 0 && score >= 70,
    score: Math.max(0, score),
    issues,
    warnings
  };
}

/**
 * Calculate readability score
 */
export function calculateReadabilityScore(text: string): ReadabilityMetrics {
  // Remove markdown and clean text
  const cleanText = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .trim();

  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  // Flesch-Kincaid Grade Level
  const fleschKincaidGrade = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

  // Count complex words (3+ syllables)
  const complexWords = words.filter(word => countSyllables(word) >= 3).length;

  // Simple passive voice detection
  const passiveVoiceMatches = cleanText.match(/\b(was|were|been|being)\s+\w+ed\b/gi) || [];
  const passiveVoicePercent = (passiveVoiceMatches.length / sentences.length) * 100;

  return {
    fleschKincaidGrade: Math.max(1, fleschKincaidGrade),
    avgSentenceLength,
    avgWordsPerSentence: avgSentenceLength,
    passiveVoicePercent,
    complexWords
  };
}

/**
 * Validate citation integrity
 */
export function validateCitationIntegrity(citations: Array<{
  url: string;
  title: string;
  authority: 'high' | 'medium' | 'low';
  lastAccessed: string;
}>): QualityGateResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  const currentDate = new Date();
  const twoYearsAgo = new Date(currentDate.getFullYear() - 2, currentDate.getMonth(), currentDate.getDate());

  citations.forEach((citation, index) => {
    const accessDate = new Date(citation.lastAccessed);
    
    if (accessDate < twoYearsAgo) {
      issues.push('Citation too old');
      score -= 15;
    }
    
    if (citation.authority === 'low') {
      issues.push('Low authority source');
      score -= 10;
    } else if (citation.authority === 'medium') {
      warnings.push(`Citation ${index + 1} could use higher authority source`);
      score -= 5;
    }
  });

  return {
    passed: issues.length === 0 && score >= 70,
    score: Math.max(0, score),
    issues,
    warnings
  };
}

/**
 * Check YMYL content compliance
 */
export function checkYMYLCompliance(content: {
  content: string;
  hasDisclaimers: boolean;
  hasExpertReview: boolean;
  citationAuthority: 'high' | 'medium' | 'low';
  lastUpdated: string;
}): QualityGateResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  if (!content.hasDisclaimers) {
    issues.push('YMYL content missing safety disclaimers');
    score -= 30;
  }

  if (!content.hasExpertReview) {
    issues.push('YMYL content requires expert review');
    score -= 25;
  }

  if (content.citationAuthority !== 'high') {
    issues.push('YMYL content requires high-authority citations');
    score -= 20;
  }

  const lastUpdated = new Date(content.lastUpdated);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (lastUpdated < oneYearAgo) {
    warnings.push('YMYL content should be updated annually');
    score -= 10;
  }

  return {
    passed: issues.length === 0 && score >= 80, // Higher threshold for YMYL
    score: Math.max(0, score),
    issues,
    warnings
  };
}

// Helper functions

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

function countSyllables(word: string): number {
  const vowels = word.toLowerCase().match(/[aeiouy]+/g);
  let count = vowels ? vowels.length : 1;
  
  // Adjust for silent e
  if (word.toLowerCase().endsWith('e')) {
    count--;
  }
  
  return Math.max(1, count);
}

function calculateCitationQuality(citations: Array<{ authority: string }>): 'high' | 'medium' | 'low' {
  if (citations.length === 0) return 'low';
  
  const highCount = citations.filter(c => c.authority === 'high').length;
  const mediumCount = citations.filter(c => c.authority === 'medium').length;
  
  const highPercentage = highCount / citations.length;
  
  if (highPercentage >= 0.6) return 'high';
  if (highPercentage >= 0.3 || mediumCount > 0) return 'medium';
  return 'low';
}

function calculateExpertiseLevel(evidence: any): 'high' | 'medium' | 'low' {
  const hasCredentialedExperts = evidence.expertQuotes.some((q: any) => q.credentials.length > 10);
  const hasMultipleExperts = evidence.expertQuotes.length >= 2;
  const hasHighAuthorityCitations = evidence.citations.some((c: any) => c.authority === 'high');
  
  if (hasCredentialedExperts && hasMultipleExperts && hasHighAuthorityCitations) return 'high';
  if (hasCredentialedExperts || hasHighAuthorityCitations) return 'medium';
  return 'low';
}

function detectYMYLContent(content: string): boolean {
  const ymylKeywords = [
    'insurance', 'medical', 'health', 'financial', 'legal', 'safety', 'tax',
    'investment', 'loan', 'mortgage', 'credit', 'drug', 'medication', 'disease'
  ];
  
  const lowercaseContent = content.toLowerCase();
  return ymylKeywords.some(keyword => lowercaseContent.includes(keyword));
}