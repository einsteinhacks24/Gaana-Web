import React, { useEffect, useState, useMemo, useRef } from "react";
import { Play, Pause, Youtube, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import Hls from "hls.js";

/* ───────────────── CONFIG ───────────────── */
const LANGUAGES = [
  { label: "Telugu", code: "telugu" },
  { label: "Hindi", code: "hindi" },
  { label: "English", code: "english" },
  { label: "Tamil", code: "tamil" },
  { label: "Kannada", code: "kannada" }
];
const apiTop = (c) => `/api/top100?lang=${c}`;
const apiPlay = (k) => `/api/stream?seokey=${k}`;

/* ───────────────── COMPONENT ───────────────── */
export default function TopSongsApp() {
  /* state */
  const [list, setList] = useState({});
  const [lang, setLang] = useState("telugu");
  const [q, setQ] = useState("");
  const [wait, setWait] = useState({});
  const [current, setCurrent] = useState(null); // track_id
  const [playing, setPlaying] = useState(false);
  const [url, setUrl] = useState("");

  const audio = useRef(null);
  const hls = useRef(null);

  /* fetch top‑100 per language once */
  useEffect(() => {
    LANGUAGES.forEach(async ({ code }) => {
      setWait((w) => ({ ...w, [code]: true }));
      try {
        const json = await fetch(apiTop(code)).then((r) => r.json());
        const tracks = (json.tracks || []).map((t) => ({
          ...t,
          _pop: parseInt((t.popularity || "0~0").split("~")[1], 10) || 0
        }));
        setList((p) => ({ ...p, [code]: tracks }));
      } finally {
        setWait((w) => ({ ...w, [code]: false }));
      }
    });
  }, []);

  /* search + sort */
  const songs = useMemo(() => {
    const src = list[lang] || [];
    const f = q.trim().toLowerCase();
    const r = f
      ? src.filter((s) =>
        [s.track_title, s.album_title, ...(s.artist || []).map((a) => a.name)]
          .join(" ").toLowerCase().includes(f)
      )
      : src;
    return [...r].sort((a, b) => b._pop - a._pop);
  }, [list, lang, q]);

  /* attach / detach HLS */
  useEffect(() => {
    if (!url) return;
    if (!audio.current) return;

    if (audio.current.canPlayType("application/vnd.apple.mpegURL")) {
      audio.current.src = url;
      audio.current.play();
      return;
    }

    if (hls.current) hls.current.destroy();
    hls.current = new Hls();
    hls.current.loadSource(url);
    hls.current.attachMedia(audio.current);
    hls.current.on(Hls.Events.MANIFEST_PARSED, () => audio.current.play());
  }, [url]);

  /* play / pause */
  const toggle = async (track) => {
    if (current === track.track_id && playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    try {
      const { url } = await fetch(apiPlay(track.seokey)).then((r) => r.json());
      if (!url) return alert("Stream unavailable");
      setUrl(url);
      setCurrent(track.track_id);
      setPlaying(true);
    } catch {
      alert("Stream fetch failed");
    }
  };

  /* helpers */
  const fmtDur = (d) => `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;

  /* ───────────────── UI ───────────────── */
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4">

      {/* title */}
      <h1 className="text-3xl font-bold text-center mb-6">Best of Gaana – Top 100</h1>

      {/* language pills */}
      <div className="flex justify-center gap-2 mb-5">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`px-4 py-1 rounded-full text-sm font-medium shadow transition ${lang === l.code ? "bg-black text-white" : "bg-white border"
              }`}
          >{l.label}</button>
        ))}
      </div>

      {/* search */}
      <div className="max-w-md mx-auto mb-6">
        <input
          placeholder="Search songs, albums, artists…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* hidden audio */}
      <audio
        ref={audio}
        onEnded={() => { setPlaying(false); setCurrent(null); }}
        onPause={() => setPlaying(false)}
        className="hidden"
      />

      {/* grid */}
      {wait[lang] ? (
        <p className="text-center text-gray-500">Loading…</p>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {songs.map((s, i) => {
            const isNow = current === s.track_id;
            return (
              <motion.div
                key={s.track_id}
                className={`bg-white rounded-xl shadow relative overflow-hidden ${isNow ? "ring-2 ring-green-400 shadow-lg" : ""
                  }`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {/* rank badge */}
                <div className="absolute top-2 left-2 z-10 bg-gradient-to-br from-purple-600 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow">
                  #{i + 1}
                </div>

                {/* artwork + overlay */}
                <div className="relative group">
                  <img src={s.artwork_large} alt={s.track_title} className="w-full aspect-square object-cover" />
                  <div className={`absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition ${isNow && playing ? "bg-black/20" : ""
                    }`}>
                    <motion.button
                      onClick={() => toggle(s)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.92 }}
                      className={`rounded-full p-3 shadow-lg transition ${isNow && playing ? "bg-green-500 text-white" : "bg-white text-gray-800 group-hover:bg-green-500 group-hover:text-white"
                        } ${isNow ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"}`}
                    >
                      {isNow && playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                    </motion.button>
                  </div>
                  {isNow && playing && (
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />Playing
                    </span>
                  )}
                </div>

                {/* info */}
                <div className="p-4">
                  <h2 className="font-medium text-base truncate mb-0.5">{s.track_title}</h2>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate text-gray-600">{s.album_title}</span>
                    <span className="text-gray-500 text-xs">{s.release_date && new Date(s.release_date).getFullYear()}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-2">{(s.artist || []).map((a) => a.name).join(", ")}</p>
                  <div className="flex justify-between text-xs text-gray-500 mb-3">
                    <span>{fmtDur(+s.duration)}</span>
                    <span>{(s._pop / 1e6).toFixed(1)}M 🔥</span>
                  </div>

                  {/* action bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {s.youtube_id && (
                        <a href={`https://youtu.be/${s.youtube_id}`} target="_blank" rel="noopener noreferrer" title="YouTube" className="text-red-600 hover:text-red-700">
                          <Youtube size={16} />
                        </a>
                      )}
                      {s.lyrics_url && (
                        <a href={s.lyrics_url} target="_blank" rel="noopener noreferrer" title="Lyrics" className="text-blue-600 hover:text-blue-700">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => toggle(s)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition ${isNow && playing ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700"
                        }`}
                    >
                      {isNow && playing ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                      <span>{isNow && playing ? "Pause" : "Play"}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
