// ============================================================================
// Word (.doc) izvoz plana - bez ijedne biblioteke.
// Word otvara HTML sadržaj snimljen kao .doc fajl; tabela plana se
// generiše iz istog modela kao i print.
// ============================================================================

export function downloadPlanAsWord(plan, { language = "bs", monthName = "" } = {}) {
  const L = language === "en"
    ? { title: "Monthly plan", date: "Date", learn: "Learning", review: "Review", entry: "Learned (fill in)", notes: "Notes", rest: "Rest day — extra review", page: "P." }
    : { title: "Mjesečni plan", date: "Datum", learn: "Učenje", review: "Ponavljanje", entry: "Naučeno (upiši)", notes: "Bilješke", rest: "Slobodan dan — pojačano ponavljanje", page: "Str." };

  const rows = plan.days.map((d) => {
    const learn = d.isRest
      ? `<em>${L.rest}</em>`
      : d.learning
        ? `${L.page} ${d.learning.from.page}:${d.learning.from.line} → ${d.learning.to.page}:${d.learning.to.line}`
        : "—";
    const review = typeof d.review === "string" ? d.review : d.review?.label || "";
    return `<tr>
      <td>${d.date.slice(8)}.${d.oznakaGreske ? " ⚠" : ""}</td>
      <td>${learn}</td>
      <td>${review}</td>
      <td>${escapeHtml(d.upisNaucenog) || "&nbsp;"}</td>
      <td>${escapeHtml(d.biljeska) || "&nbsp;"}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${L.title}</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; }
      h1 { font-size: 16pt; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #888; padding: 6px; font-size: 10pt; vertical-align: top; }
      th { background: #eee; text-align: left; }
    </style></head><body>
    <h1>Tmizan — ${L.title}: ${monthName} ${plan.year}.</h1>
    <table>
      <tr><th>${L.date}</th><th>${L.learn}</th><th>${L.review}</th><th>${L.entry}</th><th>${L.notes}</th></tr>
      ${rows}
    </table>
  </body></html>`;

  const blob = new Blob(["﻿" + html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tmizan-plan-${plan.year}-${String(plan.month).padStart(2, "0")}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
