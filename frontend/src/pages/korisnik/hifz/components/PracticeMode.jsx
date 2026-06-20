import { useState, useRef, useEffect, useCallback } from "react";

/*
  Inline verse player — samo Mahmoud Khalil Al-Hussary
  Prikazuje arapski tekst ajeta, praći svaku riječ dok se izgovara, broji ponavljanja
*/

const HUSSARY_ID  = 9;
const BASE_AUDIO  = "https://verses.quran.com/";
const BASE_API    = "https://api.quran.com/api/v4";
const REPEAT_OPTS = [1, 3, 5, 7, 10, 20];
const GOLD        = "#C9A227"; // highlight boja

export function PracticeMode({ verse, theme, s: strings }) {
  const isLight   = theme?.id === "beige_white" || theme?.id === "pink_soft";
  const tText     = theme?.text   || "text-white";
  const tMuted    = theme?.muted  || "text-white/50";
  const tSubtle   = isLight ? "text-black/30"  : "text-white/25";
  const tBorder   = isLight ? "border-black/8"  : "border-white/[0.06]";
  const tCard     = theme?.card   || "bg-white/[0.04] border border-white/10";
  const tInput    = isLight
    ? "border-black/15 bg-black/5 text-[#3D3A35]"
    : "border-white/10 bg-white/[0.06] text-white";

  /* ── state ────────────────────────────────────────────────────────────── */
  const [words,       setWords]       = useState([]);
  const [segments,    setSegments]    = useState([]);  // [[wIdx1based, startMs, endMs], ...]
  const [audioUrl,    setAudioUrl]    = useState(null);
  const [activeW,     setActiveW]     = useState(-1);

  const [repeatCount,  setRepeatCount]  = useState(3);
  const [customRepeat, setCustomRepeat] = useState("");
  const [currentRep,   setCurrentRep]   = useState(0);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isPaused,     setIsPaused]     = useState(false);
  const [done,         setDone]         = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  const audioRef = useRef(null);
  const repsDone = useRef(0);
  const segRef   = useRef([]);   // aktuelni segments bez re-render problema

  const verseKey = verse?.verse_key || "1:1";
  const totalReps = customRepeat ? (parseInt(customRepeat) || repeatCount) : repeatCount;

  /* ── fetch audio + words ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!verseKey) return;
    setLoading(true);
    setError(null);
    resetPlayer();

    Promise.all([
      fetch(`${BASE_API}/recitations/${HUSSARY_ID}/by_ayah/${verseKey}`)
        .then(r => r.json()),
      fetch(`${BASE_API}/verses/by_key/${verseKey}?words=true&word_fields=text_uthmani,char_type_name`)
        .then(r => r.json()),
    ]).then(([audioData, verseData]) => {
      const file = audioData?.audio_files?.[0];
      if (file?.url) {
        setAudioUrl(BASE_AUDIO + file.url);

        // segments mogu biti stringovi — parsiraj sve u brojeve
        const segs = (file.segments || []).map(seg =>
          Array.isArray(seg) ? seg.map(Number) : []
        ).filter(seg => seg.length === 3);
        setSegments(segs);
        segRef.current = segs;
      } else {
        setError("Audio nije pronađen za ovaj ajet.");
      }

      const allWords = verseData?.verse?.words || [];
      setWords(allWords.filter(w => w.char_type_name === "word"));
      setLoading(false);
    }).catch(() => {
      setError("Greška pri učitavanju. Provjeri internet vezu.");
      setLoading(false);
    });
  }, [verseKey]);

  /* ── update src bez remountanja audio elementa ───────────────────────── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    const wasPlaying = isPlaying;
    audio.src = audioUrl;
    audio.load();
    if (wasPlaying) audio.play().catch(() => {});
  }, [audioUrl]);

  /* ── reset ─────────────────────────────────────────────────────────────── */
  const resetPlayer = useCallback(() => {
    repsDone.current = 0;
    setCurrentRep(0);
    setActiveW(-1);
    setProgress(0);
    setDone(false);
    setIsPlaying(false);
    setIsPaused(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  /* ── kontrole ──────────────────────────────────────────────────────────── */
  const play = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (done) { resetPlayer(); setTimeout(() => play(), 50); return; }
    repsDone.current = 0;
    setCurrentRep(0);
    setDone(false);
    audio.currentTime = 0;
    audio.play().catch(() => setError("Greška pri reprodukciji."));
    setIsPlaying(true);
    setIsPaused(false);
  };

  const pause = () => {
    audioRef.current?.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const resume = () => {
    audioRef.current?.play();
    setIsPlaying(true);
    setIsPaused(false);
  };

  /* ── audio events ──────────────────────────────────────────────────────── */
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const ms = audio.currentTime * 1000;

    // Progress
    if (audio.duration > 0) {
      const base   = (repsDone.current / totalReps) * 100;
      const within = (audio.currentTime / audio.duration) * (100 / totalReps);
      setProgress(Math.min(base + within, 100));
    }

    // Highlight — koristi segRef koji nema closure problema
    const segs = segRef.current;
    let active = -1;
    for (let i = 0; i < segs.length; i++) {
      const [wIdx, startMs, endMs] = segs[i];
      if (ms >= startMs && ms < endMs) {
        active = wIdx - 1; // API šalje 1-indexed
        break;
      }
    }
    setActiveW(active);
  }, [totalReps]);

  const handleEnded = useCallback(() => {
    setActiveW(-1);
    repsDone.current += 1;
    setCurrentRep(repsDone.current);

    if (repsDone.current < totalReps) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } else {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      setDone(true);
    }
  }, [totalReps]);

  const noSegments = segments.length === 0 && !loading;

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className={`rounded-2xl border overflow-hidden mb-4 ${tCard}`}>

      {/* Loader */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${GOLD} transparent ${GOLD} ${GOLD}` }} />
          <span className={`text-sm ${tMuted}`}>Učitavanje recitacije...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <p className="text-sm text-[#F58C8C] text-center py-6 px-4">{error}</p>
      )}

      {/* ── Arapski tekst s praćenjem ────────────────────────────────────── */}
      {!loading && !error && (
        <div className="px-5 pt-6 pb-4 text-center">
          {words.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-x-3" dir="rtl"
              style={{ fontFamily: "'Amiri', 'KFGQPC Uthmanic Script HAFS', serif",
                       fontSize: "clamp(22px,3.5vw,32px)", lineHeight: 2.2 }}>
              {words.map((w, i) => {
                const isActive = activeW === i;
                const isPast   = isPlaying && activeW > i && activeW !== -1;
                return (
                  <span key={i} style={{
                    transition: "color 0.1s ease, background 0.1s ease",
                    borderRadius: "4px",
                    padding: "0 3px",
                    color: isActive
                      ? GOLD
                      : isPast
                        ? (isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)")
                        : undefined,
                    background: isActive
                      ? (isLight ? "rgba(201,162,39,0.15)" : "rgba(201,162,39,0.2)")
                      : "transparent",
                    fontWeight: isActive ? 700 : 400,
                  }}
                    className={!isActive && !isPast ? tText : ""}>
                    {w.text_uthmani}
                  </span>
                );
              })}
            </div>
          ) : (
            /* Fallback — nema word data, prikaži puni tekst */
            <p dir="rtl" className={tText}
              style={{ fontFamily: "'Amiri', serif",
                       fontSize: "clamp(22px,4vw,32px)", lineHeight: 2.2 }}>
              {verse?.text_uthmani}
            </p>
          )}

          {noSegments && words.length > 0 && (
            <p className={`text-[10px] mt-2 ${tSubtle}`}>
              Praćenje teksta nije dostupno za ovaj ajet
            </p>
          )}
        </div>
      )}

      {/* ── Repeat kontrole ─────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className={`flex items-center gap-3 px-5 py-3 border-t flex-wrap ${tBorder}`}>
          <span className={`text-[10px] font-semibold uppercase tracking-widest flex-shrink-0 ${tSubtle}`}>
            Ponovi:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {REPEAT_OPTS.map(n => (
              <button key={n}
                onClick={() => { setRepeatCount(n); setCustomRepeat(""); resetPlayer(); }}
                className={`w-9 h-9 rounded-xl border text-xs font-bold transition-all
                  ${repeatCount === n && !customRepeat
                    ? "border-[#C9A227]/60 bg-[#C9A227]/15 text-[#C9A227]"
                    : `${tBorder} ${tMuted} hover:border-[#C9A227]/30`}`}>
                {n}×
              </button>
            ))}
            <input type="number" min="1" max="200" placeholder="?" value={customRepeat}
              onChange={e => { setCustomRepeat(e.target.value); resetPlayer(); }}
              className={`w-14 h-9 rounded-xl border px-2 text-xs font-bold text-center outline-none transition-all ${tBorder} ${tInput}
                ${customRepeat ? "border-[#C9A227]/60 bg-[#C9A227]/15 !text-[#C9A227]" : ""}`}
            />
          </div>
        </div>
      )}

      {/* ── Progress ─────────────────────────────────────────────────────── */}
      {(isPlaying || isPaused || done || currentRep > 0) && (
        <div className={`px-5 pb-3`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-semibold ${tMuted}`}>
              {done
                ? "✓ Završeno!"
                : `${Math.min(currentRep + (isPlaying ? 1 : 0), totalReps)} / ${totalReps}`}
            </span>
            <span className={`text-[10px] ${tSubtle}`}>{Math.round(progress)}%</span>
          </div>
          <div className={`w-full h-1 rounded-full ${isLight ? "bg-black/8" : "bg-white/5"}`}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: GOLD }} />
          </div>
          {/* Točkice po ponavljanjima */}
          {totalReps <= 30 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {Array.from({ length: totalReps }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: i < currentRep
                      ? GOLD
                      : i === currentRep && isPlaying
                        ? `${GOLD}55`
                        : isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Kontrole + info o učaču ──────────────────────────────────────── */}
      {!loading && !error && (
        <div className={`flex items-center justify-between gap-4 px-5 py-4 border-t ${tBorder}`}>
          {/* Učač info */}
          <div>
            <p className={`text-xs font-semibold ${tText}`}>Mahmoud Khalil Al-Hussary</p>
            <p className={`text-[10px] ${tMuted}`} dir="rtl" style={{ fontFamily: "'Amiri', serif" }}>
              محمود خليل الحصري
            </p>
          </div>

          {/* Gumbi */}
          <div className="flex items-center gap-3">
            {(isPlaying || isPaused) && (
              <button onClick={resetPlayer}
                className={`w-9 h-9 rounded-full border flex items-center justify-center text-sm transition-all hover:opacity-70 ${tBorder} ${tMuted}`}>
                ■
              </button>
            )}
            {!isPlaying && !isPaused ? (
              <button onClick={play} disabled={!audioUrl}
                className="w-13 h-13 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md hover:opacity-90 transition-all disabled:opacity-30"
                style={{ width: 52, height: 52, background: audioUrl ? GOLD : undefined }}>
                {done ? "↺" : "▶"}
              </button>
            ) : isPaused ? (
              <button onClick={resume}
                className="w-13 h-13 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md hover:opacity-90 transition-all"
                style={{ width: 52, height: 52, background: GOLD }}>
                ▶
              </button>
            ) : (
              <button onClick={pause}
                className="rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md hover:opacity-90 transition-all"
                style={{ width: 52, height: 52, background: GOLD }}>
                ⏸
              </button>
            )}
          </div>
        </div>
      )}

      {/* Audio element — nije remountovan, mijenja se samo src */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => setError("Greška pri reprodukciji audio fajla.")}
        preload="auto"
      />
    </div>
  );
}
