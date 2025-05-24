import React, { useEffect, useState, useMemo, useRef } from "react";
import { Play, Pause, Youtube, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import Hls from "hls.js";

const LANGUAGES = [
  { label: "Telugu",  code: "telugu"  },
  { label: "Hindi",   code: "hindi"   },
  { label: "English", code: "english" },
  { label: "Tamil",   code: "tamil"   },
  { label: "Kannada", code: "kannada" }
];

const top100 = (c) => `/api/top100?lang=${c}`;
const playAPI = (k) => `/api/stream?seokey=${k}`;

export default function TopSongsApp() {
  /* ─────────────────────────── state ─────────────────────────── */
  const [songs, setSongs]         = useState({});
  const [selected, setSelected]   = useState("telugu");
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState({});
  const [playingUrl, setPlayingUrl] = useState("");
  const [current, setCurrent]     = useState(null);      // currently playing track_id
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const hlsRef   = useRef(null);

  /* ───────────────── fetch Top-100 ───────────────── */
  useEffect(() => {
    LANGUAGES.forEach(async ({ code }) => {
      setLoading((l) => ({ ...l, [code]: true }));
      try {
        const j = await fetch(top100(code)).then((r) => r.json());
        const list = (j.tracks || []).map((t) => ({
          ...t,
          _pop: parseInt((t.popularity || "0~0").split("~")[1], 10) || 0
        }));
        setSongs((p) => ({ ...p, [code]: list }));
      } finally {
        setLoading((l) => ({ ...l, [code]: false }));
      }
    });
  }, []);

  /* ───────────────── search + sort ───────────────── */
  const visible = useMemo(() => {
    const l = songs[selected] || [];
    const f = search.trim().toLowerCase();
    const filtered = f
      ? l.filter((t) =>
          [t.track_title, t.album_title, ...(t.artist || []).map((a) => a.name)]
            .join(" ")
            .toLowerCase()
            .includes(f)
        )
      : l;
    return [...filtered].sort((a, b) => b._pop - a._pop);
  }, [songs, selected, search]);

  /* ───────────────── HLS attach ───────────────── */
  useEffect(() => {
    if (!playingUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    // native HLS (Safari)
    if (audio.canPlayType("application/vnd.apple.mpegURL")) {
      audio.src = playingUrl;
      audio.play();
      return;
    }

    // other browsers
    if (hlsRef.current) hlsRef.current.destroy();
    const hls = new Hls();
    hlsRef.current = hls;
    hls.loadSource(playingUrl);
    hls.attachMedia(audio);
    hls.on(Hls.Events.MANIFEST_PARSED, () => audio.play());
  }, [playingUrl]);

  /* ───────────────── play / pause handler ───────────────── */
  const handlePlayPause = async (track) => {
    // Pause?
    if (current === track.track_id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    // Fetch stream & play
    try {
      const { url } = await fetch(playAPI(track.seokey)).then((r) => r.json());
      if (!url) return alert("Stream unavailable");
      setPlayingUrl(url);
      setCurrent(track.track_id);
      setIsPlaying(true);
    } catch {
      alert("Stream fetch failed");
    }
  };

  /* ───────────────── UI ───────────────── */
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Best of Gaana – Top 100 Songs</h1>

      {/* language pills */}
      <div className="flex justify-center space-x-3 mb-4">
        {LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => setSelected(code)}
            className={`px-4 py-1 rounded-full text-sm font-medium shadow-sm transition ${
              selected === code ? "bg-black text-white" : "bg-white border"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* search */}
      <div className="max-w-md mx-auto mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs, albums, artists…"
          className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => { setIsPlaying(false); setCurrent(null); }}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* grid */}
      {loading[selected] ? (
        <p className="text-center text-gray-500">Loading songs…</p>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {visible.map((s, idx) => {
            const isCurrent = current === s.track_id;
            const playing   = isCurrent && isPlaying;

            return (
              <motion.div
                key={s.track_id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`bg-white rounded-xl shadow relative overflow-hidden ${
                  isCurrent ? "ring-2 ring-green-400 shadow-lg" : ""
                }`}
              >
                {/* rank badge */}
                <div className="absolute top-2 left-2 bg-gradient-to-br from-purple-600 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow z-10">
                  #{idx + 1}
                </div>

                {/* artwork + overlay button */}
                <div className="relative group">
                  <img src={s.artwork_large} alt={s.track_title} className="w-full aspect-square object-cover" />
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition ${
                      playing ? "bg-black/20" : ""
                    }`}
                  >
                    <motion.button
                      onClick={() => handlePlayPause(s)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className={`rounded-full p-3 shadow-lg transition ${
                        playing
                          ? "bg-green-500 text-white"
                          : "bg-white text-gray-800 group-hover:bg-green-500 group-hover:text-white"
                      } ${playing ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"}`}
                    >
                      {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                    </motion.button>
                  </div>

                  {/* playing badge */}
                  {playing && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      <span>Playing</span>
                    </div>
                  )}
                </div>

                {/* details */}
                <div className="p-4">
                  <h2 className="font-semibold text-base truncate mb-1">{s.track_title}</h2>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate text-gray-600">{s.album_title}</span>
                    <span className="text-gray-500 text-xs">
                      {s.release_date && new Date(s.release_date).getFullYear()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-3">
                    {(s.artist || []).map((a) => a.name).join(", ")}
                  </p>

                  <div className="text-xs flex justify-between mb-3 text-gray-500">
                    <span>
                      {`${Math.floor(s.duration / 60)
                        .toString()
                        .padStart(2, "0")}:${(s.duration % 60).toString().padStart(2, "0")}`}
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>{(s._pop / 1e6).toFixed(1)}M</span>
                      <span>🔥</span>
                    </span>
                  </div>

                  {/* action row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {s.youtube_id && (
                        <a
                          href={`https://youtu.be/${s.youtube_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:text-red-700 transition"
                          title="Watch on YouTube"
                        >
                          <Youtube size={16} />
                        </a>
                      )}
                      {s.lyrics_url && (
                        <a
                          href={s.lyrics_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 transition"
                          title="View Lyrics"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>

                    {/* compact play / pause pill */}
                    <button
                      onClick={() => handlePlayPause(s)}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                        playing
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700"
                      }`}
                    >
                      {playing ? (
                        <>
                          <Pause size={12} />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} className="ml-0.5" />
                          <span>Play</span>
                        </>
                      )}
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