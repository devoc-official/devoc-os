import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DeVoc Custom Enterprise Tokens mapping to CSS variables
        devoc: {
          bg: 'var(--bg-app)',
          surface: {
            DEFAULT: 'var(--surface-primary)',
            secondary: 'var(--surface-secondary)',
            tertiary: 'var(--surface-tertiary)',
            elevated: 'var(--surface-elevated)',
          },
          text: {
            primary: 'var(--text-primary)',
            secondary: 'var(--text-secondary)',
            tertiary: 'var(--text-tertiary)',
            disabled: 'var(--text-disabled)',
          },
          border: {
            DEFAULT: 'var(--border-default)',
            strong: 'var(--border-strong)',
            divider: 'var(--divider)',
          },
          brand: {
            DEFAULT: 'var(--brand-primary)',
            hover: 'var(--brand-primary-hover)',
            subtle: 'var(--brand-subtle)',
            ring: 'var(--brand-ring)',
          },
          status: {
            success: {
              bg: 'var(--status-success-bg)',
              text: 'var(--status-success-text)',
              border: 'var(--status-success-border)',
            },
            warning: {
              bg: 'var(--status-warning-bg)',
              text: 'var(--status-warning-text)',
              border: 'var(--status-warning-border)',
            },
            error: {
              bg: 'var(--status-error-bg)',
              text: 'var(--status-error-text)',
              border: 'var(--status-error-border)',
            },
            info: {
              bg: 'var(--status-info-bg)',
              text: 'var(--status-info-text)',
              border: 'var(--status-info-border)',
            },
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      boxShadow: {
        dropdown: '0 4px 12px rgba(0, 0, 0, 0.08)',
        modal: '0 8px 30px rgba(0, 0, 0, 0.12)',
        'modal-dark': '0 8px 30px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
