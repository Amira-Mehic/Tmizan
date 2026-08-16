// ============================================================================
// Ograničava širinu sadržaja i drži ga centriranim, s bočnim razmakom koji
// raste s veličinom ekrana. Time se tekst na širokim monitorima ne razvlači
// preko cijele širine.
// ============================================================================

import React from "react"

export default function Container({ children, className = "" }) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${className}`}>
      {children}
    </div>
  )
}