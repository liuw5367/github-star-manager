import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'compact' | 'default' | 'touch'
  loading?: boolean
  children: ReactNode
}

export function Button({ variant = 'secondary', size = 'default', loading = false, className = '', children, disabled, ...props }: ButtonProps) {
  return <button type="button" className={`ui-button ui-button-${variant} ui-button-${size} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{children}</button>
}

export function IconButton({ label, size = 'default', className = '', ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & { label: string, size?: 'compact' | 'default' | 'touch' }) {
  return <button type="button" className={`ui-icon-button ui-button-${size} ${className}`} aria-label={label} title={label} {...props} />
}
