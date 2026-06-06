'use client';

/**
 * GAYC/DC Memory Match
 * ---------------------
 * A campy, AC/DC-inspired memory matching card game.
 *
 * Game rules implemented in this file:
 *  - Each band member appears exactly twice on the board.
 *  - Cards start face-down.
 *  - Clicking a face-down card flips it.
 *  - At most TWO unmatched cards may be face-up at once. If the player clicks
 *    a third card while two unmatched cards are showing, the previous two
 *    flip back FIRST and then the third one reveals.
 *  - Two cards of the same member = a match. Matched cards stay up and become
 *    non-interactive.
 *  - A "move" is counted each time the player reveals the SECOND card of a
 *    comparison (i.e. one move per pair attempt).
 *  - Cards shuffle on every new game.
 *  - Best score (= fewest moves) is persisted per difficulty in localStorage.
 *
 * Edge cases guarded:
 *  - Double-clicking the same card (already flipped/matched -> ignored).
 *  - Rapid clicks during animation (`isLocked` ref blocks input briefly).
 *  - Clicking the same physical card twice and counting it as a match
 *    (we compare card index, not just member id).
 *  - Pending timeouts are cleared on unmount or new game.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// --- Band roster ------------------------------------------------------------
// Stage names and an accent color used for the graceful fallback when
// the actual image at /images/member-N.jpg is missing.
interface Member {
  id: string;
  name: string;
  src: string;
  // Two stops for the fallback gradient, plus a vibe word for flavor.
  fallback: { from: string; to: string; vibe: string };
}

const MEMBERS_5: Member[] = [
  {
    id: 'm1',
    name: 'Brian',
    src: '/images/member-1.jpg',
    fallback: { from: '#ff149d', to: '#5a004e', vibe: 'Drums' },
  },
  {
    id: 'm2',
    name: 'Chris',
    src: '/images/member-2.jpg',
    fallback: { from: '#ffe600', to: '#ff6f00', vibe: 'Lead Vocals' },
  },
  {
    id: 'm3',
    name: 'Paul',
    src: '/images/member-3.jpg',
    fallback: { from: '#00e5ff', to: '#0033aa', vibe: 'Bass' },
  },
  {
    id: 'm4',
    name: 'Steve',
    src: '/images/member-4.jpg',
    fallback: { from: '#a855f7', to: '#3b0764', vibe: 'Lead Guitar' },
  },
  {
    id: 'm5',
    name: 'Topher',
    src: '/images/member-5.jpg',
    fallback: { from: '#ff43c8', to: '#7a005f', vibe: 'Rhythm Guitar' },
  },
];

// HARD mode adds a 6th "member" — the band logo itself.
const LOGO_MEMBER: Member = {
  id: 'logo',
  name: 'GAYC/DC',
  src: '/images/gaycdc-logo.png',
  fallback: { from: '#ff149d', to: '#ffe600', vibe: 'The Band' },
};

// --- Card model -------------------------------------------------------------
interface Card {
  /** Stable id, unique to this physical card on the board. */
  uid: number;
  member: Member;
  isFlipped: boolean;
  isMatched: boolean;
  /** Triggers a one-shot CSS celebration on the matched cards. */
  celebrating: boolean;
}

type Difficulty = 5 | 6;

// --- Helpers ----------------------------------------------------------------
function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck(difficulty: Difficulty): Card[] {
  const roster = difficulty === 6 ? [...MEMBERS_5, LOGO_MEMBER] : MEMBERS_5;
  const pairs = roster.flatMap((m) => [m, m]);
  return shuffle(pairs).map((m, i) => ({
    uid: i,
    member: m,
    isFlipped: false,
    isMatched: false,
    celebrating: false,
  }));
}

const BEST_SCORE_KEY = (d: Difficulty) => `gaycdc:memory:best:${d}`;

