// ============================================================================
// Razgovori admin/moderator ↔ korisnik. Jedna komponenta, dva moda:
//   mode="staff" - admin/moderator panel: vidi SVE razgovore, može pokrenuti
//                  novi (bira korisnika iz `profiles`), zatvara/otvara razgovor.
//   mode="user"  - korisnička stranica: vidi SVOJE razgovore, odgovara ali
//                  samo dok RLS (0036) to dopušta (1 poruka dok ne dobije
//                  odgovor) - poruka o čekanju se prikazuje kad je red na staff.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import {
  fetchAllConversations, fetchMyConversations, fetchConversationMessages,
  startConversation, sendConversationMessage, closeConversation, reopenConversation,
} from "../../services/staffChatService";

const STR = {
  bs: {
    title: "Razgovori", noConvs: "Nema razgovora.",
    newConv: "+ Novi razgovor", pickUser: "Korisnik", subjectPh: "Naslov (opcionalno)",
    firstMsgPh: "Prva poruka…", startBtn: "Pokreni razgovor", cancel: "Odustani",
    st_otvoren: "Otvoren", st_zatvoren: "Zatvoren",
    close: "Zatvori razgovor", reopen: "Otvori ponovo",
    msgPh: "Piši poruku…", send: "Pošalji",
    waitingForYou: "Čeka se tvoj odgovor", waitingForStaff: "Čeka se odgovor podrške",
    closedNotice: "Razgovor je zatvoren.", back: "← Nazad na listu",
    withLabel: "sa",
  },
  en: {
    title: "Conversations", noConvs: "No conversations.",
    newConv: "+ New conversation", pickUser: "User", subjectPh: "Subject (optional)",
    firstMsgPh: "First message…", startBtn: "Start conversation", cancel: "Cancel",
    st_otvoren: "Open", st_zatvoren: "Closed",
    close: "Close conversation", reopen: "Reopen",
    msgPh: "Write a message…", send: "Send",
    waitingForYou: "Waiting for your reply", waitingForStaff: "Waiting for staff reply",
    closedNotice: "This conversation is closed.", back: "← Back to list",
    withLabel: "with",
  },
};

