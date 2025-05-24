import React, { useEffect, useState, useMemo, useRef } from "react";
import { PlayCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import Hls from "hls.js";

const LANGUAGES = [
  { label: "Telugu", code: "telugu" },
  { label: "Hindi", code: "hindi" },
  { label: "English", code: "english" },
  { label: "Tamil", code: "tamil" },
  { label: "Kannada", code: "kannada" }
];

// backend endpoints
const top100 = (code) => `/api/top100?lang=${code}`;
const playAPI = (sk)   => `/api/stream?seokey=${sk}`;

export default function TopSongsApp() {
  const [songs, setSongs]         = useState({});
  const [selected, setSelected]   = useState("telugu");
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState({});
  const [playingUrl, setPlayingUrl] = useState("");

  const audioRef = useRef(null);
  const hlsRef   = useRef(null);

  /* fetch Top‑100 per language */
  useEffect(() => {
    LANGUAGES.forEach(async ({ code }) => {
      setLoading((l) => ({ ...l, [code]: true }));
      try {
        const data = await fetch(top100(code)).then((r) => r.json());
        const tracks = (data.tracks || []).map((t) => {
          const pop = +((t.popularity || "0~0").split("~")[1] || 0);
          return { ...t, _pop: pop };
        });
        setSongs((p) => ({ ...p, [code]: tracks }));
      } finally {
        setLoading((l) => ({ ...l, [code]: false }));
      }
    });
  }, []);

  const visible = useMemo(() => {
    const list = songs[selected] || [];
    const f = search.toLowerCase();
    const filtered = f
      ? list.filter((s) =>
          [s.track_title, s.album_title, ...(s.artist || []).map((a) => a.name)]
            .join(" ")
            .toLowerCase()
            .includes(f)
        )
      : list;
    return [...filtered].sort((a, b) => b._pop - a._pop);
  }, [songs, selected, search]);

  /* HLS attach */
  useEffect(() => {
    if (!playingUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.canPlayType("application/vnd.apple.mpegURL")) {
      audio.src = playingUrl;
      return;
    }

    if (hlsRef.current) hlsRef.current.destroy();
    const h = new Hls();
    hlsRef.current = h;
    h.loadSource(playingUrl);
    h.attachMedia(audio);
  }, [playingUrl]);

  const playTrack = async (sk) => {
    try {
      const { url } = await fetch(playAPI(sk)).then((r) => r.json());
      if (url) setPlayingUrl(url);
      else alert("Stream unavailable");
    } catch {
      alert("Stream fetch failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Best of Gaana – Top 100 Songs</h1>

      {/* language tabs */}
      <div className="flex justify-center gap-3 mb-4">
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

      {/* audio player */}
      {playingUrl && (
        <div className="max-w-md mx-auto mb-6">
          <audio ref={audioRef} controls autoPlay className="w-full">
            <source src={playingUrl} type="application/vnd.apple.mpegURL" />
          </audio>
        </div>
      )}

      {/* grid */}
      {loading[selected] ? (
        <p className="text-center text-gray-500">Loading songs…</p>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {visible.map((s, idx) => (
            <motion.div
              key={s.track_id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="bg-white rounded-xl shadow relative overflow-hidden"
            >
              {/* rank badge */}
              <div className="absolute top-2 left-2 bg-gradient-to-br from-purple-600 to-pink-500 text-white px-3 py-1 rounded-full text-base font-bold shadow">
                #{idx + 1}
              </div>

              <img src={s.artwork_large} alt={s.track_title} />

              <div className="p-4">
                <h2 className="font-semibold text-lg truncate mb-1">{s.track_title}</h2>

                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate">{s.album_title}</span>
                  <span className="text-gray-500 text-xs">
                    {s.release_date && new Date(s.release_date).getFullYear()}
                  </span>
                </div>

                <p className="text-xs text-gray-500 truncate mb-2">
                  {(s.artist || []).map((a) => a.name).join(", ")}
                </p>

                <div className="flex justify-between text-xs mb-2">
                  <span>
                    {`${Math.floor(s.duration / 60).toString().padStart(2, "0")}:${(s.duration % 60)
                      .toString()
                      .padStart(2, "0")}`}
                  </span>
                  <span>{s._pop.toLocaleString()} 🔥</span>
                </div>

                {/* action links */}
                <div className="flex flex-wrap gap-3 text-sm items-center">
                  {s.youtube_id && (
                    <a
                      href={`https://youtu.be/${s.youtube_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:underline"
                    >
                      <PlayCircle size={16} className="mr-1" /> YouTube
                    </a>
                  )}

                  {s.lyrics_url && (
                    <a
                      href={s.lyrics_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:underline"
                    >
                      <ExternalLink size={14} className="mr-1" /> Lyrics
                    </a>
                  )}

                  <button
                    onClick={() => playTrack(s.seokey)}
                    className="inline-flex items-center text-green-700 hover:underline"
                  >
                    <PlayCircle size={16} className="mr-1" /> Play
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
