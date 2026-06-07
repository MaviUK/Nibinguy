import { useMemo, useState } from 'react'
import './index.css'

const COMPETITIONS = [
  { code: 'PL', name: 'Premier League' },
  { code: 'ELC', name: 'Championship' },
  { code: 'PD', name: 'La Liga' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'SA', name: 'Serie A' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'CL', name: 'Champions League' },
]

function formatKickoff(utcDate) {
  if (!utcDate) return 'Kickoff TBC'

  return new Date(utcDate).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getScoreText(match) {
  const home = match?.score?.fullTime?.home
  const away = match?.score?.fullTime?.away

  if (home === null || home === undefined || away === null || away === undefined) {
    return match.status || 'SCHEDULED'
  }

  return `${home} - ${away}`
}

function App() {
  const [competition, setCompetition] = useState('PL')
  const [mode, setMode] = useState('SCHEDULED')
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastLoaded, setLastLoaded] = useState('')

  const selectedCompetition = useMemo(
    () => COMPETITIONS.find((item) => item.code === competition),
    [competition]
  )

  async function loadMatches(nextMode = mode) {
    setLoading(true)
    setError('')
    setMode(nextMode)

    try {
      const endpoint = nextMode === 'FINISHED' ? 'updateResults' : 'fetchFixtures'
      const response = await fetch(
        `/.netlify/functions/${endpoint}?competition=${competition}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Could not load football data')
      }

      setMatches(data.matches || [])
      setLastLoaded(new Date().toLocaleString('en-GB'))
    } catch (err) {
      setError(err.message)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Goal Diff Fantasy</p>
        <h1>Pick 3 teams. Win on real goal difference.</h1>
        <p className="intro">
          This is the first working setup for your fantasy prediction football game.
          It pulls real fixtures and final scores through secure Netlify functions,
          keeping the football API key hidden from the browser.
        </p>

        <div className="controls">
          <label>
            Competition
            <select value={competition} onChange={(event) => setCompetition(event.target.value)}>
              {COMPETITIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="button-row">
            <button type="button" onClick={() => loadMatches('SCHEDULED')} disabled={loading}>
              {loading && mode === 'SCHEDULED' ? 'Loading...' : 'Load upcoming fixtures'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => loadMatches('FINISHED')}
              disabled={loading}
            >
              {loading && mode === 'FINISHED' ? 'Loading...' : 'Load latest results'}
            </button>
          </div>
        </div>

        {error && <p className="error-box">{error}</p>}
        {lastLoaded && <p className="loaded-note">Last loaded: {lastLoaded}</p>}
      </section>

      <section className="rules-grid" aria-label="Game rules summary">
        <article>
          <span>1</span>
          <h2>10 fixtures</h2>
          <p>Each fantasy gameweek uses 10 real football fixtures.</p>
        </article>
        <article>
          <span>2</span>
          <h2>Home vs away</h2>
          <p>The fantasy home user can only pick home teams. The away user can only pick away teams.</p>
        </article>
        <article>
          <span>3</span>
          <h2>Pick 3</h2>
          <p>Each user selects 3 teams and scores their combined real-life goal difference.</p>
        </article>
      </section>

      <section className="matches-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow small">{mode === 'FINISHED' ? 'Results' : 'Fixtures'}</p>
            <h2>{selectedCompetition?.name || competition}</h2>
          </div>
          <p>{matches.length} matches</p>
        </div>

        {matches.length === 0 && !loading && !error && (
          <div className="empty-state">
            Choose a competition, then load upcoming fixtures or latest results.
          </div>
        )}

        <div className="match-list">
          {matches.map((match) => (
            <article className="match-card" key={match.id}>
              <div className="team-row">
                <strong>{match.homeTeam?.name || 'Home team TBC'}</strong>
                <span className="score-pill">{getScoreText(match)}</span>
                <strong>{match.awayTeam?.name || 'Away team TBC'}</strong>
              </div>
              <div className="meta-row">
                <span>{formatKickoff(match.utcDate)}</span>
                <span>{match.competition?.name || selectedCompetition?.name}</span>
                <span>{match.status}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
