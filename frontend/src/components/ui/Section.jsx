// ============================================================================
// Vertikalni razmak između cjelina na javnim stranicama, usklađen s veličinom
// ekrana. Postoji da bi razmaci bili jednaki na svim stranicama.
// ============================================================================

import React from "react"

export default function Section({ children, className = "" }) {
  return (
    <section className={`py-10 sm:py-16 lg:py-24 transition-all duration-300 ${className}`}>
      {children}
    </section>
  )
}