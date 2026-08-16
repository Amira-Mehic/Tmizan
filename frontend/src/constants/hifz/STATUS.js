// label = opći/muški rod, labelF = ženski rod (stranica, sura)
export const STATUS = {
  naucen:       { bg: "bg-[#1D9E75]/20", border: "border-[#1D9E75]/40", text: "text-[#49C79A]", dot: "bg-[#1D9E75]",   label: "Naučen",       labelF: "Naučena",       icon: "✓", short: "N", hex: "#1D9E75" },
  u_toku:       { bg: "bg-[#EF9F27]/20", border: "border-[#EF9F27]/40", text: "text-[#F5B453]", dot: "bg-[#EF9F27]",   label: "U toku",       labelF: "U toku",        icon: "~", short: "U", hex: "#EF9F27" },
  ponavljanje:  { bg: "bg-[#378ADD]/20", border: "border-[#378ADD]/40", text: "text-[#67A6E6]", dot: "bg-[#378ADD]",   label: "Ponavljanje",  labelF: "Ponavljanje",   icon: "↻", short: "P", hex: "#378ADD" },
  savladano:    { bg: "bg-[#9F8FEF]/20", border: "border-[#9F8FEF]/40", text: "text-[#B8ADF5]", dot: "bg-[#9F8FEF]",   label: "Savladano",    labelF: "Savladana",     icon: "★", short: "S", hex: "#9F8FEF" },
  treba_vjezbe: { bg: "bg-[#EF6F6F]/20", border: "border-[#EF6F6F]/40", text: "text-[#F58C8C]", dot: "bg-[#EF6F6F]",   label: "Treba vježbe", labelF: "Treba vježbe",  icon: "⚠", short: "V", hex: "#EF6F6F" },
  prazna:       { bg: "bg-neutral-500/10", border: "border-neutral-500/20", text: "text-neutral-500", dot: "bg-neutral-500", label: "Nije početo", labelF: "Nije početa",   icon: "—", short: "—", hex: "#777" },
};

export const STATUS_CYCLE = ["prazna","naucen","ponavljanje","savladano","u_toku","treba_vjezbe"];
export const cycleStatus = (s) => STATUS_CYCLE[(STATUS_CYCLE.indexOf(s) + 1) % STATUS_CYCLE.length];
