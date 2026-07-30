import { useState, useMemo, useRef } from "react";

/* ════════════════════════════════════════════════════════════════
   OCHE PAD — per-dart entry prototype
   Two pad layouts, one 501 leg, tap-to-tap timing so you can see
   which one is actually faster rather than guessing.
   ════════════════════════════════════════════════════════════════ */

const seg = (label, val, ring) => ({ label, val, ring, dbl: ring === "D" });

const S = Array.from({ length: 20 }, (_, i) => seg(String(i + 1), i + 1, "S"));
const D = Array.from({ length: 20 }, (_, i) => seg("D" + (i + 1), (i + 1) * 2, "D"));
const T = Array.from({ length: 20 }, (_, i) => seg("T" + (i + 1), (i + 1) * 3, "T"));
const OUTER = seg("25", 25, "S");
const BULL = seg("BULL", 50, "D");
const MISS = seg("MISS", 0, "S");

/* preferred finishing doubles, in the order a player actually wants them */
const PREF_D = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  .map((n) => D[n - 1])
  .concat([BULL]);
const SETUP = [...T].reverse().concat([BULL], [...S].reverse(), [OUTER]);

const memo = new Map();
function finish(score, darts) {
  if (score <= 1 || score > 170) return null;
  const key = score + ":" + darts;
  if (memo.has(key)) return memo.get(key);
  let out = null;
  for (const d of PREF_D) if (d.val === score) { out = [d]; break; }
  if (!out && darts > 1) {
    for (const s of SETUP) {
      if (s.val >= score) continue;
      const rest = finish(score - s.val, darts - 1);
      if (rest) { out = [s, ...rest]; break; }
    }
  }
  memo.set(key, out);
  return out;
}

/* ── derive full game state from the event list ── */
function derive(events, n, starter) {
  const P = Array.from({ length: n }, () => ({ score: 501, darts: 0, best: 0 }));
  let cur = starter, visitDarts = [], visitStart = 501, winner = null, lastVisit = null;

  for (const e of events) {
    if (winner !== null) break;
    const p = P[cur];
    visitDarts.push(e);
    p.darts++;
    const next = p.score - e.val;
    const bust = next < 0 || next === 1 || (next === 0 && !e.dbl);

    if (bust) {
      p.score = visitStart;
      lastVisit = { p: cur, scored: 0, bust: true };
      cur = (cur + 1) % n; visitDarts = []; visitStart = P[cur].score;
    } else {
      p.score = next;
      if (next === 0) { winner = cur; p.best = Math.max(p.best, visitStart); }
      else if (visitDarts.length === 3) {
        const scored = visitStart - p.score;
        p.best = Math.max(p.best, scored);
        lastVisit = { p: cur, scored, bust: false };
        cur = (cur + 1) % n; visitDarts = []; visitStart = P[cur].score;
      }
    }
  }
  return { P, cur, visitDarts, visitStart, winner, lastVisit };
}

const avg = (p) => (p.darts ? ((501 - p.score) / p.darts) * 3 : 0);

