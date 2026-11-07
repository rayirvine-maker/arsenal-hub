export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    try {
      // FPL Standings
      if (path === '/api/standings') {
        const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
        const data = await res.json();
        const table = data.teams.sort((a, b) => a.position - b.position).map(t => ({
            position: t.position, team: { name: t.name }, playedGames: t.played, points: t.points
        }));
        return new Response(JSON.stringify({ standings: [{ table: table }] }), { headers: cors });
      }

      // FPL Fixtures
      if (path === '/api/fixtures') {
        const res = await fetch('https://fantasy.premierleague.com/api/fixtures/');
        const data = await res.json();
        const arsenalFixtures = data.filter(f => (f.team_h === 1 || f.team_a === 1) && f.kickoff_time).filter(f => new Date(f.kickoff_time) > new Date()).slice(0, 5).map(f => ({
            date: f.kickoff_time, home_team: f.team_h === 1 ? 'Arsenal' : `Team ${f.team_h}`, away_team: f.team_a === 1 ? 'Arsenal' : `Team ${f.team_a}`
        }));
        return new Response(JSON.stringify(arsenalFixtures), { headers: cors });
      }

      // RSS News
      if (path === '/api/news') {
        const rssUrl = 'https://feeds.arsenal.com/arsenal-news';
        const bridge = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        const res = await fetch(bridge);
        const data = await res.json();
        return new Response(JSON.stringify(data.items || []), { headers: cors });
      }

      // Live Scores (ESPN)
      if (path === '/api/live') {
        const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard');
        const data = await res.json();
        // Find Arsenal match (Team ID 359)
        const arsenalMatch = data.events?.find(e => e.competitions[0].competitors.some(c => c.team.id === "359"));
        
        if (arsenalMatch) {
             return new Response(JSON.stringify({ events: arsenalMatch.competitions[0].details || [] }), { headers: cors });
        } else {
             return new Response(JSON.stringify({ events: [] }), { headers: cors });
        }
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
    }
  }
};