// --- The component ----------------------------------------------------------
export default function MemoryGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>(5);
  const [cards, setCards] = useState<Card[]>(() => buildDeck(5));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [matchPop, setMatchPop] = useState(0); // bumps each match -> retriggers anim

  // Refs the click handler reads without re-binding on each render.
  const lockRef = useRef(false);
  const flippedRef = useRef<number[]>([]);
  const cardsRef = useRef<Card[]>(cards);
  const movesRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    flippedRef.current = flipped;
  }, [flipped]);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

  const totalPairs = difficulty;
  const matchedCount = useMemo(
    () => cards.filter((c) => c.isMatched).length / 2,
    [cards],
  );

  // Load best score whenever difficulty changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(BEST_SCORE_KEY(difficulty));
    setBestScore(raw ? Number(raw) : null);
  }, [difficulty]);

  // Cleanup any pending timeouts on unmount.
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []);

  // Helper: register a timeout so we can cancel them all on reset/unmount.
  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((x) => x !== t);
      fn();
    }, ms);
    timeoutsRef.current.push(t);
    return t;
  }, []);

  // --- Sound (Web Audio synth) ---------------------------------------------
  const getCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const W = window as unknown as {
        AudioContext: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = W.AudioContext || W.webkitAudioContext;
      if (!Ctor) return null;
      audioCtxRef.current = new Ctor();
    }
    return audioCtxRef.current;
  }, []);

  const playPowerChord = useCallback(() => {
    if (!soundOn) return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    // A major-ish power chord in saws -> pure rock.
    const freqs = [220, 277.18, 329.63, 440];
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.18, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);
    master.connect(ctx.destination);
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.connect(master);
      osc.start(now);
      osc.stop(now + 0.6);
    });
  }, [soundOn, getCtx]);

  const playFanfare = useCallback(() => {
    if (!soundOn) return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const seq = [220, 261.63, 329.63, 440, 523.25, 659.25];
    seq.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.11;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }, [soundOn, getCtx]);

  // --- Confetti -------------------------------------------------------------
  // Spawns confetti particles inside the board container, optionally radiating
  // from a specific card's center (matches) or as a full-board rain (win).
  const spawnConfetti = useCallback(
    (count: number, origin?: { x: number; y: number }, big = false) => {
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const cx = origin ? origin.x - rect.left : rect.width / 2;
      const cy = origin ? origin.y - rect.top : 0;
      const colors = ['#ff149d', '#ffe600', '#00e5ff', '#ff43c8', '#a855f7', '#fff'];
      for (let i = 0; i < count; i++) {
        const piece = document.createElement('span');
        piece.className = 'mem-confetti';
        const angle = origin
          ? (Math.random() * Math.PI * 2) // burst in all directions
          : Math.PI / 2 + (Math.random() - 0.5) * 0.6; // mostly downward
        const speed = (origin ? 180 : 120) + Math.random() * 220;
        const dx = Math.cos(angle) * speed * (origin ? 1 : 0.4);
        const dy =
          (origin ? Math.sin(angle) * speed : 240 + Math.random() * 320) +
          (origin ? -100 : 0);
        const rot = (Math.random() - 0.5) * 720;
        const size = (big ? 9 : 7) + Math.random() * (big ? 9 : 6);
        piece.style.setProperty('--x', `${cx}px`);
        piece.style.setProperty('--y', `${cy}px`);
        piece.style.setProperty('--dx', `${dx}px`);
        piece.style.setProperty('--dy', `${dy}px`);
        piece.style.setProperty('--rot', `${rot}deg`);
        piece.style.setProperty('--dur', `${1.1 + Math.random() * 1.6}s`);
        piece.style.setProperty('--delay', `${Math.random() * (origin ? 0.05 : 0.6)}s`);
        piece.style.width = `${size}px`;
        piece.style.height = `${size * (Math.random() > 0.5 ? 1 : 0.5)}px`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        board.appendChild(piece);
        // Auto-remove after the animation is over.
        const ttl = 2800;
        schedule(() => piece.remove(), ttl);
      }
    },
    [schedule],
  );

  // --- Reset / new game -----------------------------------------------------
  const startNewGame = useCallback(
    (d: Difficulty = difficulty) => {
      // Clear pending timers from the previous round.
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
      // Clear any lingering confetti on the board.
      if (boardRef.current) {
        boardRef.current
          .querySelectorAll('.mem-confetti')
          .forEach((el) => el.remove());
      }
      lockRef.current = false;
      setFlipped([]);
      setMoves(0);
      setShowWin(false);
      setMatchPop(0);
      setCards(buildDeck(d));
    },
    [difficulty],
  );

  // Reshuffle when difficulty changes.
  useEffect(() => {
    startNewGame(difficulty);
    // We intentionally only react to difficulty here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // --- Win detection --------------------------------------------------------
  useEffect(() => {
    if (cards.length === 0) return;
    const allMatched = cards.every((c) => c.isMatched);
    if (!allMatched) return;
    // Persist best score and trigger the win UI.
    if (typeof window !== 'undefined') {
      const key = BEST_SCORE_KEY(difficulty);
      const prev = window.localStorage.getItem(key);
      const prevNum = prev ? Number(prev) : Infinity;
      if (movesRef.current < prevNum) {
        window.localStorage.setItem(key, String(movesRef.current));
        setBestScore(movesRef.current);
      }
    }
    // Big celebration after the last match's flip settles.
    schedule(() => {
      setShowWin(true);
      spawnConfetti(140, undefined, true);
      playFanfare();
    }, 650);
  }, [cards, difficulty, schedule, spawnConfetti, playFanfare]);

  // --- The click handler ----------------------------------------------------
  const onCardClick = useCallback(
    (idx: number) => {
      if (lockRef.current) return;
      const cur = cardsRef.current;
      const card = cur[idx];
      if (!card || card.isFlipped || card.isMatched) return;
      const fl = flippedRef.current;

      // EDGE CASE: two unmatched are face-up and the user clicked a third card.
      // Flip the previous two back FIRST, then reveal the new card.
      if (fl.length === 2) {
        lockRef.current = true;
        const [a, b] = fl;
        setCards((prev) =>
          prev.map((c, i) =>
            i === a || i === b ? { ...c, isFlipped: false } : c,
          ),
        );
        setFlipped([]);
        // Wait for the flip-back animation, then reveal the third card.
        schedule(() => {
          setCards((prev) => {
            const next = prev.slice();
            next[idx] = { ...next[idx], isFlipped: true };
            return next;
          });
          setFlipped([idx]);
          lockRef.current = false;
        }, 280);
        return;
      }

      // First card of a comparison.
      if (fl.length === 0) {
        setCards((prev) => {
          const next = prev.slice();
          next[idx] = { ...next[idx], isFlipped: true };
          return next;
        });
        setFlipped([idx]);
        return;
      }

      // Second card of a comparison -> count a move.
      if (fl.length === 1) {
        const firstIdx = fl[0];
        // Defensive: ignore if somehow the same card got passed in twice.
        if (firstIdx === idx) return;

        setCards((prev) => {
          const next = prev.slice();
          next[idx] = { ...next[idx], isFlipped: true };
          return next;
        });
        setFlipped([firstIdx, idx]);
        setMoves((m) => m + 1);

        const isMatch = cur[firstIdx].member.id === cur[idx].member.id;
        if (isMatch) {
          // Lock briefly so the match flip is visible, then mark matched.
          lockRef.current = true;
          schedule(() => {
            setCards((prev) =>
              prev.map((c, i) =>
                i === firstIdx || i === idx
                  ? { ...c, isMatched: true, isFlipped: true, celebrating: true }
                  : c,
              ),
            );
            setFlipped([]);
            setMatchPop((n) => n + 1);
            playPowerChord();
            // Burst confetti from each matched card.
            const board = boardRef.current;
            if (board) {
              const els = board.querySelectorAll<HTMLElement>('.mem-card');
              [firstIdx, idx].forEach((cardIdx) => {
                const el = els[cardIdx];
                if (!el) return;
                const r = el.getBoundingClientRect();
                spawnConfetti(28, {
                  x: r.left + r.width / 2,
                  y: r.top + r.height / 2,
                });
              });
            }
            lockRef.current = false;
            // Turn off the per-card celebration class after the burst.
            schedule(() => {
              setCards((prev) =>
                prev.map((c, i) =>
                  i === firstIdx || i === idx ? { ...c, celebrating: false } : c,
                ),
              );
            }, 1100);
          }, 520);
        }
        // Non-match: leave both cards face-up. They'll close on the next click.
      }
    },
    [schedule, playPowerChord, spawnConfetti],
  );

  const onCardKey = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onCardClick(idx);
      }
    },
    [onCardClick],
  );

  // --- Render ---------------------------------------------------------------
  return (
    <div className="mem-wrap">
      <header className="mem-header">
        <div className="mem-title-block">
          <p className="eyebrow" style={{ marginBottom: 0 }}>
            ⚡ Fan Club Game ⚡
          </p>
          <h1 className="mem-title">Memory Match</h1>
          <p className="mem-subtitle">
            Flip cards. Find the pair. Crank it to eleven.
          </p>
        </div>

        <div className="mem-stats">
          <div className="mem-stat">
            <span className="mem-stat-label">Moves</span>
            <span className="mem-stat-value">{moves}</span>
          </div>
          <div className="mem-stat">
            <span className="mem-stat-label">Pairs</span>
            <span className="mem-stat-value">
              {matchedCount}/{totalPairs}
            </span>
          </div>
          <div className="mem-stat">
            <span className="mem-stat-label">Best</span>
            <span className="mem-stat-value">
              {bestScore != null ? bestScore : '—'}
            </span>
          </div>
          <div className="mem-stat">
            <span className="mem-stat-label">Par</span>
            <span className="mem-stat-value">{totalPairs}</span>
          </div>
        </div>
      </header>

      <div className="mem-controls">
        <div className="mem-mode-switch" role="tablist" aria-label="Difficulty">
          <button
            role="tab"
            aria-selected={difficulty === 5}
            className={`mem-mode-btn ${difficulty === 5 ? 'active' : ''}`}
            onClick={() => setDifficulty(5)}
          >
            Easy · 10 cards
          </button>
          <button
            role="tab"
            aria-selected={difficulty === 6}
            className={`mem-mode-btn ${difficulty === 6 ? 'active' : ''}`}
            onClick={() => setDifficulty(6)}
          >
            Hard · 12 cards
          </button>
        </div>

        <div className="mem-control-buttons">
          <button
            type="button"
            className={`mem-toggle ${soundOn ? 'on' : ''}`}
            onClick={() => setSoundOn((v) => !v)}
            aria-pressed={soundOn}
            title={soundOn ? 'Sound on' : 'Sound off'}
          >
            {soundOn ? '🔊 Sound On' : '🔇 Sound Off'}
          </button>
          <button
            type="button"
            className="button small"
            onClick={() => startNewGame()}
          >
            ⟲ New Game
          </button>
        </div>
      </div>

      <div
        ref={boardRef}
        className={`mem-board mem-grid size-${difficulty * 2}`}
        // The match-pop counter is referenced so React keeps re-rendering on
        // each match (so the inline "MATCH!" element re-mounts and replays).
        data-pop={matchPop}
      >
        {cards.map((card, i) => (
          <CardView
            key={card.uid}
            card={card}
            disabled={lockRef.current || card.isMatched}
            onClick={() => onCardClick(i)}
            onKeyDown={(e) => onCardKey(e, i)}
          />
        ))}

        {/* Big floating "MATCH!" pop that fires each time a pair is found. */}
        {matchPop > 0 && (
          <span key={matchPop} className="mem-match-pop" aria-hidden="true">
            MATCH!
          </span>
        )}
      </div>

      {showWin && (
        <WinModal
          moves={moves}
          par={totalPairs}
          bestScore={bestScore}
          onPlayAgain={() => startNewGame()}
        />
      )}
    </div>
  );
}

