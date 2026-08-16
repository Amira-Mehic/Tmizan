// ============================================================================
// Kartica - osnovna površina na koju se slaže sadržaj kroz aplikaciju. Pozadinu
// i ivicu preuzima iz aktivne teme, a razmak unutar kartice bira se veličinom.
// ============================================================================

import React from "react"
import { useTheme } from "../../context/ThemeContext"

const paddings = {
  sm: "p-3",
  md: "p-6",
  lg: "p-8"
}

export default function Card({ children, padding = "md", className = "" }) {
  const { theme } = useTheme()

  return (
    <div className="relative group"> 


      {/* Glavna kartica */}
      <div
        className={`
          ${theme.card} ${theme.text}
          border border-white/10 rounded-3xl shadow-2xl
          backdrop-blur-xl
          transition-all duration-300 hover:-translate-y-1
          ${paddings[padding]}
          ${className}
          relative z-10 
        `}
      >
        {children}
      </div>
    </div>
  )
}