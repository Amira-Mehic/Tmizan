// ============================================================================
// Zajedničko dugme aplikacije. Boje ne stoje ovdje nego se uzimaju iz aktivne
// teme, pa se dugmad kroz cijelu aplikaciju preboje promjenom teme, bez izmjena
// na pojedinačnim ekranima. Nudi tri veličine i nekoliko varijanti izgleda.
// ============================================================================

import React from "react"
import { useTheme } from "../../context/ThemeContext"

const sizes = {
  sm: "px-3 py-1 text-sm",
  md: "px-5 py-2 text-base",
  lg: "px-7 py-3 text-lg"
}

export default function Button({
  children,
  size = "md",
  variant = "primary",
  className = "",
  ...props
}) {
  const { theme } = useTheme()

  // Dinamički definiramo stilove na osnovu trenutne teme
  const themeVariants = {
    // Koristimo theme.accent za glavnu boju i theme.bg za tekst ako je tema "warm_peach" (svijetli gumb, crni tekst)
    primary: `${theme.accent} ${theme.id === 'warm_peach' ? 'text-black' : 'text-white'} hover:opacity-90`,
    
    // Outline koristi boju teksta teme za border i tekst
    outline: `border-2 ${theme.card} ${theme.text} hover:opacity-70 bg-transparent`,
    
    // Ghost samo dodaje blagu pozadinu pri hoveru
    ghost: `bg-transparent ${theme.text} hover:bg-black/5 dark:hover:bg-white/5`
  }

  return (
    <button
      {...props}
      className={`
        rounded-xl font-semibold transition-all duration-300 active:scale-95
        ${sizes[size]}
        ${themeVariants[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  )
}