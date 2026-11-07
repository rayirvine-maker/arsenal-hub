export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

    try {
      if (path === '/api/standings') {
        const res = await fetch('https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings');
        const data = await res.json();
        const entries = data.children[0].standings.entries;
        
        const table = entries.map(e => {
          const stats = e.stats.reduce((acc, s) => { acc[s.name] = s.value; return acc; }, {});
          return {
            position: stats.rank,
            team: { name: e.team.name },
            playedGames: stats.gamesPlayed,
            points: stats.points
          };
        });
        return new Response(JSON.stringify({ standings: [{ table: table }] }), { headers: cors });
      }

      if (path === '/api/fixtures') {
        const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/359/schedule');
        const data = await res.json();
        
        const futureMatches = data.events
          .filter(e => new Date(e.date) > new Date())
          .map(e => ({
            date: e.date,
            home_team: e.competitions[0].competitors.find(c => c.homeAway === 'home').team.displayName,
            away_team: e.competitions[0].competitors.find(c => c.homeAway === 'away').team.displayName
          }))
          .slice(0, 5);
          
        return new Response(JSON.stringify(futureMatches), { headers: cors });
      }

      if (path === '/api/news') {
        const rssUrl = 'https://feeds.bbci.co.uk/sport/football/teams/arsenal/rss.xml';
        const bridge = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        const res = await fetch(bridge);
        const data = await res.json();
        return new Response(JSON.stringify(data.items || []), { headers: cors });
      }

      if (path === '/api/live') {
        const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard');
        const data = await res.json();
        const arsenalMatch = data.events?.find(e => e.competitions[0].competitors.some(c => c.team.id === "359"));
        
        if (arsenalMatch) {
             return new Response(JSON.stringify({ events: arsenalMatch.competitions[0].details || [] }), { headers: cors });
        }
        return new Response(JSON.stringify({ events: [] }), { headers: cors });
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
    }
  }
};