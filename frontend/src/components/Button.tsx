import type { ButtonHTMLAttributes } from 'react'
interface ButtonProps extends Readonly<ButtonHTMLAttributes<HTMLButtonElement>> { readonly variant?: 'primary' | 'secondary' | 'ghost' }
const variants = { primary: 'button-primary', secondary: 'button-secondary', ghost: 'button-ghost' } as const
export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={'button ' + variants[variant] + ' ' + className} {...props} />
}
