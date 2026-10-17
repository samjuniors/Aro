import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge only knows Tailwind's built-in scales. Without these theme
// extensions it treats `rounded-control` as unrelated to `rounded-md` /
// `rounded-full`, and treats `text-aro-xs` as a text COLOR, so a following
// `text-muted-foreground` silently deletes the size. Keep in sync with the
// `--radius-*`, `--text-aro-*` and `--shadow-*` keys in styles.css / tokens.css.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['control', 'panel', 'overlay'],
      text: ['aro-xs', 'aro-sm', 'aro-md', 'aro-lg', 'aro-xl', 'aro-mono'],
      shadow: ['nous', 'composer', 'menu', 'panel', 'aro-e1', 'aro-e2', 'aro-e3', 'aro-e4']
    }
  }
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
