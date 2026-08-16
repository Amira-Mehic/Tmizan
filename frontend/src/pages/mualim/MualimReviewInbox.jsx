// ============================================================================
// Preslušavanja - svi zahtjevi učenika za preslušavanje (context_type
// 'preslusavanje_zahtjev' u messages, migracija 0032). Mualim ovdje vidi ko
// traži termin, odgovara direktno i označava zahtjev kao pregledan.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { fetchReviewRequests, fetchRepliesByRefs, sendMessage, updateMessageBody, markRead } from "../../services/mualimService";
import BackButton from "../../components/shared/BackButton";
import GuidedTour from "../../components/shared/GuidedTour";
import { PageTourButton } from "../../components/shared/PageTourButton";
import { usePageTour } from "../../hooks/usePageTour";
import { MUALIM_REVIEW_INBOX_TOUR } from "../../constants/tours/mualimReviewInboxTour";
import HelpTip from "../../components/shared/HelpTip";

export default function MualimReviewInbox() {
  const { t } = useTranslation();
  const { theme, sectionAccents: SECTION_ACCENTS } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const mualimId = user?.id;

  const [requests, setRequests] = useState([]);
  // već poslani odgovori, po id-u originalnog zahtjeva: { [requestId]: { id, body } }
  const [replies, setReplies] = useState({});
  const [loading, setLoading] = useState(true);
  const tour = usePageTour("mualim-review-inbox", MUALIM_REVIEW_INBOX_TOUR);

  const load = useCallback(async () => {
    if (!mualimId) { setLoading(false); return; }
    try {
      const rs = await fetchReviewRequests(mualimId);
      setRequests(rs);
      const rep = await fetchRepliesByRefs(mualimId, rs.map((r) => String(r.id)));
      const byRequest = {};
      for (const m of rep) byRequest[m.context_ref] = { id: m.id, body: m.body };
      setReplies(byRequest);
    } catch { setRequests([]); setReplies({}); }
    setLoading(false);
  }, [mualimId]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const markHandled = async (id) => {
    try {
      await markRead(id);
      setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)));
    } catch { /* */ }
  };

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <GuidedTour steps={tour.steps} active={tour.active} onFinish={tour.finish} theme={theme} lang={tour.lang} dismissible />
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton />
        <div data-tour="tour-reviewinbox-page">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold flex items-center">
            🎤 {t("mualim.reviewInboxTitle")}
            <PageTourButton onClick={tour.start} />
          </h1>
          <p className={`${theme.muted} text-sm mt-1`}>{t("mualim.reviewInboxSubtitle")}</p>
        </div>

        {loading ? (
          <p className={theme.muted}>…</p>
        ) : requests.length === 0 ? (
          <div className={`${theme.card} rounded-2xl p-6 text-center`}>
            <p className={theme.muted}>{t("mualim.reviewInboxEmpty")}</p>
          </div>
        ) : (
          <>
            {(() => {
              const novi = requests.filter((r) => !r.read_at);
              const pregledani = requests.filter((r) => !!r.read_at);
              const row = (r) => (
                <RequestRow
                  key={r.id} r={r} theme={theme} SECTION_ACCENTS={SECTION_ACCENTS} t={t} mualimId={mualimId}
                  existingReply={replies[String(r.id)] || null}
                  onReplySent={(msg) => setReplies((rep) => ({ ...rep, [String(r.id)]: msg }))}
                  onMarkHandled={() => markHandled(r.id)}
                  onSchedule={() => {
                    markHandled(r.id);
                    navigate("/mualim/dashboard", { state: { tab: "sesije", studentId: r.sender_id } });
                  }}
                />
              );
              return (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h2 className={`text-sm font-semibold ${theme.muted}`}>{t("mualim.reviewInboxNewSection")} ({novi.length})</h2>
                    {novi.length === 0 ? (
                      <p className={`text-sm ${theme.muted}`}>{t("mualim.reviewInboxEmpty")}</p>
                    ) : (
                      <div className="space-y-3">{novi.map(row)}</div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h2 className={`text-sm font-semibold ${theme.muted}`}>{t("mualim.reviewInboxHandledSection")} ({pregledani.length})</h2>
                    {pregledani.length === 0 ? (
                      <p className={`text-sm ${theme.muted}`}>{t("mualim.reviewInboxNoHandled")}</p>
                    ) : (
                      <div className="space-y-3">{pregledani.map(row)}</div>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

function RequestRow({ r, theme, SECTION_ACCENTS, t, mualimId, existingReply, onReplySent, onMarkHandled, onSchedule }) {
  const [replyText, setReplyText] = useState(existingReply?.body || "");
  const [sentId, setSentId] = useState(existingReply?.id || null);
  const [sending, setSending] = useState(false);
  const [lastAction, setLastAction] = useState(null); // "sent" | "updated" | null
  const handled = !!r.read_at;
  const isEditing = !!sentId;

  // prvi odgovor šalje NOVU poruku (vezanu na ovaj zahtjev preko context_ref);
  // svaki sljedeći klik samo UREĐUJE tu istu poruku - ne šalje se ponovo
  const reply = async () => {
    if (!replyText.trim()) return;
    const wasEditing = isEditing;
    setSending(true);
    try {
      if (wasEditing) {
        await updateMessageBody(sentId, replyText.trim());
      } else {
        const msg = await sendMessage(mualimId, r.sender_id, replyText.trim(), {
          contextType: "opcenito", contextRef: String(r.id),
        });
        setSentId(msg.id);
        onReplySent?.({ id: msg.id, body: replyText.trim() });
      }
      setLastAction(wasEditing ? "updated" : "sent");
      setTimeout(() => setLastAction(null), 2000);
    } catch { /* */ }
    setSending(false);
  };

  return (
    <div className={`${handled ? theme.card : `${SECTION_ACCENTS.review.item} border-l-4 ${SECTION_ACCENTS.review.border}`} rounded-2xl p-4`}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
        <span className="font-medium text-sm">{r.sender?.full_name || t("mualim.student")}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          handled ? `${theme.cardSub} ${theme.muted}` : SECTION_ACCENTS.review.chip
        }`}>
          {handled ? t("mualim.reviewInboxHandled") : t("mualim.reviewInboxPending")}
        </span>
      </div>
      <p className="text-sm">{r.body}</p>
      <p className={`text-xs mt-1 ${theme.muted}`}>{new Date(r.created_at).toLocaleString()}</p>

      <div className="flex gap-2 mt-3">
        <input
          value={replyText} onChange={(e) => setReplyText(e.target.value)}
          placeholder={t("mualim.reviewInboxReplyPh")}
          onKeyDown={(e) => { if (e.key === "Enter") reply(); }}
          className={`flex-1 min-w-0 ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`}
        />
        <button onClick={reply} disabled={sending} className={`${theme.button} rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50 shrink-0`}>
          {sending ? "…" : isEditing ? t("mualim.reviewInboxEditBtn") : t("mualim.reviewInboxReplyBtn")}
        </button>
        {!handled && (
          <button onClick={onMarkHandled} className={`${theme.cardSub} ${theme.muted} rounded-xl px-3 py-2 text-xs font-semibold shrink-0`}>
            ✓ {t("mualim.reviewInboxMarkHandled")}
          </button>
        )}
      </div>
      {!handled && (
        <div className="flex items-center gap-1 mt-2">
          <button onClick={onSchedule} className={`${SECTION_ACCENTS.review.chip} rounded-xl px-3 py-2 text-xs font-semibold w-full sm:w-auto`}>
            📅 {t("mualim.reviewInboxScheduleBtn")}
          </button>
          <HelpTip text="Odgovor u polju iznad šalje poruku učeniku i ne označava zahtjev kao riješen. 'Zakaži' te vodi na tab Sesije s već izabranim učenikom. 'Označi pregledano' sakriva zahtjev iz liste Novo bez odgovora." />
        </div>
      )}
      {lastAction && <p className="text-xs text-green-500 mt-1.5">{lastAction === "updated" ? t("mualim.reviewInboxReplyUpdated") : t("mualim.reviewInboxReplySent")}</p>}
    </div>
  );
}
