import { LinkGraph, LinkNode, LinkEdge } from './schemas.js';

export type { LinkGraph, LinkNode, LinkEdge };

export interface InternalLink {
  slug: string;
  title: string;
  anchor: string;
  priority: number;
  type: LinkEdge['type'];
}

/**
 * Select internal links for a given page based on link graph
 */
export function selectInternalLinks(
  fromSlug: string,
  linkGraph: LinkGraph,
  maxLinks = 6
): InternalLink[] {
  const outgoingEdges = linkGraph.edges
    .filter(edge => edge.from === fromSlug)
    .sort((a, b) => b.priority - a.priority) // Sort by priority descending
    .slice(0, maxLinks);

  return outgoingEdges.map(edge => {
    const targetNode = linkGraph.nodes.find(node => node.slug === edge.to);
    if (!targetNode) {
      throw new Error(`Target node ${edge.to} not found in link graph`);
    }

    return {
      slug: targetNode.slug,
      title: targetNode.title,
      anchor: buildLinkAnchorText(edge, targetNode),
      priority: edge.priority,
      type: edge.type
    };
  });
}

/**
 * Build appropriate anchor text for a link
 */
export function buildLinkAnchorText(
  edge: LinkEdge,
  targetNode: LinkNode,
  useSynonyms = false
): string {
  // First try anchor hints from edge
  if (edge.anchorHints.length > 0) {
    // For now, just use the first hint. Could randomize or use context later
    return edge.anchorHints[0];
  }

  // Fallback to synonyms if requested and available
  if (useSynonyms && targetNode.synonyms && targetNode.synonyms.length > 0) {
    // Randomly select from title and synonyms
    const options = [targetNode.title, ...targetNode.synonyms];
    return options[Math.floor(Math.random() * options.length)];
  }

  // Final fallback to title
  return targetNode.title;
}

/**
 * Find all nodes within a specific cluster
 */
export function findClusterNodes(
  cluster: string,
  linkGraph: LinkGraph,
  nodeType?: LinkNode['type']
): LinkNode[] {
  return linkGraph.nodes.filter(node => {
    const matchesCluster = node.cluster === cluster;
    const matchesType = nodeType ? node.type === nodeType : true;
    return matchesCluster && matchesType;
  });
}

/**
 * Get the pillar page for a cluster
 */
export function getClusterPillar(cluster: string, linkGraph: LinkGraph): LinkNode | null {
  const pillars = findClusterNodes(cluster, linkGraph, 'pillar');
  return pillars.length > 0 ? pillars[0] : null;
}

/**
 * Get supporting pages for a cluster
 */
export function getClusterSupporting(cluster: string, linkGraph: LinkGraph): LinkNode[] {
  return findClusterNodes(cluster, linkGraph, 'supporting');
}

/**
 * Validate link graph for consistency and completeness
 */
export function validateLinkGraph(linkGraph: LinkGraph): void {
  const nodeMap = new Map(linkGraph.nodes.map(node => [node.slug, node]));
  const incomingLinks = new Set<string>();
  const outgoingLinks = new Set<string>();

  // Validate edges
  for (const edge of linkGraph.edges) {
    // Check if nodes exist
    if (!nodeMap.has(edge.from)) {
      throw new Error(`Edge references non-existent node: ${edge.from}`);
    }
    if (!nodeMap.has(edge.to)) {
      throw new Error(`Edge references non-existent node: ${edge.to}`);
    }

    // Check for self-references
    if (edge.from === edge.to) {
      throw new Error(`Self-referencing edge detected: ${edge.from} -> ${edge.to}`);
    }

    // Track connectivity
    outgoingLinks.add(edge.from);
    incomingLinks.add(edge.to);
  }

  // Check for orphaned nodes (nodes with no incoming or outgoing links)
  for (const node of linkGraph.nodes) {
    const hasIncoming = incomingLinks.has(node.slug);
    const hasOutgoing = outgoingLinks.has(node.slug);
    
    if (!hasIncoming && !hasOutgoing) {
      throw new Error(`Orphaned node detected: ${node.slug} has no links`);
    }
  }

  // Validate cluster structure
  const clusters = new Map<string, { pillars: number; supporting: number }>();
  
  for (const node of linkGraph.nodes) {
    if (!clusters.has(node.cluster)) {
      clusters.set(node.cluster, { pillars: 0, supporting: 0 });
    }
    
    const cluster = clusters.get(node.cluster)!;
    if (node.type === 'pillar') {
      cluster.pillars++;
    } else if (node.type === 'supporting') {
      cluster.supporting++;
    }
  }

  // Validate each cluster has at least one pillar
  for (const [clusterName, counts] of clusters) {
    if (counts.pillars === 0) {
      throw new Error(`Cluster '${clusterName}' has no pillar pages`);
    }
    if (counts.pillars > 1) {
      console.warn(`Cluster '${clusterName}' has ${counts.pillars} pillar pages. Consider having only one.`);
    }
  }
}

/**
 * Build internal linking recommendations for content creation
 */
export function buildLinkingStrategy(
  contentSlug: string,
  contentCluster: string,
  linkGraph: LinkGraph,
  funnelStage: 'TOF' | 'MOF' | 'BOF'
): {
  pillarLinks: InternalLink[];
  siblingLinks: InternalLink[];
  nextStepLinks: InternalLink[];
} {
  // Get pillar link (up)
  const pillar = getClusterPillar(contentCluster, linkGraph);
  const pillarLinks: InternalLink[] = pillar && pillar.slug !== contentSlug
    ? selectInternalLinks(contentSlug, linkGraph).filter(link => link.slug === pillar.slug)
    : [];

  // Get sibling links (across)
  const siblingNodes = getClusterSupporting(contentCluster, linkGraph)
    .filter(node => node.slug !== contentSlug);
  const siblingLinks = selectInternalLinks(contentSlug, linkGraph)
    .filter(link => siblingNodes.some(node => node.slug === link.slug))
    .slice(0, 3); // Limit to 3 sibling links

  // Get next-step links based on funnel stage
  const nextStepLinks = selectInternalLinks(contentSlug, linkGraph)
    .filter(link => link.type === 'next-step')
    .slice(0, 2); // Limit to 2 next-step links

  return {
    pillarLinks,
    siblingLinks,
    nextStepLinks
  };
}

/**
 * Generate SEO-friendly anchor text variations
 */
export function generateAnchorVariations(
  targetNode: LinkNode,
  context: 'beginning' | 'middle' | 'end' = 'middle'
): string[] {
  const variations = [targetNode.title];
  
  if (targetNode.synonyms) {
    variations.push(...targetNode.synonyms);
  }

  // Add contextual variations
  const contextualPrefixes = {
    beginning: ['Learn about', 'Discover', 'Find out about'],
    middle: ['our guide to', 'information on', 'details about'],
    end: ['Read more about', 'Learn more', 'Get help with']
  };

  const prefixes = contextualPrefixes[context];
  variations.push(...prefixes.map(prefix => `${prefix} ${targetNode.title.toLowerCase()}`));

  return variations;
}