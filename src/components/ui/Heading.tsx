import React from 'react';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4;
  color?: 'primary' | 'secondary' | 'muted' | 'cyan' | 'purple' | 'green' | 'yellow' | 'red';
}

export const Heading: React.FC<HeadingProps> = ({
  children,
  level = 2,
  color,
  className = '',
  ...props
}) => {
  const classes: string[] = [];

  if (color) {
    classes.push(`text-${color}`);
  }

  const combinedClassName = [classes.join(' '), className].filter(Boolean).join(' ');
  const Tag = `h${level}` as const;

  return (
    <Tag className={combinedClassName} {...props}>
      {children}
    </Tag>
  );
};