// --- Subcomponents ---------------------------------------------------------

function CardView({
  card,
  disabled,
  onClick,
  onKeyDown,
}: {
  card: Card;
  disabled: boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [backFailed, setBackFailed] = useState(false);

  const showFront = card.isFlipped || card.isMatched;

  return (
    <button
      type="button"
      className={[
        'mem-card',
        showFront ? 'is-flipped' : '',
        card.isMatched ? 'is-matched' : '',
        card.celebrating ? 'is-celebrating' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={disabled && !showFront}
      aria-label={
        card.isMatched
          ? `${card.member.name} (matched)`
          : card.isFlipped
            ? card.member.name
            : 'Face down card'
      }
    >
      <span className="mem-card-inner">
        {/* BACK ----------------------------------------------------------- */}
        <span className="mem-card-face mem-card-back">
          {!backFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/images/card-back.png"
              alt=""
              onError={() => setBackFailed(true)}
              draggable={false}
            />
          ) : (
            <span className="mem-back-fallback" aria-hidden="true">
              <span className="mem-back-bolt">⚡</span>
              <span className="mem-back-text">
                GAY<span className="mem-back-slash">/</span>C
                <span className="mem-back-slash">/</span>DC
              </span>
              <span className="mem-back-bolt flip">⚡</span>
            </span>
          )}
        </span>

        {/* FRONT ---------------------------------------------------------- */}
        <span
          className="mem-card-face mem-card-front"
          style={{
            // Color halo per member, used as a subtle frame even with photos.
            ['--m-from' as string]: card.member.fallback.from,
            ['--m-to' as string]: card.member.fallback.to,
          }}
        >
          {!imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.member.src}
              alt={card.member.name}
              onError={() => setImgFailed(true)}
              draggable={false}
            />
          ) : (
            <span className="mem-front-fallback" aria-hidden="true">
              <span className="mem-front-vibe">{card.member.fallback.vibe}</span>
              <span className="mem-front-name">{card.member.name}</span>
              <span className="mem-front-bolt">⚡</span>
            </span>
          )}
          <span className="mem-card-nameplate">{card.member.name}</span>
        </span>
      </span>
    </button>
  );
}