export default function OchePad() {
  const [players, setPlayers] = useState(null);
  const [layout, setLayout] = useState("board");
  const [events, setEvents] = useState([]);
  const [legs, setLegs] = useState([0, 0]);
  const [starter, setStarter] = useState(0);
  const [taps, setTaps] = useState({ board: [], mod: [] });
  const [modKey, setModKey] = useState(null);
  const [sheet, setSheet] = useState(null);
  const lastTap = useRef(0);

  const n = players || 1;
  const g = useMemo(() => derive(events, n, starter), [events, n, starter]);
  const me = g.P[g.cur];
  const route = finish(me.score, 3 - g.visitDarts.length);

  function throwDart(s) {
    if (g.winner !== null) return;
    const now = performance.now();
    if (g.visitDarts.length > 0 && lastTap.current) {
      const dt = now - lastTap.current;
      if (dt < 8000) setTaps((t) => ({ ...t, [layout]: [...t[layout], dt] }));
    }
    lastTap.current = now;
    setEvents((e) => [...e, { ...s, layout }]);
    setModKey(null);
    setSheet(null);
  }

  function undo() {
    setEvents((e) => e.slice(0, -1));
    lastTap.current = 0;
  }

  function nextLeg() {
    if (g.winner !== null) setLegs((l) => l.map((v, i) => (i === g.winner ? v + 1 : v)));
    setStarter((s) => (s + 1) % n);
    setEvents([]);
    lastTap.current = 0;
  }

  const median = (a) => {
    if (!a.length) return null;
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)] / 1000;
  };

  /* ── hero tiles: the route you're actually on, padded with your bread and butter ── */
  const hero = useMemo(() => {
    const out = [];
    const push = (s) => { if (!out.find((o) => o.label === s.label)) out.push(s); };
    if (route) route.forEach(push);
    [T[19], T[18], S[19], S[18], S[4], S[0]].forEach(push);
    return out.slice(0, 6);
  }, [route]);

  if (!players)
    return (
      <div className="oche">
        <style>{CSS}</style>
        <div className="setup">
          <p className="eyebrow">Per-dart entry · 501 · double out</p>
          <h1 className="wordmark">OCHE<span>PAD</span></h1>
          <p className="lede">
            Throw a few legs with each pad. It times the gap between your taps,
            so at the end of the leg you get told which one is faster instead of
            having to remember.
          </p>
          <button className="big" onClick={() => setPlayers(1)}>Solo practice</button>
          <button className="big ghost" onClick={() => setPlayers(2)}>Two player</button>
        </div>
      </div>
    );

  return (
    <div className="oche">
      <style>{CSS}</style>

      {/* players */}
      <header className="rail">
        {g.P.map((p, i) => (
          <div key={i} className={"pl" + (i === g.cur ? " on" : "")}>
            <span className="who">{n === 1 ? "You" : "Player " + (i + 1)}</span>
            <span className="mini">{avg(p).toFixed(1)} avg · {p.darts} darts</span>
            {n > 1 && <span className="legs">{legs[i]}</span>}
          </div>
        ))}
      </header>

      {/* score */}
      <section className="board">
        <div className="scoreWrap">
          <div className="score">{me.score}</div>
          <button className="undo" onClick={undo} disabled={!events.length}>Undo dart</button>
        </div>
        <div className="slots">
          {[0, 1, 2].map((i) => {
            const d = g.visitDarts[i];
            return (
              <div key={i} className={"slot" + (d ? " f " + d.ring : "")}>
                {d ? d.label : ""}
              </div>
            );
          })}
        </div>
        <p className="hint">
          {route ? <>Finish · {route.map((r) => r.label).join("  ")}</> : "No finish from here"}
        </p>
      </section>

      {/* pad */}
      <main className="pad">
        {layout === "board" ? (
          <>
            <div className="grid3 grow">
              {hero.map((s) => (
                <Key key={s.label} s={s} onTap={throwDart} big />
              ))}
            </div>
            <div className="grid4">
              <Key s={OUTER} onTap={throwDart} />
              <Key s={BULL} onTap={throwDart} />
              <Key s={MISS} onTap={throwDart} />
              <button className="key more" onClick={() => setSheet("open")}>Board</button>
            </div>
          </>
        ) : (
          <>
            <div className="grid2 mods">
              <button className={"key mod D" + (modKey === "D" ? " on" : "")}
                onClick={() => setModKey((m) => (m === "D" ? null : "D"))}>Double</button>
              <button className={"key mod T" + (modKey === "T" ? " on" : "")}
                onClick={() => setModKey((m) => (m === "T" ? null : "T"))}>Treble</button>
            </div>
            <div className="grid5 grow">
              {S.map((s, i) => {
                const pick = modKey === "D" ? D[i] : modKey === "T" ? T[i] : s;
                return <Key key={i} s={pick} label={s.label} onTap={throwDart} />;
              })}
            </div>
            <div className="grid3">
              <Key s={OUTER} onTap={throwDart} />
              <Key s={BULL} onTap={throwDart} />
              <Key s={MISS} onTap={throwDart} />
            </div>
          </>
        )}
      </main>

      <footer className="bar">
        <button className={"tab" + (layout === "board" ? " on" : "")} onClick={() => setLayout("board")}>
          Board pad
        </button>
        <button className={"tab" + (layout === "mod" ? " on" : "")} onClick={() => setLayout("mod")}>
          Modifier pad
        </button>
      </footer>

      {/* all segments sheet */}
      {sheet && (
        <div className="veil" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div className="sheet">
            {sheet === "open" ? (
              <>
                <p className="eyebrow">Pick a number</p>
                <div className="grid5">
                  {S.map((s, i) => (
                    <button key={i} className="key" onClick={() => setSheet(i)}>{s.label}</button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="eyebrow">Which ring on {sheet + 1}?</p>
                <div className="grid3">
                  <Key s={S[sheet]} label="Single" onTap={throwDart} big />
                  <Key s={D[sheet]} label="Double" onTap={throwDart} big />
                  <Key s={T[sheet]} label="Treble" onTap={throwDart} big />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* leg done */}
      {g.winner !== null && (
        <div className="veil">
          <div className="sheet done">
            <p className="eyebrow">Leg won{n > 1 ? " · player " + (g.winner + 1) : ""}</p>
            <div className="figs">
              <Fig k="Darts" v={g.P[g.winner].darts} />
              <Fig k="3-dart avg" v={avg(g.P[g.winner]).toFixed(2)} />
              <Fig k="Best visit" v={g.P[g.winner].best} />
            </div>
            <p className="eyebrow sp">Tap-to-tap, median</p>
            <div className="figs">
              <Fig k="Board pad" v={median(taps.board) ? median(taps.board).toFixed(2) + "s" : "—"} />
              <Fig k="Modifier pad" v={median(taps.mod) ? median(taps.mod).toFixed(2) + "s" : "—"} />
            </div>
            <button className="big" onClick={nextLeg}>Next leg</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Key({ s, onTap, big, label }) {
  return (
    <button className={"key " + s.ring + (big ? " big" : "")} onClick={() => onTap(s)}>
      <span className="lab">{label ?? s.label}</span>
      {big && <span className="val">{s.val}</span>}
    </button>
  );
}

const Fig = ({ k, v }) => (
  <div className="fig"><span className="fk">{k}</span><span className="fv">{v}</span></div>
);

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600;700&display=swap');

.oche{
  --slate:#15181C; --bed:#20252B; --chalk:#F2EDE3; --wire:#B08D57;
  --red:#C8102E; --green:#0E6B45; --tung:#8A9099;
  position:fixed; inset:0; display:flex; flex-direction:column;
  background:var(--slate); color:var(--chalk);
  font-family:'Instrument Sans',system-ui,sans-serif; overflow:hidden;
}
.oche *{box-sizing:border-box}
.oche button{font-family:inherit; color:inherit; border:0; cursor:pointer; -webkit-tap-highlight-color:transparent}
.oche button:focus-visible{outline:2px solid var(--wire); outline-offset:-3px}

.eyebrow{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.16em;
  text-transform:uppercase; color:var(--wire); margin:0 0 10px}
.eyebrow.sp{margin-top:20px}

/* setup */
.setup{margin:auto; padding:28px; max-width:420px}
.wordmark{font-family:'Archivo Black',sans-serif; font-size:52px; line-height:.9;
  letter-spacing:-.03em; margin:0 0 16px}
.wordmark span{color:var(--wire)}
.lede{font-size:15px; line-height:1.5; color:#B9BEC6; margin:0 0 28px}
.big{width:100%; padding:16px; background:var(--chalk); color:var(--slate);
  font-size:16px; font-weight:700; margin-bottom:10px}
.big.ghost{background:transparent; color:var(--chalk); box-shadow:inset 0 0 0 1px var(--wire)}

/* rail */
.rail{display:flex; gap:1px; background:var(--wire); flex:0 0 auto}
.pl{flex:1; background:var(--slate); padding:9px 14px; display:flex;
  align-items:baseline; gap:8px; opacity:.4}
.pl.on{opacity:1; background:var(--bed)}
.who{font-weight:600; font-size:13px}
.mini{font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--tung)}
.legs{margin-left:auto; font-family:'Archivo Black',sans-serif; font-size:16px; color:var(--wire)}

/* score */
.board{padding:10px 14px 12px; flex:0 0 auto}
.scoreWrap{display:flex; align-items:center; justify-content:space-between}
.score{font-family:'Archivo Black',sans-serif; font-size:76px; line-height:.86;
  letter-spacing:-.045em; font-variant-numeric:tabular-nums}
.undo{background:transparent; box-shadow:inset 0 0 0 1px #3A4048; padding:11px 15px;
  font-size:13px; font-weight:600; color:#C9CED6}
.undo:disabled{opacity:.3}
.slots{display:grid; grid-template-columns:repeat(3,1fr); gap:1px;
  background:var(--wire); margin-top:12px}
.slot{background:var(--bed); height:42px; display:grid; place-items:center;
  font-family:'IBM Plex Mono',monospace; font-size:16px; color:var(--tung)}
.slot.f{color:var(--chalk); font-weight:500}
.slot.f.D{background:var(--red)} .slot.f.T{background:var(--green)}
.hint{font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--tung);
  margin:9px 0 0; letter-spacing:.04em}

/* pad — tiles float on a brass spider */
.pad{flex:1; min-height:0; display:flex; flex-direction:column; gap:1px;
  background:var(--wire); padding:1px 0 0}
.grow{flex:1; min-height:0}
.grid2,.grid3,.grid4,.grid5{display:grid; gap:1px; background:var(--wire)}
.grid2{grid-template-columns:repeat(2,1fr)}
.grid3{grid-template-columns:repeat(3,1fr)}
.grid4{grid-template-columns:repeat(4,1fr)}
.grid5{grid-template-columns:repeat(5,1fr)}
.grid3.grow{grid-template-rows:repeat(2,1fr)}
.grid5.grow{grid-template-rows:repeat(4,1fr)}
.grid4,.grid3:not(.grow),.grid2{flex:0 0 58px}

.key{background:var(--bed); display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:2px; font-size:17px; font-weight:600; min-height:44px;
  transition:filter .08s}
.key:active{filter:brightness(1.7)}
.key.D{background:var(--red)} .key.T{background:var(--green)}
.key.big .lab{font-family:'Archivo Black',sans-serif; font-size:26px; letter-spacing:-.02em}
.key.big .val{font-family:'IBM Plex Mono',monospace; font-size:11px; opacity:.65}
.key.more{color:var(--wire); font-size:14px}
.mods .key{font-size:14px; letter-spacing:.03em; background:var(--bed); opacity:.55}
.mods .key.on{opacity:1}
.mods .key.D.on{background:var(--red)} .mods .key.T.on{background:var(--green)}

/* footer */
.bar{display:flex; gap:1px; background:var(--wire); flex:0 0 auto}
.tab{flex:1; background:var(--slate); padding:13px; font-size:13px; font-weight:600;
  color:var(--tung)}
.tab.on{background:var(--bed); color:var(--chalk); box-shadow:inset 0 2px 0 var(--wire)}

/* overlays */
.veil{position:absolute; inset:0; background:rgba(10,12,14,.82);
  display:flex; align-items:flex-end}
.sheet{width:100%; background:var(--slate); padding:18px 14px 22px;
  box-shadow:0 -1px 0 var(--wire); animation:rise .16s ease-out}
.sheet .key{min-height:52px}
.done{padding-bottom:26px}
.figs{display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--wire)}
.fig{background:var(--bed); padding:12px 10px}
.fk{display:block; font-family:'IBM Plex Mono',monospace; font-size:10px;
  letter-spacing:.1em; text-transform:uppercase; color:var(--tung); margin-bottom:5px}
.fv{font-family:'Archivo Black',sans-serif; font-size:22px; letter-spacing:-.02em}
.done .big{margin-top:20px}
@keyframes rise{from{transform:translateY(14px); opacity:0}to{transform:none; opacity:1}}
@media (prefers-reduced-motion:reduce){.sheet{animation:none} .key{transition:none}}
`;
