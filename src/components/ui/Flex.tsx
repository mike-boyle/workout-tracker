import React from 'react';

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  align?: 'center' | 'start' | 'end' | 'stretch' | 'baseline';
  justify?: 'center' | 'start' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  gap?: 1 | 2 | 4 | 6 | 8 | number;
  inline?: boolean;
}

export const Flex: React.FC<FlexProps> = ({
  children,
  direction,
  align,
  justify,
  wrap,
  gap,
  inline = false,
  className = '',
  style,
  ...props
}) => {
  const classes: string[] = [inline ? 'inline-flex' : 'flex'];
  const styles: React.CSSProperties = { ...style };

  // Map direction
  if (direction === 'column') {
    classes.push('flex-col');
  } else if (direction && direction !== 'row') {
    styles.flexDirection = direction;
  }

  // Map align-items
  if (align === 'center') {
    classes.push('items-center');
  } else if (align === 'start') {
    classes.push('items-start');
  } else if (align === 'end') {
    classes.push('items-end');
  } else if (align) {
    styles.alignItems = align;
  }

  // Map justify-content
  if (justify === 'center') {
    classes.push('justify-center');
  } else if (justify === 'between') {
    classes.push('justify-between');
  } else if (justify) {
    // Map standard justify options to CSS values if they differ
    let justifyValue: string = justify;
    if (justify === 'start') justifyValue = 'flex-start';
    if (justify === 'end') justifyValue = 'flex-end';
    if (justify === 'around') justifyValue = 'space-around';
    if (justify === 'evenly') justifyValue = 'space-evenly';
    styles.justifyContent = justifyValue;
  }

  // Map wrap
  if (wrap === 'wrap') {
    classes.push('flex-wrap');
  } else if (wrap && wrap !== 'nowrap') {
    styles.flexWrap = wrap;
  }

  // Map gap
  if (gap === 1 || gap === 2 || gap === 4 || gap === 6 || gap === 8) {
    classes.push(`gap-${gap}`);
  } else if (typeof gap === 'number') {
    styles.gap = `${gap}px`;
  } else if (gap) {
    styles.gap = gap;
  }

  const combinedClassName = [classes.join(' '), className].filter(Boolean).join(' ');

  return (
    <div className={combinedClassName} style={styles} {...props}>
      {children}
    </div>
  );
};
