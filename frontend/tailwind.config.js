import tokens from './resources/style-guide.json' with { type: 'json' }
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: { ...tokens, fontFamily: { ...tokens.fontFamily, sans: ['"Plus Jakarta Sans"', 'sans-serif'] } } },
}
