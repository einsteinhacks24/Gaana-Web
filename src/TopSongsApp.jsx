import React, { useEffect, useState, useMemo } from 'react';
import { PlayCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const LANGUAGES = [
  { label: 'Telugu', code: 'telugu' },
  { label: 'Hindi', code: 'hindi' },
  { label: 'English', code: 'english' },
  { label: 'Tamil', code: 'tamil' },
  { label: 'Kannada', code: 'kannada' },
];

const proxyBuilders = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

const gaanaRaw = (code) =>
  `http://api.gaana.com/?type=song&subtype=most_popular&format=JSON&order=alltime&language=${code}&limit=0,100`;

async function fetchWithFallback(url) {
  for (const build of proxyBuilders) {
    try {
      const r = await fetch(build(url));
      if (r.ok) return r.json();
    } catch (_) {}
  }
  throw new Error('All proxies failed');
}

export default function TopSongsApp() {
  const [songs, setSongs] = useState({});
  const [selected, setSelected] = useState('telugu');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState({});

  useEffect(() => {
    LANGUAGES.forEach(async ({ code }) => {
      setLoading((l) => ({ ...l, [code]: true }));
      try {
        const json = await fetchWithFallback(gaanaRaw(code));
        const enriched = (json.tracks || []).map((track) => {
          const raw =
            typeof track.popularity === 'string' ? track.popularity : '0~0';
          const pop = raw.includes('~') ? parseInt(raw.split('~')[1], 10) : 0;
          return { ...track, _pop: isNaN(pop) ? 0 : pop };
        });
        setSongs((prev) => ({ ...prev, [code]: enriched }));
      } catch (e) {
        console.error('Fetch failed for', code);
      } finally {
        setLoading((l) => ({ ...l, [code]: false }));
      }
    });
  }, []);

  const visible = useMemo(() => {
    const all = songs[selected] || [];
    const filtered = search
      ? all.filter((t) =>
          [t.track_title, t.album_title, ...(t.artist || []).map((a) => a.name)]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      : all;
    return [...filtered].sort((a, b) => b._pop - a._pop);
  }, [songs, selected, search]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4">
      <h1 className="text-3xl font-bold text-center mb-6">
        Best of Gaana – Top 100 Songs
      </h1>

      <div className="flex justify-center space-x-3 mb-4">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelected(lang.code)}
            className={`px-4 py-1 rounded-full font-medium transition-all text-sm shadow-sm ${
              selected === lang.code
                ? 'bg-black text-white'
                : 'bg-white text-black border'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      <div className="max-w-md mx-auto mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs, albums, artists..."
          className="w-full px-4 py-2 rounded-lg border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {loading[selected] ? (
        <p className="text-center text-gray-500">Loading songs...</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((song, index) => (
            <motion.div
              key={song.track_id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="bg-white rounded-xl overflow-hidden shadow hover:shadow-md transition-shadow relative"
            >
              <div className="absolute top-2 left-2 bg-gradient-to-br from-purple-600 to-pink-500 text-white text-xs px-2 py-1 rounded-full shadow font-semibold">
                #{index + 1}
              </div>
              <img
                src={song.artwork_large}
                alt={song.track_title}
                className="w-full h-auto"
              />
              <div className="p-4">
                <h2 className="font-semibold text-lg mb-1 line-clamp-1">
                  {song.track_title}
                </h2>
                <div className="text-sm text-gray-900 mb-1 font-medium flex justify-between gap-2">
                  <span className="truncate w-full">{song.album_title}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {song.release_date &&
                      new Date(song.release_date).getFullYear()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                  {(song.artist || []).map((a) => a.name).join(', ')}
                </p>
                <div className="text-xs text-gray-700 mb-2 flex items-center justify-between">
                  <span>
                    {Math.floor(Number(song.duration) / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(Number(song.duration) % 60).toString().padStart(2, '0')}
                  </span>
                  <span>{Number(song._pop).toLocaleString()} 🔥</span>
                </div>
                <div className="flex space-x-3 text-sm">
                  {song.youtube_id && (
                    <a
                      href={`https://youtu.be/${song.youtube_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:underline"
                    >
                      <PlayCircle size={16} className="mr-1" /> YouTube
                    </a>
                  )}
                  {song.lyrics_url && (
                    <a
                      href={song.lyrics_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:underline"
                    >
                      <ExternalLink size={14} className="mr-1" /> Lyrics
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