export default function StaffConversations({ mode, currentUserId, theme, lang, profiles = [] }) {
  const s = STR[lang] || STR.bs;
  const isStaff = mode === "staff";

  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newUser, setNewUser] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");

  const load = useCallback(async () => {
    const data = isStaff ? await fetchAllConversations() : await fetchMyConversations(currentUserId);
    setConvs(data);
    setLoading(false);
  }, [isStaff, currentUserId]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const openConv = convs.find((c) => c.id === openId) || null;

  const create = async () => {
    if (!newUser || !newBody.trim()) return;
    const { error } = await startConversation(currentUserId, newUser, newSubject.trim(), newBody.trim());
    if (!error) {
      setShowNew(false); setNewUser(""); setNewSubject(""); setNewBody("");
      load();
    }
  };

  const doClose = async (conv) => { await closeConversation(conv.id, currentUserId); load(); };
  const doReopen = async (conv) => { await reopenConversation(conv.id); load(); };

  const inp = `${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`;

  if (loading) return <p className={theme.muted}>…</p>;

  // ── DETALJAN PRIKAZ JEDNOG RAZGOVORA ──
  if (openConv) {
    return (
      <ConversationThread
        conv={openConv} isStaff={isStaff} currentUserId={currentUserId}
        theme={theme} s={s}
        otherName={isStaff ? (openConv.korisnik?.full_name || openConv.user_id.slice(0, 8)) : (openConv.pokrenuo?.full_name || s.title)}
        onBack={() => setOpenId(null)}
        onClose={() => doClose(openConv)}
        onReopen={() => doReopen(openConv)}
        onSent={load}
      />
    );
  }

  // ── LISTA RAZGOVORA ──
  return (
    <div className="space-y-3">
      {isStaff && (
        <div>
          {!showNew ? (
            <button onClick={() => setShowNew(true)} className={`${theme.button} rounded-xl px-4 py-2 text-sm font-semibold`}>
              {s.newConv}
            </button>
          ) : (
            <div className={`${theme.card} rounded-2xl p-4 space-y-2`}>
              <select value={newUser} onChange={(e) => setNewUser(e.target.value)} className={`w-full ${inp}`}>
                <option value="">{s.pickUser} —</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.id.slice(0, 8)}{p.email ? ` (${p.email})` : ""}</option>)}
              </select>
              <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder={s.subjectPh} className={`w-full ${inp}`} />
              <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder={s.firstMsgPh} rows={2} className={`w-full ${inp} resize-none`} />
              <div className="flex gap-2">
                <button onClick={create} className={`${theme.button} rounded-xl px-4 py-2 text-sm font-semibold`}>{s.startBtn}</button>
                <button onClick={() => setShowNew(false)} className={`${theme.cardSub} ${theme.muted} rounded-xl px-4 py-2 text-sm`}>{s.cancel}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {convs.length === 0 ? <p className={`text-sm ${theme.muted}`}>{s.noConvs}</p> : (
        <div className="space-y-2">
          {convs.map((c) => {
            const otherName = isStaff ? (c.korisnik?.full_name || c.user_id.slice(0, 8)) : (c.pokrenuo?.full_name || s.title);
            return (
              <button key={c.id} onClick={() => setOpenId(c.id)}
                className={`w-full text-left ${theme.card} rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap hover:opacity-90 transition`}>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {c.naslov || `${s.title} ${s.withLabel} ${otherName}`}
                  </div>
                  <div className={`text-xs mt-0.5 truncate ${theme.muted}`}>
                    {isStaff ? otherName : `${s.withLabel} ${otherName}`}
                  </div>
                </div>
                <span className={`shrink-0 text-[10px] text-white px-2 py-1 rounded-full ${c.status === "otvoren" ? "bg-green-600" : "bg-gray-500"}`}>
                  {c.status === "otvoren" ? s.st_otvoren : s.st_zatvoren}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConversationThread({ conv, isStaff, currentUserId, theme, s, otherName, onBack, onClose, onReopen, onSent }) {
  const [msgs, setMsgs] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchConversationMessages(conv.id);
    setMsgs(data);
    setLoading(false);
  }, [conv.id]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Da li je red na TRENUTNOM korisniku da odgovori - zadnja poruka nije njegova
  const lastMsg = msgs[msgs.length - 1];
  const myTurn = !lastMsg || lastMsg.sender_id !== currentUserId;
  const isClosed = conv.status === "zatvoren";
  const canSend = !isClosed && (isStaff || myTurn);

  const send = async () => {
    if (!body.trim() || !canSend) return;
    const optimistic = { id: `tmp_${Date.now()}`, sender_id: currentUserId, body: body.trim(), created_at: new Date().toISOString() };
    setMsgs((m) => [...m, optimistic]);
    setBody("");
    const { error } = await sendConversationMessage(conv, currentUserId, optimistic.body);
    if (error) setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
    load(); onSent?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button onClick={onBack} className={`text-sm ${theme.accent}`}>{s.back}</button>
        {isStaff && (
          isClosed
            ? <button onClick={onReopen} className={`${theme.cardSub} ${theme.muted} rounded-lg px-3 py-1.5 text-xs`}>{s.reopen}</button>
            : <button onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs">{s.close}</button>
        )}
      </div>

      <div className={`${theme.card} rounded-2xl p-4 space-y-3`}>
        <div>
          {conv.naslov && <h3 className="font-semibold">{conv.naslov}</h3>}
          <p className={`text-xs ${theme.muted}`}>{s.withLabel} {otherName}</p>
        </div>

        {loading ? <p className={theme.muted}>…</p> : (
          <div className="max-h-96 overflow-y-auto space-y-1.5">
            {msgs.map((m) => (
              <div key={m.id}
                className={`text-sm px-3 py-1.5 rounded-xl max-w-[85%] ${
                  m.sender_id === currentUserId ? `${theme.button} ml-auto` : `${theme.cardSub}`}`}>
                {m.body}
              </div>
            ))}
          </div>
        )}

        {isClosed ? (
          <p className={`text-xs ${theme.muted}`}>{s.closedNotice}</p>
        ) : canSend ? (
          <div className="flex gap-2">
            <input value={body} onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder={s.msgPh} className={`flex-1 ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
            <button onClick={send} className={`${theme.button} rounded-xl px-4 py-2 text-sm font-semibold`}>{s.send}</button>
          </div>
        ) : (
          <p className={`text-xs ${theme.muted}`}>{isStaff ? s.waitingForYou : s.waitingForStaff}</p>
        )}
      </div>
    </div>
  );
}
