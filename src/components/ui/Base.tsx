import React from 'react';
import { cn } from '../../utils/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
      secondary: 'bg-slate-100 text-slate-900 dark:text-white hover:bg-slate-200',
      outline: 'border border-slate-200 dark:border-[#2A364A] bg-transparent hover:bg-slate-50 dark:bg-[#121826] text-slate-700 dark:text-slate-200',
      ghost: 'hover:bg-slate-100 text-slate-600 dark:text-slate-300',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2',
      lg: 'h-12 px-8 text-lg',
      icon: 'h-10 w-10 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export const Card = ({ className, children, ...props }: { className?: string; children: React.ReactNode; [key: string]: any }) => (
  <div className={cn('bg-white dark:bg-[#1E2738] rounded-xl border border-slate-100 dark:border-[#2A364A] shadow-sm overflow-hidden', className)} {...props}>
    {children}
  </div>
);

export const Badge = ({ children, className, variant = 'default', ...props }: { children: React.ReactNode; className?: string; variant?: 'default' | 'success' | 'warning' | 'error' | 'info'; [key: string]: any }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:text-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    error: 'bg-red-50 text-red-700 border border-red-100',
    info: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  };

  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)} {...props}>
      {children}
    </span>
  );
};
