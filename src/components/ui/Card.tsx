import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  className = '',
  ...props
}) => {
  const classes: string[] = ['glass-panel'];

  if (hoverable) {
    classes.push('glass-panel-hover');
  }

  const combinedClassName = [classes.join(' '), className].filter(Boolean).join(' ');

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
};
