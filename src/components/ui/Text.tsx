import React from 'react';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'p' | 'span' | 'div';
  color?: 'primary' | 'secondary' | 'muted' | 'cyan' | 'purple' | 'green' | 'yellow' | 'red';
  size?: 'xs' | 'sm' | 'base' | 'lg' | string;
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | string | number;
}

const SIZE_MAP: Record<string, string> = {
  xs: '0.7rem',
  sm: '0.85rem',
  base: '1rem',
  lg: '1.2rem',
};

const WEIGHT_MAP: Record<string, string | number> = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'span',
  color,
  size,
  weight,
  className = '',
  style,
  ...props
}) => {
  const classes: string[] = [];
  const styles: React.CSSProperties = { ...style };

  // Map color to utility classes
  if (color) {
    classes.push(`text-${color}`);
  }

  // Map size
  if (size) {
    styles.fontSize = SIZE_MAP[size] || size;
  }

  // Map weight
  if (weight) {
    styles.fontWeight = WEIGHT_MAP[weight] || weight;
  }

  const combinedClassName = [classes.join(' '), className].filter(Boolean).join(' ');
  const Tag = variant;

  return (
    <Tag className={combinedClassName} style={styles} {...props}>
      {children}
    </Tag>
  );
};
