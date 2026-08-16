// ============================================================================
// Ulazna tačka aplikacije. Ovdje se React montira u stranicu i postavljaju se
// konteksti koji vrijede globalno: tema prikaza, veličina arapskog teksta i
// jezik. Redoslijed je bitan jer se svaki sljedeći oslanja na prethodni, a
// višejezičnost se uvozi prije prvog prikaza da se prijevodi učitaju na vrijeme.
// ============================================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ThemeProvider } from './context/ThemeContext'
import { ArabicSizeProvider } from './context/ArabicSizeContext'
import { LanguageProvider } from './context/LanguageContext'
import "./i18n"


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ArabicSizeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ArabicSizeProvider>
    </ThemeProvider>
  </React.StrictMode>
)