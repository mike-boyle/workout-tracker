import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'cyan' | 'purple' | 'green' | 'yellow' | 'red';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant, className = '', ...props }) => {
  const classes: string[] = ['badge'];

  if (variant) {
    classes.push(`badge-${variant}`);
  }

  const combinedClassName = [classes.join(' '), className].filter(Boolean).join(' ');

  return (
    <span className={combinedClassName} {...props}>
      {children}
    </span>
  );
};