function WinModal({
  moves,
  par,
  bestScore,
  onPlayAgain,
}: {
  moves: number;
  par: number;
  bestScore: number | null;
  onPlayAgain: () => void;
}) {
  const isPerfect = moves === par;
  const isNewBest = bestScore != null && moves === bestScore && !isPerfect;

  return (
    <div className="mem-modal-backdrop" role="dialog" aria-modal="true">
      <div className="mem-modal">
        <div className="mem-modal-bolts" aria-hidden="true">
          <span>⚡</span>
          <span>⚡</span>
          <span>⚡</span>
        </div>
        <p className="eyebrow" style={{ marginBottom: 6 }}>
          High Voltage Victory
        </p>
        <h2 className="mem-modal-title">
          {isPerfect ? 'PERFECT RUN!' : 'YOU ROCK!'}
        </h2>
        <p className="mem-modal-line">
          You finished in <strong>{moves}</strong> move
          {moves === 1 ? '' : 's'}.
        </p>
        <p className="mem-modal-line muted">
          Best possible score: <strong>{par}</strong>{' '}
          {isPerfect ? '— and you nailed it.' : `(${moves - par} away).`}
        </p>
        {isNewBest && <p className="mem-modal-best">⚡ New personal best ⚡</p>}
        <button type="button" className="button mem-modal-cta" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}
