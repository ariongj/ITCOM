import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'dark' | 'light' | 'outline' | 'outlineLight' | 'ghost' | 'danger' | 'soft';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'iconSm';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_10px_24px_-14px_var(--color-brand-700)]',
  dark: 'bg-ink text-paper hover:bg-ink-soft',
  light: 'bg-white text-ink hover:bg-sand shadow-sm',
  outline: 'border border-ink/15 bg-white/40 text-ink hover:border-ink/35 hover:bg-white',
  outlineLight: 'border border-white/45 text-white hover:bg-white/12 backdrop-blur-sm',
  ghost: 'text-ink hover:bg-ink/[0.06]',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-8 px-3 text-xs gap-1.5',
  sm: 'h-9 px-4 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-[15px] gap-2.5',
  icon: 'h-10 w-10',
  iconSm: 'h-8 w-8',
};

export function buttonClass(opts: { variant?: ButtonVariant; size?: ButtonSize; shape?: 'pill' | 'rounded'; className?: string } = {}) {
  const { variant = 'primary', size = 'md', shape = 'pill', className } = opts;
  return cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition-[background,color,border,box-shadow,transform] duration-200 ease-out select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    shape === 'pill' ? 'rounded-full' : 'rounded-lg',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: 'pill' | 'rounded';
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, shape, loading, icon, iconRight, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass({ variant, size, shape, className })} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: 'pill' | 'rounded';
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export function ButtonLink({ variant, size, shape, icon, iconRight, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, size, shape, className: className as string })} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
