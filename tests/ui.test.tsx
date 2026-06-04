import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Flex, Grid, Card, Badge, Heading, Text } from '../src/components/ui';

describe('UI Primitives Unit Tests', () => {
  describe('Flex Component', () => {
    it('should render div with base flex class', () => {
      const { container } = render(<Flex>Flex content</Flex>);
      const el = container.firstChild as HTMLDivElement;
      expect(el).toHaveClass('flex');
      expect(el).not.toHaveClass('inline-flex');
    });

    it('should support inline flex option', () => {
      const { container } = render(<Flex inline>Inline</Flex>);
      expect(container.firstChild).toHaveClass('inline-flex');
      expect(container.firstChild).not.toHaveClass('flex');
    });

    it('should map direction column to class and justify/align to classes', () => {
      const { container } = render(
        <Flex direction="column" align="center" justify="between" gap={4}>
          Flex content
        </Flex>
      );
      const el = container.firstChild as HTMLDivElement;
      expect(el).toHaveClass('flex-col');
      expect(el).toHaveClass('items-center');
      expect(el).toHaveClass('justify-between');
      expect(el).toHaveClass('gap-4');
    });

    it('should map wrap="wrap" and justify="center" to classes', () => {
      const { container } = render(<Flex wrap="wrap" justify="center" />);
      const el = container.firstChild as HTMLDivElement;
      expect(el).toHaveClass('flex-wrap');
      expect(el).toHaveClass('justify-center');
    });

    it('should fallback custom values to style property', () => {
      const { container } = render(
        <Flex direction="row-reverse" align="baseline" justify="around" gap={10}>
          Custom
        </Flex>
      );
      const el = container.firstChild as HTMLDivElement;
      expect(el.style.flexDirection).toBe('row-reverse');
      expect(el.style.alignItems).toBe('baseline');
      expect(el.style.justifyContent).toBe('space-around');
      expect(el.style.gap).toBe('10px');
    });

    it('should cover all branch fallbacks for direction, align, justify, wrap, and gap', () => {
      // 1. direction="row" (should do nothing since row is default)
      const { container: cDirRow } = render(<Flex direction="row" />);
      expect((cDirRow.firstChild as HTMLElement).style.flexDirection).toBe('');

      // 2. align="start", align="end", align="stretch"
      const { container: cAlignStart } = render(<Flex align="start" />);
      expect(cAlignStart.firstChild).toHaveClass('items-start');

      const { container: cAlignEnd } = render(<Flex align="end" />);
      expect(cAlignEnd.firstChild).toHaveClass('items-end');

      const { container: cAlignStretch } = render(<Flex align="stretch" />);
      expect((cAlignStretch.firstChild as HTMLElement).style.alignItems).toBe('stretch');

      // 3. justify="start", justify="end", justify="around", justify="evenly"
      const { container: cJustifyStart } = render(<Flex justify="start" />);
      expect((cJustifyStart.firstChild as HTMLElement).style.justifyContent).toBe('flex-start');

      const { container: cJustifyEnd } = render(<Flex justify="end" />);
      expect((cJustifyEnd.firstChild as HTMLElement).style.justifyContent).toBe('flex-end');

      const { container: cJustifyAround } = render(<Flex justify="around" />);
      expect((cJustifyAround.firstChild as HTMLElement).style.justifyContent).toBe('space-around');

      const { container: cJustifyEvenly } = render(<Flex justify="evenly" />);
      expect((cJustifyEvenly.firstChild as HTMLElement).style.justifyContent).toBe('space-evenly');

      // 4. wrap="nowrap", wrap="wrap-reverse"
      const { container: cWrapNowrap } = render(<Flex wrap="nowrap" />);
      expect((cWrapNowrap.firstChild as HTMLElement).style.flexWrap).toBe('');

      const { container: cWrapRev } = render(<Flex wrap="wrap-reverse" />);
      expect((cWrapRev.firstChild as HTMLElement).style.flexWrap).toBe('wrap-reverse');

      // 5. gap custom string values
      const { container: cGapStr } = render(<Flex gap="2.5rem" />);
      expect((cGapStr.firstChild as HTMLElement).style.gap).toBe('2.5rem');
    });
  });

  describe('Grid Component', () => {
    it('should render display grid styling', () => {
      const { container } = render(<Grid>Grid content</Grid>);
      const el = container.firstChild as HTMLDivElement;
      expect(el.style.display).toBe('grid');
    });

    it('should map columns numeric or string and gap', () => {
      const { container } = render(
        <Grid columns={3} gap={2} align="center">
          Grid content
        </Grid>
      );
      const el = container.firstChild as HTMLDivElement;
      expect(el.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
      expect(el.style.alignItems).toBe('center');
      expect(el).toHaveClass('gap-2');
    });

    it('should support custom column and gap strings and no-align branch', () => {
      const { container } = render(<Grid columns="1fr 2fr" gap="15px" />);
      const el = container.firstChild as HTMLDivElement;
      expect(el.style.gridTemplateColumns).toBe('1fr 2fr');
      expect(el.style.gap).toBe('15px');
      expect(el.style.alignItems).toBe('');
    });

    it('should support custom numeric gaps that are not in 1/2/4/6/8 presets', () => {
      const { container } = render(<Grid gap={3} />);
      const el = container.firstChild as HTMLDivElement;
      expect(el.style.gap).toBe('3px');
    });
  });

  describe('Card Component', () => {
    it('should render glass-panel class', () => {
      const { container } = render(<Card>Card content</Card>);
      expect(container.firstChild).toHaveClass('glass-panel');
      expect(container.firstChild).not.toHaveClass('glass-panel-hover');
    });

    it('should support hoverable style', () => {
      const { container } = render(<Card hoverable>Card hover content</Card>);
      expect(container.firstChild).toHaveClass('glass-panel');
      expect(container.firstChild).toHaveClass('glass-panel-hover');
    });
  });

  describe('Badge Component', () => {
    it('should render badge base class', () => {
      const { container } = render(<Badge>Badge content</Badge>);
      const el = container.firstChild as HTMLSpanElement;
      expect(el.tagName).toBe('SPAN');
      expect(el).toHaveClass('badge');
    });

    it('should render badge variant class', () => {
      const { container } = render(<Badge variant="green">Success</Badge>);
      expect(container.firstChild).toHaveClass('badge-green');
    });
  });

  describe('Heading Component', () => {
    it('should render h2 as default tag', () => {
      const { container } = render(<Heading>Heading 2</Heading>);
      const el = container.firstChild as HTMLHeadingElement;
      expect(el.tagName).toBe('H2');
    });

    it('should render h1-h4 tags based on level prop', () => {
      const { container: c1 } = render(<Heading level={1}>Heading 1</Heading>);
      expect((c1.firstChild as HTMLElement).tagName).toBe('H1');

      const { container: c3 } = render(<Heading level={3}>Heading 3</Heading>);
      expect((c3.firstChild as HTMLElement).tagName).toBe('H3');
    });

    it('should render text color utility class', () => {
      const { container } = render(<Heading color="cyan">Title</Heading>);
      expect(container.firstChild).toHaveClass('text-cyan');
    });
  });

  describe('Text Component', () => {
    it('should render span as default tag', () => {
      const { container } = render(<Text>Text content</Text>);
      const el = container.firstChild as HTMLElement;
      expect(el.tagName).toBe('SPAN');
    });

    it('should support alternate tags', () => {
      const { container: cp } = render(<Text variant="p">Paragraph</Text>);
      expect((cp.firstChild as HTMLElement).tagName).toBe('P');

      const { container: cdiv } = render(<Text variant="div">Div text</Text>);
      expect((cdiv.firstChild as HTMLElement).tagName).toBe('DIV');
    });

    it('should render mapped sizes, weights, and color classes', () => {
      const { container } = render(
        <Text size="sm" weight="semibold" color="muted">
          Detailed text
        </Text>
      );
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveClass('text-muted');
      expect(el.style.fontSize).toBe('0.85rem');
      expect(el.style.fontWeight).toBe('600');
    });

    it('should render custom sizes and weights that are not in presets', () => {
      const { container } = render(
        <Text size="18px" weight={800}>
          Custom style overrides
        </Text>
      );
      const el = container.firstChild as HTMLElement;
      expect(el.style.fontSize).toBe('18px');
      expect(el.style.fontWeight).toBe('800');
    });
  });
});
