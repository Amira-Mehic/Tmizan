// Motivacijski ajeti/citati za dashboard - rotiraju se po danu u godini.
export const MOTIVACIJA = [
  {
    ar: "وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا",
    bs: "I uči Kur'an polako i razgovijetno.",
    en: "And recite the Qur'an with measured recitation.",
    ref: "Al-Muzzemmil, 4",
  },
  {
    ar: "وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ",
    bs: "A Mi smo Kur'an učinili dostupnim za učenje napamet — pa ima li ikoga ko bi pouku primio?",
    en: "And We have certainly made the Qur'an easy for remembrance, so is there any who will remember?",
    ref: "Al-Qamar, 17",
  },
  {
    ar: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    bs: "Zaista, s mukom je i last.",
    en: "Indeed, with hardship comes ease.",
    ref: "Aš-Šarh, 6",
  },
  {
    ar: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    bs: "Najbolji među vama je onaj ko uči Kur'an i podučava druge.",
    en: "The best of you are those who learn the Qur'an and teach it.",
    ref: "Hadis — Buhari",
  },
  {
    ar: "فَاذْكُرُونِي أَذْكُرْكُمْ",
    bs: "Sjećajte se vi Mene, i Ja ću se vas sjetiti.",
    en: "So remember Me; I will remember you.",
    ref: "Al-Baqara, 152",
  },
];

export function todaysMotivation(lang = "bs", date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  const m = MOTIVACIJA[dayOfYear % MOTIVACIJA.length];
  return { ar: m.ar, text: lang === "en" ? m.en : m.bs, ref: m.ref };
}
