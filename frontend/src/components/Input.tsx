import { useId, type InputHTMLAttributes } from 'react'
interface InputProps extends Readonly<InputHTMLAttributes<HTMLInputElement>> { readonly label: string; readonly hint?: string }
export function Input({ label, hint, id, className = '', ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return <div className="field"><label htmlFor={inputId}>{label}</label><input id={inputId} className={'input ' + className} aria-describedby={hint ? inputId + '-hint' : undefined} {...props} />{hint && <p id={inputId + '-hint'} className="muted text-xs">{hint}</p>}</div>
}
