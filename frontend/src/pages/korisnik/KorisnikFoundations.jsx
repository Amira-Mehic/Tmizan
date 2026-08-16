// ============================================================================
// Temelji - edukativni vodič kroz osnove hifza i korištenje Tmizana
// Sekcije na klik (accordion): adabi hifza, kako birati metodu učenja,
// kako radi ponavljanje (murajaa), jedinica i blok, savjeti.
// Sadržaj je dvojezičan (bs/en) i prati temu.
// ============================================================================

import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LanguageContext";
import BackButton from "../../components/shared/BackButton";
import GuidedTour from "../../components/shared/GuidedTour";
import { PageTourButton } from "../../components/shared/PageTourButton";
import { usePageTour } from "../../hooks/usePageTour";
import { FOUNDATIONS_TOUR } from "../../constants/tours/foundationsTour";

const SADRZAJ = {
  bs: {
    title: "Temelji",
    subtitle: "Osnove hifza i kako najbolje koristiti Tmizan",
    sections: [
      {
        icon: "🕌", title: "Adabi učenja Kur'ana",
        body: "Prije učenja: abdest, mirno mjesto i jasna namjera (nijjet). Uči polako i razgovijetno — kvalitet je važniji od brzine. Redovnost je temelj: bolje 15 minuta svaki dan nego 3 sata jednom sedmično. Prije novog gradiva uvijek utvrdi jučerašnje.",
      },
      {
        icon: "🗺️", title: "Kako izabrati metodu učenja?",
        body: "Početnik si? Kreni s Postepenim nadograđivanjem (20 ponavljanja) — najčvršće pamćenje. Voliš red i sigurnost? Redom kroz mushaf — novo se otključava tek kad je staro bez greške. Učiš u mektebskom sistemu? Bosanska metoda krugova. Imaš muallima? Halka metoda — on presluša i otključa sljedeći dio.",
      },
      {
        icon: "🔁", title: "Zašto je ponavljanje odvojeno od učenja?",
        body: "Učenje novog i ponavljanje starog su dva različita procesa u mozgu i NIKAD se ne miješaju — to je pedagoška osnova Tmizana. Jutro je najbolje za novo gradivo, a poslijepodne/večer za ponavljanje. Zato dashboard uvijek prikazuje dva odvojena bloka s odvojenim tajmerima.",
      },
      {
        icon: "🧠", title: "Kako radi pametno ponavljanje (SRS)?",
        body: "Što bolje znaš, rjeđe ponavljaš; što slabije znaš, češće. Tek naučeno se ponavlja sutra; poslije uspješnih ponavljanja razmaci rastu (3, 7, 14, 30, 90 dana...). Greška vraća materijal na češće ponavljanje. U Tmizanovom originalnom modelu, kad pogriješiš jedan ajet od deset — samo se taj jedan vraća, ostali mirno nastavljaju.",
      },
      {
        icon: "📦", title: "Šta su jedinica i blok?",
        body: "Jedinica je ono što pratiš: red mushafa, ajet, stranica, sura ili džuz — sam biraš. Blok je sve što si naučio istog dana: ako danas naučiš 4 ajeta, ta 4 ajeta zajedno ulaze u sistem ponavljanja i zajedno putuju kroz odabranu metodu.",
      },
      {
        icon: "💡", title: "Praktični savjeti",
        body: "Označavaj greške iskreno — sistem ih koristi da ti pravi bolji raspored. Koristi mjesečni plan i unaprijed označi dane kad ne stigneš — tim danima fokus je na ponavljanju. Slabe ajete testiraj Mostom (prethodni ajet → prazno → sljedeći). I ne zaboravi: svaki naučeni harf je nagrada i napredak.",
      },
    ],
  },
  en: {
    title: "Foundations",
    subtitle: "Hifz basics and how to get the most out of Tmizan",
    sections: [
      {
        icon: "🕌", title: "Etiquette of learning the Qur'an",
        body: "Before learning: wudu, a calm place and a clear intention. Recite slowly and clearly — quality over speed. Consistency is the foundation: 15 minutes every day beats 3 hours once a week. Always consolidate yesterday's material before starting new.",
      },
      {
        icon: "🗺️", title: "How to choose a learning method?",
        body: "Beginner? Start with Gradual Building (20 repetitions) — the firmest memorization. Prefer order and certainty? In-Order method — new material unlocks only when the previous is error-free. Learning in a maktab system? The Bosnian Circles method. Have a muallim? The Halaqa method — they listen and unlock the next part.",
      },
      {
        icon: "🔁", title: "Why is review separate from learning?",
        body: "Learning new material and reviewing old are two different processes in the brain and are NEVER mixed — that's Tmizan's pedagogical foundation. Morning is best for new material; afternoon/evening for review. That's why the dashboard always shows two separate blocks with separate timers.",
      },
      {
        icon: "🧠", title: "How does smart review (SRS) work?",
        body: "The better you know it, the less often you review it. Newly learned material is reviewed tomorrow; after successful reviews the gaps grow (3, 7, 14, 30, 90 days...). A mistake brings the material back to frequent review. In Tmizan's original model, if you err on one ayah out of ten — only that one falls back, the rest keep going.",
      },
      {
        icon: "📦", title: "What are a unit and a block?",
        body: "The unit is what you track: a mushaf line, an ayah, a page, a surah or a juz — you choose. The block is everything you learned on the same day: if you learn 4 ayahs today, those 4 enter the review system together and travel through the chosen method together.",
      },
      {
        icon: "💡", title: "Practical tips",
        body: "Mark mistakes honestly — the system uses them to build you a better schedule. Use the monthly plan and mark busy days in advance — those days focus on review. Test weak ayahs with the Bridge (previous ayah → blank → next). And remember: every letter learned is a reward and progress.",
      },
    ],
  },
};

export default function KorisnikFoundations() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const [open, setOpen] = useState(0);
  const c = SADRZAJ[lang] || SADRZAJ.bs;
  const tour = usePageTour("foundations", FOUNDATIONS_TOUR);

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <GuidedTour steps={tour.steps} active={tour.active} onFinish={tour.finish} theme={theme} lang={tour.lang} dismissible />
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton />
        <div data-tour="tour-foundations-page">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
            📚 {c.title}
            <PageTourButton onClick={tour.start} />
          </h1>
          <p className={`${theme.muted} text-sm mt-1`}>{c.subtitle}</p>
        </div>

        <div className="space-y-3">
          {c.sections.map((s, i) => (
            <div key={i} className={`${theme.card} rounded-2xl overflow-hidden`}>
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left"
              >
                <span className="font-semibold flex items-center gap-2.5">
                  <span className="text-xl">{s.icon}</span> {s.title}
                </span>
                <span className={`${theme.muted} text-sm`}>{open === i ? "▲" : "▼"}</span>
              </button>
              {open === i && (
                <p className={`px-4 pb-4 text-sm leading-relaxed ${theme.muted}`}>{s.body}</p>
              )}
            </div>
          ))}
        </div>

        <div className={`${theme.cardAlt} rounded-2xl p-6 text-center`}>
          <p className="text-xl mb-2" dir="rtl" style={{ fontFamily: "'Amiri','Scheherazade New',serif" }}>
            خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
          </p>
          <p className={`text-sm italic ${theme.muted}`}>
            {lang === "en"
              ? "The best of you are those who learn the Qur'an and teach it. (Bukhari)"
              : "Najbolji među vama je onaj ko uči Kur'an i podučava druge. (Buhari)"}
          </p>
        </div>
      </div>
    </div>
  );
}
