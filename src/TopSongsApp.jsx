import React, { useEffect, useState, useMemo, useRef } from "react";
import { PlayCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import Hls from "hls.js";                     //  <-- NEW

const LANGUAGES = [
  { label: "Telugu", code: "telugu" },
  { label: "Hindi",  code: "hindi"  },
  { label: "English",code: "english"},
  { label: "Tamil",  code: "tamil"  },
  { label: "Kannada",code: "kannada"}
];

// backend endpoints
const top100 = (code)   => `/api/top100?lang=${code}`;
const playAPI = (key)   => `/api/stream?seokey=${key}`;

export default function TopSongsApp() {
  const [songs, setSongs]       = useState({});
  const [selected, setSelected] = useState("telugu");
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState({});
  const [playingUrl, setPlayingUrl] = useState("");

  // refs for hls.js
  const audioRef = useRef(null);
  const hlsRef   = useRef(null);

  /* fetch Top-100 once per language */
  useEffect(() => {
    LANGUAGES.forEach(async ({ code }) => {
      setLoading((l) => ({ ...l, [code]: true }));
      try {
        const json = await fetch(top100(code)).then(r => r.json());
        const enriched = (json.tracks || []).map(t => {
          const pop = parseInt((t.popularity || "0~0").split("~")[1], 10);
          return { ...t, _pop: isNaN(pop) ? 0 : pop };
        });
        setSongs(p => ({ ...p, [code]: enriched }));
      } finally {
        setLoading(l => ({ ...l, [code]: false }));
      }
    });
  }, []);

  /* search + sort */
  const visible = useMemo(() => {
    const all = songs[selected] || [];
    const filt = search
      ? all.filter(t =>
          [t.track_title, t.album_title, ...(t.artist||[]).map(a=>a.name)]
            .join(" ").toLowerCase().includes(search.toLowerCase())
        )
      : all;
    return [...filt].sort((a,b) => b._pop - a._pop);
  }, [songs, selected, search]);

  /* handle HLS playback whenever playingUrl changes */
  useEffect(() => {
    if (!playingUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    // Safari supports native HLS
    if (audio.canPlayType("application/vnd.apple.mpegURL")) {
      audio.src = playingUrl;
      return;
    }

    // Other browsers → hls.js
    if (hlsRef.current) hlsRef.current.destroy();
    const hls = new Hls();
    hlsRef.current = hls;
    hls.loadSource(playingUrl);
    hls.attachMedia(audio);
  }, [playingUrl]);

  /* click ▶️ */
  const playTrack = async (seokey) => {
    try {
      const { url, error } = await fetch(playAPI(seokey)).then(r=>r.json());
      if (url) setPlayingUrl(url);
      else alert(error || "Stream unavailable");
    } catch { alert("Stream fetch failed"); }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4">
      <h1 className="text-3xl font-bold text-center mb-6">
        Best of Gaana – Top 100 Songs
      </h1>

      {/* language pills */}
      <div className="flex justify-center space-x-3 mb-4">
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => setSelected(l.code)}
            className={`px-4 py-1 rounded-full font-medium text-sm shadow-sm transition ${
              selected===l.code ? "bg-black text-white" : "bg-white border"
            }`}
          >{l.label}</button>
        ))}
      </div>

      {/* search */}
      <div className="max-w-md mx-auto mb-6">
        <input
          className="w-full px-4 py-2 rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-400"
          placeholder="Search songs, albums, artists…"
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />
      </div>

      {/* player */}
      {playingUrl && (
        <div className="max-w-md mx-auto mb-6">
          <audio ref={audioRef} controls autoPlay className="w-full">
            {/* Safari fallback */}
            <source src={playingUrl} type="application/vnd.apple.mpegURL" />
          </audio>
        </div>
      )}

      {/* grid */}
      {loading[selected] ? (
        <p className="text-center text-gray-500">Loading songs…</p>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {visible.map((s, i) => (
            <motion.div key={s.track_id}
              className="bg-white rounded-xl shadow relative overflow-hidden"
              whileHover={{scale:1.03}} whileTap={{scale:0.97}}
            >
              <div className="absolute top-2 left-2 bg-gradient-to-br from-purple-600 to-pink-500 text-white px-3 py-1 rounded-full text-base font-bold shadow">
                #{i+1}
              </div>
              <img src={s.artwork_large} alt={s.track_title} />
              <div className="p-4">
                <h2 className="font-semibold text-lg truncate mb-1">{s.track_title}</h2>
                <div className="text-sm flex justify-between mb-1">
                  <span className="truncate">{s.album_title}</span>
                  <span className="text-gray-500 text-xs">
                    {s.release_date && new Date(s.release_date).getFullYear()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mb-2">
                  {(s.artist||[]).map(a=>a.name).join(', ')}
                </p>
                <div className="text-xs flex justify-between mb-2">
                  <span>
                    {`${Math.floor(s.duration/60).toString().padStart(2,'0')}:${(s.duration%60).toString().padStart(2,'0')}`}
                  </span>
                  <span>{s._pop.toLocaleString()} 🔥</span>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {s.youtube_id && (
                    <a className="text-blue-600 hover:underline inline-flex items-center"
                       href={`https://youtu.be/${s.youtube_id}`} target="_blank" rel="noopener noreferrer">
                      <PlayCircle size={16} className="mr-1"/> YouTube
                    </a>
                  )}
                  {s.lyrics_url && (
                    <a className="text-blue-600 hover:underline inline-flex items-center"
                       href={s.lyrics_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} className="mr-1"/> Lyrics
                    </a>
                  )}
                  <button onClick={()=>playTrack(s.seokey)} className="text-green-700 underline">▶️ Play</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}