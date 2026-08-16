// ============================================================================
// Polje za unos teksta, usklađeno s aktivnom temom. Sve ostale osobine polja se
// prosljeđuju dalje, pa se ponaša kao obično HTML polje kad zatreba.
// ============================================================================

import React from "react"
import { useTheme } from "../../context/ThemeContext"

const sizes = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3 text-base",
  lg: "px-5 py-4 text-lg"
}

export default function Input({ size = "md", variant = "default", className = "", ...props }) {
  const { theme } = useTheme()

  const variants = {
    // Koristimo border i akcentnu boju iz teme da input ne "vrišti" bjelinom
    // niti nosi nasumičnu plavu koja se ne uklapa u tamnu/roza/zelenu temu
    default: `border-2 ${theme.card} focus:ring-2 ${theme.ring}`,
    error: "border-2 border-red-500",
    success: "border-2 border-green-500"
  }

  return (
    <input
      {...props}
      className={`
        w-full rounded-xl outline-none transition-all duration-300
        ${theme.text}
        ${sizes[size]}
        ${variants[variant]}
        ${className}
      `}
    />
  )
}