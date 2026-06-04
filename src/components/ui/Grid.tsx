import React from 'react';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number | string;
  gap?: 1 | 2 | 4 | 6 | 8 | number | string;
  align?: 'center' | 'start' | 'end' | 'stretch';
}

export const Grid: React.FC<GridProps> = ({
  children,
  columns,
  gap,
  align,
  className = '',
  style,
  ...props
}) => {
  const styles: React.CSSProperties = {
    display: 'grid',
    ...style,
  };
  const classes: string[] = [];

  // Map columns
  if (typeof columns === 'number') {
    styles.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  } else if (columns) {
    styles.gridTemplateColumns = columns;
  }

  // Map gap
  if (gap === 1 || gap === 2 || gap === 4 || gap === 6 || gap === 8) {
    classes.push(`gap-${gap}`);
  } else if (typeof gap === 'number') {
    styles.gap = `${gap}px`;
  } else if (gap) {
    styles.gap = gap;
  }

  // Map align
  if (align) {
    styles.alignItems = align;
  }

  const combinedClassName = [classes.join(' '), className].filter(Boolean).join(' ');

  return (
    <div className={combinedClassName} style={styles} {...props}>
      {children}
    </div>
  );
};
