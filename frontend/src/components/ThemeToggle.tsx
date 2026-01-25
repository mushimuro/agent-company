import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-[--radius-md] bg-[--color-surface] border border-[--color-border-strong] hover:border-[--color-accent-primary] transition-all duration-200 hover:shadow-md"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-[--color-accent-primary]" strokeWidth={2} />
      ) : (
        <Moon className="h-5 w-5 text-[--color-accent-primary]" strokeWidth={2} />
      )}
    </button>
  );
};
