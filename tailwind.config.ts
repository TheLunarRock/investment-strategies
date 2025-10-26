import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'rounded': ['"M PLUS Rounded 1c"', 'sans-serif'],
        'mono': ['Fira Code', 'monospace'],
        'retro': ['Press Start 2P', 'cursive'],
        'cyber': ['Orbitron', 'sans-serif'],
      },
      colors: {
        // Cyberpunk colors
        'neon-green': '#00ff00',
        'neon-pink': '#ff00ff',
        'neon-blue': '#00ffff',
        'neon-yellow': '#ffff00',
        'neon-orange': '#ff8800',
        
        // Glassmorphism
        'glass-white': 'rgba(255, 255, 255, 0.25)',
        'glass-black': 'rgba(0, 0, 0, 0.25)',
        
        // Memphis/Bauhaus
        'bauhaus-red': '#e63946',
        'bauhaus-blue': '#2a9d8f',
        'bauhaus-yellow': '#f4a261',
        
        // Natural/Organic
        'earth-brown': '#8b4513',
        'leaf-green': '#228b22',
        'sky-blue': '#87ceeb',
        'sand-beige': '#f4e4c1',
      },
      boxShadow: {
        // Neumorphism shadows
        'neumorphism': '20px 20px 60px #d1d1d1, -20px -20px 60px #ffffff',
        'neumorphism-inset': 'inset 20px 20px 60px #d1d1d1, inset -20px -20px 60px #ffffff',
        'neumorphism-dark': '20px 20px 60px #0a0a0a, -20px -20px 60px #2a2a2a',
        
        // Glassmorphism shadows
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        
        // Brutalism shadows
        'brutal': '10px 10px 0px #000',
        'brutal-color': '10px 10px 0px #ff00ff',
        
        // Cyberpunk glow
        'neon': '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
      },
      backgroundImage: {
        // Gradient presets
        'gradient-sunset': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-ocean': 'linear-gradient(135deg, #667eea 0%, #4ca1af 100%)',
        'gradient-fire': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-forest': 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
        'gradient-cyberpunk': 'linear-gradient(135deg, #00ff00 0%, #ff00ff 100%)',
        'gradient-vaporwave': 'linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
        
        // Retro patterns
        'pattern-dots': 'radial-gradient(circle, #000 1px, transparent 1px)',
        'pattern-grid': 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      animation: {
        'glitch': 'glitch 1s infinite',
        'pulse-neon': 'pulse-neon 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'typing': 'typing 3.5s steps(40, end)',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-2px)' },
          '40%': { transform: 'translateX(2px)' },
          '60%': { transform: 'translateX(-2px)' },
          '80%': { transform: 'translateX(2px)' },
        },
        'pulse-neon': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
      },
      borderWidth: {
        '3': '3px',
        '5': '5px',
        '10': '10px',
      },
    },
  },
  plugins: [
    // カスタムユーティリティプラグイン
    function({ addUtilities }: { addUtilities: (utilities: Record<string, Record<string, string>>) => void }) {
      const newUtilities = {
        // Glassmorphism utilities
        '.glass': {
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        },
        '.glass-dark': {
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 0, 0, 0.18)',
        },
        
        // Neumorphism utilities
        '.neumorphism': {
          background: '#e0e0e0',
          boxShadow: '20px 20px 60px #d1d1d1, -20px -20px 60px #ffffff',
        },
        '.neumorphism-inset': {
          background: '#e0e0e0',
          boxShadow: 'inset 20px 20px 60px #d1d1d1, inset -20px -20px 60px #ffffff',
        },
        
        // Text shadows for various styles
        '.text-neon': {
          textShadow: '0 0 10px currentColor, 0 0 20px currentColor',
        },
        '.text-brutal': {
          textShadow: '4px 4px 0px #000',
        },
        '.text-retro': {
          textShadow: '3px 3px 0px #ff00ff, 6px 6px 0px #00ffff',
        },
        
        // Gradient text
        '.text-gradient': {
          backgroundClip: 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
      }
      
      addUtilities(newUtilities)
    },
  ],
}
export default config