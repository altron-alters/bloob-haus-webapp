import { describe, it, expect } from 'vitest';
import { stripLeadingTitleHeading } from '../../scripts/utils/title-deduplicator.js';

describe('stripLeadingTitleHeading', () => {
  describe('strips matching H1', () => {
    it('removes H1 when it exactly matches the page title', () => {
      const input = '# Our vision\n\nSome content here.';
      const { content, subtitle } = stripLeadingTitleHeading(input, 'Our vision');
      expect(content).toBe('Some content here.');
      expect(subtitle).toBeNull();
    });

    it('removes the following blank line along with the H1', () => {
      const input = '# Our vision\n\nParagraph one.\n\nParagraph two.';
      const { content } = stripLeadingTitleHeading(input, 'Our vision');
      expect(content).toBe('Paragraph one.\n\nParagraph two.');
    });

    it('removes H1 with no blank line after it', () => {
      const input = '# Our vision\nParagraph immediately after.';
      const { content } = stripLeadingTitleHeading(input, 'Our vision');
      expect(content).toBe('Paragraph immediately after.');
    });

    it('matches case-insensitively', () => {
      const { content } = stripLeadingTitleHeading('# OUR VISION\n\nContent.', 'our vision');
      expect(content).toBe('Content.');
    });

    it('strips inline bold formatting before comparing', () => {
      const { content } = stripLeadingTitleHeading('# Hello **world**\n\nContent.', 'Hello world');
      expect(content).toBe('Content.');
    });

    it('strips inline italic formatting before comparing', () => {
      const { content } = stripLeadingTitleHeading('# Hello *world*\n\nContent.', 'Hello world');
      expect(content).toBe('Content.');
    });

    it('strips inline code before comparing', () => {
      const { content } = stripLeadingTitleHeading('# Hello `world`\n\nContent.', 'Hello world');
      expect(content).toBe('Content.');
    });

    it('strips inline link text before comparing', () => {
      const { content } = stripLeadingTitleHeading('# [Our vision](https://example.com)\n\nContent.', 'Our vision');
      expect(content).toBe('Content.');
    });

    it('ignores Eleventy anchor ID syntax in the heading', () => {
      const { content } = stripLeadingTitleHeading('# Our vision {#our-vision}\n\nContent.', 'Our vision');
      expect(content).toBe('Content.');
    });

    it('handles leading whitespace before the H1', () => {
      const { content } = stripLeadingTitleHeading('\n# Our vision\n\nContent.', 'Our vision');
      expect(content).toBe('Content.');
    });
  });

  describe('subtitle extraction', () => {
    it('extracts H2 immediately following H1 as subtitle', () => {
      const input = '# Interview on the edges\n## Plus a visualization\n\nContent.';
      const { content, subtitle } = stripLeadingTitleHeading(input, 'Interview on the edges');
      expect(subtitle).toBe('Plus a visualization');
      expect(content).toBe('Content.');
    });

    it('does not extract H2 when separated by a blank line', () => {
      const input = '# Our vision\n\n## Not a subtitle\n\nContent.';
      const { content, subtitle } = stripLeadingTitleHeading(input, 'Our vision');
      expect(subtitle).toBeNull();
      expect(content).toBe('## Not a subtitle\n\nContent.');
    });

    it('strips inline formatting from extracted subtitle', () => {
      const input = '# Title\n## Sub **bold** and *italic*\n\nContent.';
      const { subtitle } = stripLeadingTitleHeading(input, 'Title');
      expect(subtitle).toBe('Sub bold and italic');
    });

    it('subtitle content starts after H2 line', () => {
      const input = '# Title\n## Subtitle\nBody text.';
      const { content, subtitle } = stripLeadingTitleHeading(input, 'Title');
      expect(subtitle).toBe('Subtitle');
      expect(content).toBe('Body text.');
    });

    it('returns null subtitle when H1 is followed by H3', () => {
      const input = '# Title\n### Not a subtitle\n\nContent.';
      const { subtitle } = stripLeadingTitleHeading(input, 'Title');
      expect(subtitle).toBeNull();
    });
  });

  describe('does not strip when there is no match', () => {
    it('leaves content unchanged when H1 text differs from title', () => {
      const input = '# Different Heading\n\nContent.';
      const { content, subtitle } = stripLeadingTitleHeading(input, 'Our vision');
      expect(content).toBe(input);
      expect(subtitle).toBeNull();
    });

    it('does not strip H2 even when it matches the title', () => {
      const input = '## Our vision\n\nContent.';
      const { content } = stripLeadingTitleHeading(input, 'Our vision');
      expect(content).toBe(input);
    });

    it('does not strip H3 or deeper', () => {
      const input = '### Our vision\n\nContent.';
      const { content } = stripLeadingTitleHeading(input, 'Our vision');
      expect(content).toBe(input);
    });

    it('leaves content unchanged when there is no leading heading', () => {
      const input = 'Just a paragraph.\n\n## Section';
      const { content } = stripLeadingTitleHeading(input, 'Our vision');
      expect(content).toBe(input);
    });

    it('does not strip a matching H1 that appears mid-document', () => {
      const input = 'Intro paragraph.\n\n# Our vision\n\nContent.';
      const { content } = stripLeadingTitleHeading(input, 'Our vision');
      expect(content).toBe(input);
    });
  });

  describe('edge cases', () => {
    it('returns original content when pageTitle is empty', () => {
      const input = '# Our vision\n\nContent.';
      const { content, subtitle } = stripLeadingTitleHeading(input, '');
      expect(content).toBe(input);
      expect(subtitle).toBeNull();
    });

    it('returns original content when content is empty', () => {
      const { content } = stripLeadingTitleHeading('', 'Our vision');
      expect(content).toBe('');
    });

    it('returns original content when content is null/undefined', () => {
      expect(stripLeadingTitleHeading(null, 'Our vision').content).toBe(null);
      expect(stripLeadingTitleHeading(undefined, 'Our vision').content).toBe(undefined);
    });

    it('handles a title that is the entire content', () => {
      const { content } = stripLeadingTitleHeading('# Our vision\n', 'Our vision');
      expect(content).toBe('');
    });
  });
});
