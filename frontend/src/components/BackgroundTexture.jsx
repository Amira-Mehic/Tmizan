// ============================================================================
// Vizuelni slojevi preko cijele pozadine aplikacije - blago zrnce i mekani
// odsjaj u akcentnoj boji aktivne teme. Slojevi ne primaju klikove i stoje
// ispod sadržaja, pa služe samo tome da površina ne izgleda potpuno ravno.
// Zrnce je ugrađeni SVG umjesto slike, čime se izbjegava dodatni zahtjev.
// ============================================================================

import React from 'react';
import { useTheme } from '../context/ThemeContext';

const BackgroundTexture = () => {
  const { theme } = useTheme();
  const accentColor = theme.accent || '#10b981';

  return (
    <>
      {/* 1. GRAIN (Zrnca) - Globalni sloj za teksturu */}
      <div 
        className="fixed inset-0 pointer-events-none z-[100] opacity-[0.025]" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          filter: 'brightness(120%) contrast(120%)',
        }} 
      />

      {/* 2. GRADIENTI, LINIJE I KRUGOVI */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#010606]">
        
        {/* VELIKI DINAMIČNI KRUGOVI (Svijetlo/Tamno preklapanje) */}
        {/* Primarni sjaj gore lijevo */}
        <div 
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[140px] opacity-[0.12]" 
          style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }} 
        />
        
        {/* Sekundarni tamniji sjaj (Deep Glow) dole desno */}
        <div 
          className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-[0.07]" 
          style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`, filter: 'brightness(0.5)' }} 
        />

        {/* MALI FOUS KRUGOVI (Kao leće) */}
        <div 
          className="absolute top-[20%] right-[15%] w-[300px] h-[300px] rounded-full blur-[80px] opacity-[0.04]" 
          style={{ backgroundColor: accentColor }} 
        />

        {/* GEOMETRIJSKE LINIJE (Arhitektonski look) */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0" />
              <stop offset="50%" stopColor={accentColor} stopOpacity="1" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Dijagonalne duge linije */}
          <line x1="-10%" y1="20%" x2="110%" y2="80%" stroke="url(#lineGrad)" strokeWidth="1" />
          <line x1="-10%" y1="50%" x2="110%" y2="110%" stroke="url(#lineGrad)" strokeWidth="1" />
          {/* Vertikalna tanka linija (kao grid marker) */}
          <line x1="30%" y1="-10%" x2="30%" y2="110%" stroke={accentColor} strokeWidth="0.5" strokeDasharray="10 10" />
        </svg>

        {/* CENTRALNI RADIAL GRADIENT (Za fokus na sadržaj) */}
        <div 
          className="absolute inset-0 opacity-[0.06]" 
          style={{ 
            background: `radial-gradient(circle at 50% 50%, transparent 20%, #000 100%)` 
          }} 
        />

        {/* DOTTED GRID (Sitnije i rjeđe) */}
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{ 
            backgroundImage: `radial-gradient(${accentColor} 1px, transparent 1px)`, 
            backgroundSize: '80px 80px' 
          }} 
        />
      </div>
    </>
  );
};

export default BackgroundTexture;