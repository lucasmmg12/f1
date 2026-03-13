/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-main': '#FFFFFF',
        'bg-surface': '#F5F5F5',
        'bg-sidebar': '#0A0A0A',
        'bg-dark': '#0A0A0A',

        // Accents — Formula Zeta
        'accent-primary': '#E53935',
        'accent-secondary': '#FF6F00',
        'accent-cyan': '#0277BD',
        'accent-red': '#D32F2F',
        'accent-amber': '#FF8F00',
        'accent-purple': '#7B1FA2',

        // Text
        'text-heading': '#111827',
        'text-body': '#4B5563',
        'text-muted': '#9CA3AF',
        'text-white': '#FFFFFF',
        'text-gray': '#6B7280',

        // Borders
        'border-light': '#E5E7EB',
        'border-subtle': 'rgba(0, 0, 0, 0.08)',
        'border-medium': '#D1D5DB',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'header': '0 1px 0 rgba(0, 0, 0, 0.08)',
        'glow-primary': '0 0 0 3px rgba(229, 57, 53, 0.15)',
        'glow-primary-hover': '0 0 0 4px rgba(229, 57, 53, 0.25)',
      },
    },
  },
  plugins: [],
}
