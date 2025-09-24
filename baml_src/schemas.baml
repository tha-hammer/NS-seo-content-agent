enum FunnelStage {
  TOF
  MOF
  BOF
}

enum SearchIntent {
  Informational
  Comparative
  Transactional
}

enum TPBClassification {
  Attitude
  Norm
  Perceived_control @@alias("perceived-control")
}

class Metadata {
  primaryKeyword string
  secondaryKeywords string[]
  wordcountTarget int
  readingTime int
  difficulty string
}

class Heading {
  h2 string
  keypoints string[]
  h3 string[]?
}

class FAQ {
  q string
  a string
  a_outline string?
}

class Outline {
  title string
  slug string
  cluster string
  funnel FunnelStage
  intent SearchIntent
  tpb TPBClassification
  targetReader string
  headings Heading[]
  faqs FAQ[]
  metadata Metadata
}

class Frontmatter {
  title string
  description string
  slug string
  date string
  author string
  tags string[]
  category string
  funnel FunnelStage
  intent SearchIntent
  primaryKeyword string
  secondaryKeywords string[]
  wordcount int?
  readingTime int?
  schema string[]?
}

class HowToStep {
  step int
  description string
  text string
}

class HowToBlock {
  title string
  steps HowToStep[]
}

class FAQBlock {
  question string
  answer string
}

class Draft {
  frontmatter Frontmatter
  content string
  markdownContent string?
  faqBlocks FAQBlock[]?
  howtoBlocks HowToBlock[]?
}

class Evidence {
  claims string[]
  citations string[]
  expertQuotes string[]
}

class ImagePlaceholder {
  altText string
  position string
  description string
}

class EATSignals {
  authorBio string
  reviewer string?
  factChecked bool
  reviewDate string
}

class QualityMetrics {
  readabilityGrade int?
  fleschKincaidScore float?
  averageSentenceLength float?
  passiveVoicePercent float?
  keywordDensity string?
  brandVoiceAlignment string?
  toneAlignment string?
}

class Expanded {
  frontmatter Frontmatter
  content string
  markdownContent string?
  evidence Evidence
  imagePlaceholders ImagePlaceholder[]
  eatSignals EATSignals
  qualityMetrics QualityMetrics?
}

class SEOOptimizations {
  titleOptimized bool
  metaDescriptionOptimized bool
  schemaMarkupGenerated bool
  ctaIncluded bool
  keywordDensityOptimized bool
}

class Final {
  frontmatter Frontmatter
  content string
  markdownContent string?
  evidence Evidence
  imagePlaceholders ImagePlaceholder[]
  eatSignals EATSignals
  qualityMetrics QualityMetrics
  seoOptimizations SEOOptimizations
}

class Published {
  frontmatter Frontmatter
  content string
  markdownContent string
  filePath string
  backupPath string
  validation string
}