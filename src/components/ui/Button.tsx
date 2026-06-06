import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-amber-500 text-slate-900 hover:bg-amber-400 focus:ring-amber-500 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30': variant === 'primary',
            'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500': variant === 'secondary',
            'bg-emerald-500 text-white hover:bg-emerald-400 focus:ring-emerald-500': variant === 'success',
            'bg-red-500 text-white hover:bg-red-400 focus:ring-red-500': variant === 'danger',
            'text-slate-300 hover:text-white hover:bg-slate-700/50': variant === 'ghost',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
