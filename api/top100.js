export default async function handler(req, res) {
    const { lang = 'telugu' } = req.query;
  
    const url = `http://api.gaana.com/?type=song&subtype=most_popular&format=JSON&order=alltime&language=${lang}&limit=0,100`;
  
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0', // trick Gaana into thinking it's a browser
        },
      });
  
      if (!r.ok) throw new Error(`Gaana API failed with status ${r.status}`);
  
      const json = await r.json();
      res.setHeader('Cache-Control', 's-maxage=3600'); // optional caching
      return res.status(200).json(json);
    } catch (e) {
      console.error('Backend fetch failed:', e.message);
      return res.status(500).json({ error: 'Backend fetch failed', details: e.message });
    }
  }