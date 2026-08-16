// ============================================================================
// Mala oznaka u akcentnoj boji teme - koristi se za statuse i kategorije.
// ============================================================================

import React from "react"
import { useTheme } from "../../context/ThemeContext"

export default function Badge({ children, className = "" }) {
  const { theme } = useTheme()

  // Na svijetloj akcentnoj boji bijeli tekst se ne bi vidio, pa ide crni.
  const textColor = theme.id === 'warm_peach' ? 'text-black' : 'text-white'

  return (
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase
      ${theme.accent} ${textColor}
      transition-colors duration-300 shadow-sm ${className}
    `}>
      {children}
    </span>
  )
}