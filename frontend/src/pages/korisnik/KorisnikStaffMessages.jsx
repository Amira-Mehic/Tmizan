// ============================================================================
// Poruke od podrške - razgovori koje POKREĆE admin/moderator direktno sa
// korisnikom (0036/staffChatService). Odvojeno od "Podrška" stranice (tamo
// korisnik prijavljuje grešku/pitanje/prijedlog - ovdje staff kontaktira
// korisnika). Dostupno preko sidebar linka u dnu (iznad "Moj profil").
// ============================================================================

import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import BackButton from "../../components/shared/BackButton";
import StaffConversations from "../../components/shared/StaffConversations";
import GuidedTour from "../../components/shared/GuidedTour";
import { PageTourButton } from "../../components/shared/PageTourButton";
import { usePageTour } from "../../hooks/usePageTour";
import { STAFF_MESSAGES_TOUR } from "../../constants/tours/staffMessagesTour";
import HelpTip from "../../components/shared/HelpTip";

export default function KorisnikStaffMessages() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { lang } = useLang();
  const tour = usePageTour("staff-messages", STAFF_MESSAGES_TOUR);

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <GuidedTour steps={tour.steps} active={tour.active} onFinish={tour.finish} theme={theme} lang={tour.lang} dismissible />
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton />
        <div data-tour="tour-staffmessages-page">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
            💬 {t("staffMessages.title")}
            <HelpTip text={lang === "en"
              ? "Conversations started by an admin/moderator, not by you. You can send one reply, then have to wait for their response before sending another."
              : "Razgovori koje pokreće administrator/moderator, ne ti. Možeš poslati jedan odgovor, a onda moraš sačekati njihov odgovor prije sljedećeg."} />
            <PageTourButton onClick={tour.start} />
          </h1>
          <p className={`${theme.muted} text-sm mt-1`}>{t("staffMessages.subtitle")}</p>
        </div>

        <StaffConversations mode="user" currentUserId={user?.id} theme={theme} lang={lang} />
      </div>
    </div>
  );
}
