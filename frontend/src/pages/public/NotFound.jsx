// ============================================================================
// Stranica koja se prikazuje kad tražena adresa ne postoji.
// ============================================================================

import React from "react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return <div className="p-8 text-white">{t('common.not_found', '404 - Stranica nije pronađena')}</div>;
}