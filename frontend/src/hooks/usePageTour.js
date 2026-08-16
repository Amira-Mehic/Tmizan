// ============================================================================
// usePageTour - generička kuka za "vodič po stranici": pokreće se automatski
// prvi put kad korisnik/mualim uđe na stranicu, i može se ponovo pokrenuti
// ručno (klik na sivi upitnik pored naslova - vidi PageTourButton.jsx).
//
// `tourKey` mora biti jedinstven po stranici (koristi se u localStorage
// ključu preko lib/tourStorage.js). `tourSteps` je objekat { bs: [...], en: [...] }.
//
// Korištenje:
//   const tour = usePageTour("mualim-hub", MUALIM_HUB_TOUR);
//   <PageTourButton onClick={tour.start} />
//   <GuidedTour steps={tour.steps} active={tour.active} onFinish={tour.finish}
//               theme={theme} lang={tour.lang} dismissible />
// ============================================================================

import { useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { hasSeenTour, markTourSeen } from "../lib/tourStorage";

export function usePageTour(tourKey, tourSteps) {
  const { user } = useAuth();
  const { lang } = useLang();
  const [active, setActive] = useState(false);

  // Provjerava treba li automatski pokrenuti vodič prvi put - čisto sinhrona
  // provjera (localStorage), pa se prilagođava tokom rendera uz poređenje s
  // prethodnim user?.id/tourKey (isti okidači kao stari dependency niz).
  const [prevUserId, setPrevUserId] = useState(user?.id);
  const [prevTourKey, setPrevTourKey] = useState(tourKey);
  if (user?.id !== prevUserId || tourKey !== prevTourKey) {
    setPrevUserId(user?.id);
    setPrevTourKey(tourKey);
    if (user?.id && !hasSeenTour(user.id, tourKey)) setActive(true);
  }

  const start = useCallback(() => setActive(true), []);
  const finish = useCallback(() => {
    if (user?.id) markTourSeen(user.id, tourKey);
    setActive(false);
  }, [user, tourKey]);

  const steps = tourSteps[lang] || tourSteps.bs;
  return { active, steps, start, finish, lang };
}
