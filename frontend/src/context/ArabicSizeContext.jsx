// ============================================================================
// Veličina arapskog teksta, zajednička za sve ekrane koji prikazuju ajete.
// Postoji kao zaseban kontekst jer se mijenja iz postavki, a djeluje na
// komponente razasute kroz tracker, ponavljanje i sesiju učenja.
// ============================================================================

 import { createContext, useContext, useState } from "react"
  const ArabicSizeCtx = createContext({ arabicSize: 28, setArabicSize: () => {} })
  export const ArabicSizeProvider = ({ children }) => {
    const [arabicSize, setArabicSize] = useState(28)
    return <ArabicSizeCtx.Provider value={{ arabicSize, setArabicSize }}>{children}</ArabicSizeCtx.Provider>
  }
  // eslint-disable-next-line react-refresh/only-export-components -- hook uz Provider je standardan Context pattern
  export const useArabicSize = () => useContext(ArabicSizeCtx)