import type { ButtonHTMLAttributes } from 'react'
interface ButtonProps extends Readonly<ButtonHTMLAttributes<HTMLButtonElement>> { readonly variant?: 'primary' | 'secondary' | 'ghost' }
export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={'button button-' + variant + ' ' + className} {...props} />
}
