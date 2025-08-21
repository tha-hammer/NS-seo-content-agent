import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  selectInternalLinks, 
  validateLinkGraph, 
  buildLinkAnchorText,
  findClusterNodes,
  type LinkGraph,
  type LinkNode,
  type LinkEdge 
} from '@/taxonomy';

describe('Taxonomy and Linking', () => {
  let sampleLinkGraph: LinkGraph;

  beforeEach(() => {
    sampleLinkGraph = {
      nodes: [
        {
          slug: 'rv-buying-guide',
          title: 'Complete RV Buying Guide',
          cluster: 'buying',
          type: 'pillar',
          synonyms: ['RV purchase guide', 'buying an RV']
        },
        {
          slug: 'rv-inspection-checklist',
          title: 'RV Inspection Checklist',
          cluster: 'buying',
          type: 'supporting',
          synonyms: ['RV inspection', 'checking used RV']
        },
        {
          slug: 'rv-financing-options',
          title: 'RV Financing Options',
          cluster: 'buying',
          type: 'supporting',
          synonyms: ['RV loans', 'financing an RV']
        },
        {
          slug: 'best-travel-trailers',
          title: 'Best Travel Trailers 2024',
          cluster: 'reviews',
          type: 'pillar',
          synonyms: ['top travel trailers', 'travel trailer reviews']
        },
        {
          slug: 'rv-maintenance-basics',
          title: 'RV Maintenance Basics',
          cluster: 'maintenance',
          type: 'pillar',
          synonyms: ['RV upkeep', 'maintaining your RV']
        }
      ],
      edges: [
        {
          from: 'rv-buying-guide',
          to: 'rv-inspection-checklist',
          anchorHints: ['inspection checklist', 'how to inspect an RV'],
          priority: 9,
          type: 'pillar-to-supporting'
        },
        {
          from: 'rv-buying-guide',
          to: 'rv-financing-options',
          anchorHints: ['financing options', 'RV loans'],
          priority: 8,
          type: 'pillar-to-supporting'
        },
        {
          from: 'rv-inspection-checklist',
          to: 'rv-buying-guide',
          anchorHints: ['buying guide', 'complete guide'],
          priority: 7,
          type: 'supporting-to-pillar'
        },
        {
          from: 'rv-inspection-checklist',
          to: 'rv-financing-options',
          anchorHints: ['financing', 'loan options'],
          priority: 6,
          type: 'cross-supporting'
        },
        {
          from: 'rv-buying-guide',
          to: 'best-travel-trailers',
          anchorHints: ['best travel trailers', 'travel trailer reviews'],
          priority: 5,
          type: 'next-step'
        },
        {
          from: 'rv-maintenance-basics',
          to: 'rv-buying-guide',
          anchorHints: ['buying guide', 'purchase advice'],
          priority: 4,
          type: 'cross-supporting'
        }
      ]
    };
  });

  describe('selectInternalLinks', () => {
    it('should select links based on priority', () => {
      const links = selectInternalLinks('rv-buying-guide', sampleLinkGraph, 3);
      
      expect(links).toHaveLength(3);
      expect(links[0].slug).toBe('rv-inspection-checklist');
      expect(links[0].priority).toBe(9);
      expect(links[1].slug).toBe('rv-financing-options');
      expect(links[1].priority).toBe(8);
      expect(links[2].slug).toBe('best-travel-trailers');
      expect(links[2].priority).toBe(5);
    });

    it('should include anchor text from hints', () => {
      const links = selectInternalLinks('rv-buying-guide', sampleLinkGraph, 2);
      
      expect(links[0].anchor).toBe('inspection checklist');
      expect(links[1].anchor).toBe('financing options');
    });

    it('should fallback to title if no anchor hints', () => {
      const graphWithoutHints: LinkGraph = {
        nodes: [
          { slug: 'source', title: 'Source Article', cluster: 'test', type: 'pillar' },
          { slug: 'target', title: 'Target Article', cluster: 'test', type: 'supporting' }
        ],
        edges: [
          {
            from: 'source',
            to: 'target',
            anchorHints: [],
            priority: 5,
            type: 'pillar-to-supporting'
          }
        ]
      };

      const links = selectInternalLinks('source', graphWithoutHints, 1);
      expect(links[0].anchor).toBe('Target Article');
    });

    it('should return empty array if no outgoing links', () => {
      const links = selectInternalLinks('non-existent-slug', sampleLinkGraph, 5);
      expect(links).toHaveLength(0);
    });

    it('should respect maxLinks parameter', () => {
      const links = selectInternalLinks('rv-buying-guide', sampleLinkGraph, 2);
      expect(links).toHaveLength(2);
    });
  });

  describe('validateLinkGraph', () => {
    it('should validate a correct link graph', () => {
      expect(() => validateLinkGraph(sampleLinkGraph)).not.toThrow();
    });

    it('should throw error for orphaned nodes', () => {
      const orphanedGraph: LinkGraph = {
        nodes: [
          { slug: 'connected1', title: 'Connected 1', cluster: 'test', type: 'pillar' },
          { slug: 'connected2', title: 'Connected 2', cluster: 'test', type: 'supporting' },
          { slug: 'orphan', title: 'Orphaned', cluster: 'test', type: 'supporting' }
        ],
        edges: [
          {
            from: 'connected1',
            to: 'connected2',
            anchorHints: ['link'],
            priority: 5,
            type: 'pillar-to-supporting'
          }
        ]
      };

      expect(() => validateLinkGraph(orphanedGraph)).toThrow('Orphaned node detected');
    });

    it('should throw error for edges pointing to non-existent nodes', () => {
      const invalidGraph: LinkGraph = {
        nodes: [
          { slug: 'source', title: 'Source', cluster: 'test', type: 'pillar' }
        ],
        edges: [
          {
            from: 'source',
            to: 'non-existent',
            anchorHints: ['link'],
            priority: 5,
            type: 'pillar-to-supporting'
          }
        ]
      };

      expect(() => validateLinkGraph(invalidGraph)).toThrow('Edge references non-existent node');
    });

    it('should throw error for self-referencing edges', () => {
      const selfRefGraph: LinkGraph = {
        nodes: [
          { slug: 'self-ref', title: 'Self Reference', cluster: 'test', type: 'pillar' }
        ],
        edges: [
          {
            from: 'self-ref',
            to: 'self-ref',
            anchorHints: ['self link'],
            priority: 5,
            type: 'pillar-to-supporting'
          }
        ]
      };

      expect(() => validateLinkGraph(selfRefGraph)).toThrow('Self-referencing edge detected');
    });
  });

  describe('buildLinkAnchorText', () => {
    it('should select anchor text from hints', () => {
      const edge: LinkEdge = {
        from: 'source',
        to: 'target',
        anchorHints: ['best option', 'top choice', 'recommended'],
        priority: 5,
        type: 'pillar-to-supporting'
      };
      const node: LinkNode = {
        slug: 'target',
        title: 'Target Article',
        cluster: 'test',
        type: 'supporting'
      };

      const anchor = buildLinkAnchorText(edge, node);
      expect(['best option', 'top choice', 'recommended']).toContain(anchor);
    });

    it('should fallback to title when no hints', () => {
      const edge: LinkEdge = {
        from: 'source',
        to: 'target',
        anchorHints: [],
        priority: 5,
        type: 'pillar-to-supporting'
      };
      const node: LinkNode = {
        slug: 'target',
        title: 'Target Article',
        cluster: 'test',
        type: 'supporting'
      };

      const anchor = buildLinkAnchorText(edge, node);
      expect(anchor).toBe('Target Article');
    });

    it('should use synonyms as fallback', () => {
      const edge: LinkEdge = {
        from: 'source',
        to: 'target',
        anchorHints: [],
        priority: 5,
        type: 'pillar-to-supporting'
      };
      const node: LinkNode = {
        slug: 'target',
        title: 'Target Article',
        cluster: 'test',
        type: 'supporting',
        synonyms: ['alternative name', 'another term']
      };

      const anchor = buildLinkAnchorText(edge, node, true);
      expect(['Target Article', 'alternative name', 'another term']).toContain(anchor);
    });
  });

  describe('findClusterNodes', () => {
    it('should find all nodes in a cluster', () => {
      const buyingNodes = findClusterNodes('buying', sampleLinkGraph);
      
      expect(buyingNodes).toHaveLength(3);
      expect(buyingNodes.map(n => n.slug)).toContain('rv-buying-guide');
      expect(buyingNodes.map(n => n.slug)).toContain('rv-inspection-checklist');
      expect(buyingNodes.map(n => n.slug)).toContain('rv-financing-options');
    });

    it('should return empty array for non-existent cluster', () => {
      const nodes = findClusterNodes('non-existent', sampleLinkGraph);
      expect(nodes).toHaveLength(0);
    });

    it('should filter by node type when specified', () => {
      const pillars = findClusterNodes('buying', sampleLinkGraph, 'pillar');
      expect(pillars).toHaveLength(1);
      expect(pillars[0].slug).toBe('rv-buying-guide');

      const supporting = findClusterNodes('buying', sampleLinkGraph, 'supporting');
      expect(supporting).toHaveLength(2);
    });
  });
});