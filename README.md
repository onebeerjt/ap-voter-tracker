# AP Voter Tracker

Every AP college football poll voter's weekly top-25 ballot, with conference-bias analysis and outlier detection.
Seasons: 2025 (complete) and 2026 (in progress). Next.js App Router, TypeScript, fully static (no database).

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static build; all analysis runs at build time
npm run ingest   # refresh data/ (sequential, cached, ~75 requests); add -- --offline to rebuild from cache only
```

## Pages
- `/` season selector, latest consensus top 25, most biased voters
- `/voters` searchable, sortable voter table with consensus-fit scores
- `/voter/[id]` ballot history vs consensus, conference bias, biggest outlier picks
- `/week/[season]/[week]` consensus, biggest outliers, most deviant voters
- `/about` methodology and credits

## Data
`data/` is committed. `scripts/ingest.ts` regenerates it:
- `voters.json` `{id, name, outlet, seasons}`: id is a normalized-name slug (source IDs differ by season)
- `ballots.json` `{voter, season, week, rankings}`: `rankings` is team ids, index 0 = rank 1. Week 0 = preseason; 2025 week 17 = final poll
- `teams.json` `{id, name, conference, conferenceBySeason?}`: id is a normalized-name slug; conference from 2026 ballots, hardcoded fallback otherwise
- `meta.json`: seasons, week labels, generation time

The consensus is never read from the source; `lib/analysis.ts` computes it by Borda count.

### Source note
The collegepolltracker.com pages at `/football/pollster/<slug>/<year>/<week>` return HTML (the bare `<year>/<n>`
form 302-redirects to `week-n`), not JSON. The ingest script instead reads the same ballot data as static JSON
from `ironfootball.app/data/ap-polls/` (per-voter history for 2025, per-week files for 2026). Responses are cached
in `.cache/ingest` (git-ignored) with ETags.

## Credits
Poll data: AP Top 25 college football poll, © The Associated Press. Ballot data compiled from
[collegepolltracker.com](https://collegepolltracker.com). Independent project, not affiliated with the AP.
