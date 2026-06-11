"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Setlist, SetlistTrack } from "@/data/setlists";

type PitchCapableAudio = HTMLAudioElement & {
  preservesPitch?: boolean;
  mozPreservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
};

function findNextPlayableIndex(tracks: SetlistTrack[], startIndex: number): number {
  for (let index = startIndex; index < tracks.length; index += 1) {
    if (tracks[index]?.audioUrl) {
      return index;
    }
  }
  return -1;
}

function pickRandomPlayableIndex(tracks: SetlistTrack[], excludeIndex: number): number {
  const candidates: number[] = [];
  for (let index = 0; index < tracks.length; index += 1) {
    if (tracks[index]?.audioUrl && index !== excludeIndex) {
      candidates.push(index);
    }
  }
  if (!candidates.length) {
    return -1;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const SEEK_STEP_SECONDS = 10;
const DEFAULT_VOLUME = 1;
const MIN_PITCH_CENTS = -100;
const MAX_PITCH_CENTS = 100;
const PITCH_CENTS_STEP = 1;
const REPEAT_MODES = {
  OFF: "off",
  ALL: "all",
  ONE: "one",
} as const;
type RepeatMode = (typeof REPEAT_MODES)[keyof typeof REPEAT_MODES];
const REPEAT_ORDER: RepeatMode[] = [
  REPEAT_MODES.OFF,
  REPEAT_MODES.ALL,
  REPEAT_MODES.ONE,
];
const REPEAT_LABELS: Record<RepeatMode, string> = {
  [REPEAT_MODES.OFF]: "off",
  [REPEAT_MODES.ALL]: "repeat all",
  [REPEAT_MODES.ONE]: "repeat one",
};

function getTrackPitchKey(track: SetlistTrack | null | undefined, index: number): string {
  if (!track) {
    return "";
  }
  return [track.code || index, track.title || ""].join("::");
}

function clampPitchCents(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(MIN_PITCH_CENTS, Math.min(MAX_PITCH_CENTS, Math.round(numeric)));
}

function clampVolume(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_VOLUME;
  }
  return Math.max(0, Math.min(1, Number(numeric.toFixed(2))));
}

function formatPitchCents(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }
  return String(value);
}

function getPitchPlaybackRate(pitchCents: number): number {
  return Number((2 ** (pitchCents / 1200)).toFixed(4));
}

function applyPitchCents(
  audio: PitchCapableAudio | null | undefined,
  pitchCents: number
): void {
  if (!audio) {
    return;
  }
  // Disable browser pitch preservation so playback speed changes transpose the song.
  audio.preservesPitch = false;
  audio.mozPreservesPitch = false;
  audio.webkitPreservesPitch = false;
  audio.playbackRate = getPitchPlaybackRate(pitchCents);
}

type SetlistPlayerProps = {
  setlist: Setlist;
  allSetlists?: Setlist[];
};

export function SetlistPlayer({ setlist, allSetlists = [] }: SetlistPlayerProps) {
  const tracks = useMemo(() => setlist?.tracks || [], [setlist]);
  const otherSetlists = useMemo(
    () => allSetlists.filter((s) => s.slug !== setlist.slug),
    [allSetlists, setlist.slug]
  );
  const audioRef = useRef<PitchCapableAudio | null>(null);
  const theme = {
    surface: "linear-gradient(135deg, rgba(30, 0, 18, 0.92) 0%, rgba(15, 0, 9, 0.96) 100%)",
    panel: "rgba(233, 30, 140, 0.08)",
    text: "#ffffff",
    muted: "rgba(255, 220, 235, 0.72)",
    subtle: "rgba(255, 215, 0, 0.65)",
    border: "rgba(233, 30, 140, 0.28)",
    shadow: "0 0 60px rgba(233, 30, 140, 0.12), 0 24px 56px rgba(0,0,0,0.6)",
    button: "rgba(233, 30, 140, 0.9)",
    buttonText: "#ffffff",
    rowSurface: "rgba(233, 30, 140, 0.05)",
    activeRow: "rgba(233, 30, 140, 0.18)",
    readyBg: "rgba(255, 215, 0, 0.18)",
    readyText: "rgba(255, 215, 0, 0.95)",
    missingBg: "rgba(200, 29, 29, 0.22)",
    missingText: "rgba(255, 180, 180, 0.9)",
    ...setlist?.theme,
  };
  const firstPlayableIndex = useMemo(() => findNextPlayableIndex(tracks, 0), [tracks]);
  const [currentIndex, setCurrentIndex] = useState(firstPlayableIndex >= 0 ? firstPlayableIndex : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [attemptedAutoPlay, setAttemptedAutoPlay] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(REPEAT_MODES.ALL);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [pitchByTrack, setPitchByTrack] = useState<Record<string, number>>({});
  const [volumeByTrack, setVolumeByTrack] = useState<Record<string, number>>({});
  const [settingsSaveError, setSettingsSaveError] = useState("");
  const seekingRef = useRef<boolean>(false);
  const pendingSeekRef = useRef<number>(0);
  const pitchCentsRef = useRef<number>(0);
  const currentTrack = tracks[currentIndex] || null;
  const pitchSettingsEndpoint = `/api/setlists/${encodeURIComponent(setlist.slug)}/pitch`;
  const currentTrackPitchKey = getTrackPitchKey(currentTrack, currentIndex);
  const currentPitchCents = clampPitchCents(pitchByTrack[currentTrackPitchKey] || 0);
  const currentPlaybackRate = getPitchPlaybackRate(currentPitchCents);
  const currentPitchLabel = formatPitchCents(currentPitchCents);
  const currentPitchPercent =
    ((currentPitchCents - MIN_PITCH_CENTS) / (MAX_PITCH_CENTS - MIN_PITCH_CENTS)) * 100;
  const currentVolume = clampVolume(volumeByTrack[currentTrackPitchKey] ?? DEFAULT_VOLUME);
  const availableCount = tracks.filter((track) => track.audioUrl).length;
  const repeatLabel = REPEAT_LABELS[repeatMode];
  const nextRepeatMode =
    REPEAT_ORDER[(REPEAT_ORDER.indexOf(repeatMode) + 1) % REPEAT_ORDER.length];
  const nextRepeatLabel = REPEAT_LABELS[nextRepeatMode];
  const volumePercent = Math.round(currentVolume * 100);

  useEffect(() => {
    if (firstPlayableIndex >= 0) {
      setCurrentIndex(firstPlayableIndex);
    }
  }, [firstPlayableIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = currentVolume;
    }
  }, [currentVolume]);

  useEffect(() => {
    const controller = new AbortController();
    setPitchByTrack({});
    setVolumeByTrack({});
    setSettingsSaveError("");

    fetch(pitchSettingsEndpoint, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Pitch settings request failed.");
        }
        return response.json();
      })
      .then((data) => {
        const settings = data?.settings;
        const volumeSettings = data?.volumeSettings;
        setPitchByTrack(settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {});
        setVolumeByTrack(
          volumeSettings && typeof volumeSettings === "object" && !Array.isArray(volumeSettings)
            ? volumeSettings
            : {}
        );
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setSettingsSaveError("Song mix settings could not load from the database.");
        }
      });

    return () => controller.abort();
  }, [pitchSettingsEndpoint]);

  useEffect(() => {
    pitchCentsRef.current = currentPitchCents;
    applyPitchCents(audioRef.current, currentPitchCents);
  }, [currentPitchCents]);

  // Auto-play whenever the track changes; reset scrubber state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) {
      return undefined;
    }

    applyPitchCents(audio, pitchCentsRef.current);
    audio.load();
    applyPitchCents(audio, pitchCentsRef.current);
    setCurrentTime(0);
    setDuration(0);

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setAttemptedAutoPlay(true);
        })
        .catch(() => setIsPlaying(false));
    }

    return () => {
      if (audio && !audio.paused) {
        audio.pause();
      }
    };
  }, [currentTrack]);

  // Keep time display and scrubber in sync with playback.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return undefined;
    }

    function handleTimeUpdate() {
      if (!audio) {
        return;
      }
      if (!seekingRef.current) {
        setCurrentTime(audio.currentTime || 0);
      }
    }

    function handleDurationChange() {
      if (!audio) {
        return;
      }
      const next = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(next);
    }

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleDurationChange);
    audio.addEventListener("durationchange", handleDurationChange);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleDurationChange);
      audio.removeEventListener("durationchange", handleDurationChange);
    };
  }, []);

  const playCurrent = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) {
      return;
    }
    setAttemptedAutoPlay(true);
    const playPromise = audio.play();
    if (playPromise?.then) {
      playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(true);
    }
  }, [currentTrack]);

  // Clicking a queue row: just change index; the track-change effect auto-plays.
  function playIndex(index: number) {
    if (!tracks[index]?.audioUrl) {
      return;
    }
    setCurrentIndex(index);
  }

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) {
      return;
    }

    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    playCurrent();
  }, [currentTrack, playCurrent]);

  // Changing track: just set index; the track-change effect auto-plays.
  const moveBy = useCallback(
    (step: number) => {
      if (!tracks.length) {
        return;
      }

      if (shuffleEnabled) {
        const random = pickRandomPlayableIndex(tracks, currentIndex);
        if (random >= 0) {
          setCurrentIndex(random);
        }
        return;
      }

      const direction = step >= 0 ? 1 : -1;
      let index = currentIndex + direction;
      while (index >= 0 && index < tracks.length) {
        if (tracks[index]?.audioUrl) {
          setCurrentIndex(index);
          return;
        }
        index += direction;
      }
    },
    [currentIndex, shuffleEnabled, tracks]
  );

  const restartCurrent = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) {
      return;
    }
    audio.currentTime = 0;
    setCurrentTime(0);
  }, [currentTrack]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((mode) => {
      const idx = REPEAT_ORDER.indexOf(mode);
      return REPEAT_ORDER[(idx + 1) % REPEAT_ORDER.length];
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffleEnabled((on) => !on);
  }, []);

  const seekBy = useCallback(
    (delta: number) => {
      const audio = audioRef.current;
      if (!audio || !currentTrack?.audioUrl) {
        return;
      }
      const max = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Infinity;
      const next = Math.max(0, Math.min(max, (audio.currentTime || 0) + delta));
      audio.currentTime = next;
      setCurrentTime(next);
      if (audio.paused) {
        playCurrent();
      }
    },
    [currentTrack, playCurrent]
  );

  function handleSliderChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value);
    pendingSeekRef.current = value;
    setCurrentTime(value);

    if (!seekingRef.current) {
      const audio = audioRef.current;
      if (audio && currentTrack?.audioUrl) {
        audio.currentTime = value;
      }
    }
  }

  function handleSliderSeekStart() {
    if (!currentTrack?.audioUrl) {
      return;
    }
    seekingRef.current = true;
    setIsSeeking(true);
  }

  function handleSliderSeekEnd() {
    if (!seekingRef.current) {
      return;
    }
    seekingRef.current = false;
    setIsSeeking(false);
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) {
      return;
    }
    const value = pendingSeekRef.current;
    audio.currentTime = value;
    setCurrentTime(value);
    playCurrent();
  }

  function handleVolumeChange(event: React.ChangeEvent<HTMLInputElement>) {
    setVolumeForCurrentTrack(event.target.value);
  }

  const savePitchSetting = useCallback(
    async (trackKey: string, pitchCents: number) => {
      try {
        const response = await fetch(pitchSettingsEndpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackKey, pitchCents }),
        });

        if (!response.ok) {
          throw new Error("Pitch setting save failed.");
        }

        setSettingsSaveError("");
      } catch {
        setSettingsSaveError("Song mix change could not be saved to the database.");
      }
    },
    [pitchSettingsEndpoint]
  );

  const saveVolumeSetting = useCallback(
    async (trackKey: string, nextVolume: number) => {
      try {
        const response = await fetch(pitchSettingsEndpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackKey, volume: nextVolume }),
        });

        if (!response.ok) {
          throw new Error("Volume setting save failed.");
        }

        setSettingsSaveError("");
      } catch {
        setSettingsSaveError("Song mix change could not be saved to the database.");
      }
    },
    [pitchSettingsEndpoint]
  );

  const setVolumeForCurrentTrack = useCallback(
    (value: number | string) => {
      if (!currentTrackPitchKey || !currentTrack?.audioUrl) {
        return;
      }

      const nextVolume = clampVolume(Number(value));
      if (nextVolume === currentVolume) {
        return;
      }

      setVolumeByTrack((previous) => {
        if (nextVolume === DEFAULT_VOLUME) {
          const next = { ...previous };
          delete next[currentTrackPitchKey];
          return next;
        }
        return {
          ...previous,
          [currentTrackPitchKey]: nextVolume,
        };
      });
      void saveVolumeSetting(currentTrackPitchKey, nextVolume);
    },
    [currentTrack, currentTrackPitchKey, currentVolume, saveVolumeSetting]
  );

  const setPitchCents = useCallback(
    (value: number | string) => {
      if (!currentTrackPitchKey || !currentTrack?.audioUrl) {
        return;
      }

      const nextPitchCents = clampPitchCents(Number(value));
      if (nextPitchCents === currentPitchCents) {
        return;
      }

      setPitchByTrack((previous) => {
        if (nextPitchCents === 0) {
          const next = { ...previous };
          delete next[currentTrackPitchKey];
          return next;
        }
        return {
          ...previous,
          [currentTrackPitchKey]: nextPitchCents,
        };
      });
      void savePitchSetting(currentTrackPitchKey, nextPitchCents);
    },
    [currentPitchCents, currentTrack, currentTrackPitchKey, savePitchSetting]
  );

  const adjustPitch = useCallback(
    (delta: number) => {
      setPitchCents(currentPitchCents + delta);
    },
    [currentPitchCents, setPitchCents]
  );

  // Repeat-one wins over shuffle; otherwise shuffle picks a random playable
  // track and repeat-all wraps the sequential queue back to the start. With
  // both off we let the audio simply stop after the last track.
  function handleEnded() {
    if (repeatMode === REPEAT_MODES.ONE) {
      const audio = audioRef.current;
      if (audio && currentTrack?.audioUrl) {
        audio.currentTime = 0;
        setCurrentTime(0);
        playCurrent();
      }
      return;
    }

    if (shuffleEnabled) {
      const random = pickRandomPlayableIndex(tracks, currentIndex);
      if (random >= 0) {
        setCurrentIndex(random);
        return;
      }
      if (repeatMode === REPEAT_MODES.ALL) {
        const audio = audioRef.current;
        if (audio && currentTrack?.audioUrl) {
          audio.currentTime = 0;
          setCurrentTime(0);
          playCurrent();
        }
      }
      return;
    }

    const nextIndex = findNextPlayableIndex(tracks, currentIndex + 1);
    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
      return;
    }
    if (repeatMode === REPEAT_MODES.ALL) {
      const loopIndex = findNextPlayableIndex(tracks, 0);
      if (loopIndex >= 0) {
        setCurrentIndex(loopIndex);
      }
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as (HTMLElement & { isContentEditable?: boolean }) | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      let handled = true;
      switch (event.key) {
        case " ":
        case "Spacebar":
        case "k":
        case "K":
          togglePlayback();
          break;
        case "ArrowLeft":
          if (event.shiftKey) {
            moveBy(-1);
          } else {
            seekBy(-SEEK_STEP_SECONDS);
          }
          break;
        case "ArrowRight":
          if (event.shiftKey) {
            moveBy(1);
          } else {
            seekBy(SEEK_STEP_SECONDS);
          }
          break;
        case "ArrowUp":
          adjustPitch(PITCH_CENTS_STEP);
          break;
        case "ArrowDown":
          adjustPitch(-PITCH_CENTS_STEP);
          break;
        case "j":
        case "J":
          seekBy(-SEEK_STEP_SECONDS);
          break;
        case "l":
        case "L":
          seekBy(SEEK_STEP_SECONDS);
          break;
        case "Home":
        case "0":
          restartCurrent();
          break;
        case "p":
        case "P":
          moveBy(-1);
          break;
        case "n":
        case "N":
          moveBy(1);
          break;
        default:
          handled = false;
      }

      if (handled) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayback, moveBy, seekBy, restartCurrent, adjustPitch]);

  const cssVars: CSSProperties = {
    ["--setlist-surface" as string]: theme.surface,
    ["--setlist-panel" as string]: theme.panel,
    ["--setlist-text" as string]: theme.text,
    ["--setlist-muted" as string]: theme.muted,
    ["--setlist-subtle" as string]: theme.subtle,
    ["--setlist-border" as string]: theme.border,
    ["--setlist-shadow" as string]: theme.shadow,
    ["--setlist-button" as string]: theme.button,
    ["--setlist-button-text" as string]: theme.buttonText,
    ["--setlist-row-surface" as string]: theme.rowSurface,
    ["--setlist-active-row" as string]: theme.activeRow,
    ["--setlist-ready-bg" as string]: theme.readyBg,
    ["--setlist-ready-text" as string]: theme.readyText,
    ["--setlist-missing-bg" as string]: theme.missingBg,
    ["--setlist-missing-text" as string]: theme.missingText,
  } as CSSProperties;

  return (
    <section className="setlist-player" style={cssVars}>
      {otherSetlists.length > 0 && (
        <nav className="setlist-player__nav">
          <span className="setlist-player__nav-label">Other setlists:</span>
          {otherSetlists.map((s) => (
            <a key={s.slug} href={`/setlists/${s.slug}`}>
              {s.title}
            </a>
          ))}
        </nav>
      )}

      <div className="setlist-player__hero">
        <div>
          <p className="setlist-player__eyebrow">{setlist.eyebrow || "Dropbox jukebox"}</p>
          <h1>{setlist.title}</h1>
          <p className="setlist-player__lead">{setlist.description}</p>
        </div>
        <div className="setlist-player__stats">
          <div>
            <strong>{tracks.length}</strong>
            <span>tracks in set</span>
          </div>
          <div>
            <strong>{availableCount}</strong>
            <span>ready to play</span>
          </div>
        </div>
      </div>

      <p className="setlist-player__intro">{setlist.intro}</p>

      <div className="setlist-player__layout">
        <div className="setlist-player__now-playing">
          <header className="setlist-player__np-head">
            <p className="setlist-player__label">Now playing</p>
            <h2 className="setlist-player__np-title">{currentTrack?.title || "No track selected"}</h2>
            {(currentTrack?.code || currentTrack?.note) && (
              <div className="setlist-player__np-meta">
                {currentTrack?.code ? (
                  <span className="setlist-player__code">{currentTrack.code}</span>
                ) : null}
                {currentTrack?.note ? (
                  <span className="setlist-player__note">{currentTrack.note}</span>
                ) : null}
              </div>
            )}
          </header>

          <audio
            ref={audioRef}
            preload="none"
            src={currentTrack?.audioUrl || ""}
            onEnded={handleEnded}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            className="setlist-player__audio"
          />

          <div className="setlist-player__scrub" aria-hidden={!currentTrack?.audioUrl}>
            <input
              type="range"
              className={`setlist-player__slider${isSeeking ? " is-seeking" : ""}`}
              min={0}
              max={duration > 0 ? duration : 0}
              step={0.1}
              value={Math.min(currentTime, duration || currentTime)}
              onChange={handleSliderChange}
              onMouseDown={handleSliderSeekStart}
              onTouchStart={handleSliderSeekStart}
              onPointerDown={handleSliderSeekStart}
              onMouseUp={handleSliderSeekEnd}
              onTouchEnd={handleSliderSeekEnd}
              onPointerUp={handleSliderSeekEnd}
              onKeyUp={handleSliderSeekEnd}
              disabled={!currentTrack?.audioUrl || !duration}
              aria-label="Seek within current track"
            />
            <div className="setlist-player__scrub-times">
              <span className="setlist-player__time">{formatTime(currentTime)}</span>
              <span className="setlist-player__time setlist-player__time--end">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="setlist-player__transport" role="group" aria-label="Playback controls">
            <div
              className="setlist-player__transport-toggles"
              role="group"
              aria-label="Playback modes"
            >
              <button
                type="button"
                className="setlist-player__t-toggle"
                onClick={toggleShuffle}
                aria-pressed={shuffleEnabled}
                title={`Shuffle ${shuffleEnabled ? "on — click to turn off" : "off — click to turn on"}`}
                aria-label={`Shuffle ${shuffleEnabled ? "on" : "off"}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
                  <path d="M14.83 13.41 13.41 14.83l3.13 3.13L14.5 20H20v-5.5l-2.04 2.04zM14.5 4l2.04 2.04L4 18.59 5.41 20l12.55-12.55L20 9.5V4zM10.59 9.17 5.41 4 4 5.41l5.17 5.17z" />
                </svg>
              </button>
              <button
                type="button"
                className="setlist-player__t-toggle"
                onClick={cycleRepeatMode}
                aria-pressed={repeatMode !== REPEAT_MODES.OFF}
                data-mode={repeatMode}
                title={`Repeat: ${repeatLabel} — click for ${nextRepeatLabel}`}
                aria-label={`Repeat ${repeatLabel}. Click for ${nextRepeatLabel}.`}
              >
                {repeatMode === REPEAT_MODES.ONE ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2zM13 15V9h-1l-2 1v1h1.5v4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="setlist-player__transport-cluster">
              <button
                type="button"
                className="setlist-player__t-btn"
                onClick={() => moveBy(-1)}
                title="Previous track (Shift+Left, P)"
                aria-label="Previous track"
              >
                <span aria-hidden="true">⏮</span>
              </button>
              <button
                type="button"
                className="setlist-player__t-btn"
                onClick={restartCurrent}
                disabled={!currentTrack?.audioUrl}
                title="Restart current song (0 / Home)"
                aria-label="Restart current song"
              >
                <span aria-hidden="true">↺</span>
              </button>
              <button
                type="button"
                className="setlist-player__t-btn setlist-player__t-btn--seek"
                onClick={() => seekBy(-SEEK_STEP_SECONDS)}
                disabled={!currentTrack?.audioUrl}
                title="Back 10 seconds (Left, J)"
                aria-label="Back 10 seconds"
              >
                <span aria-hidden="true">«</span>
                <span className="setlist-player__t-num">10</span>
              </button>
              <button
                type="button"
                className="setlist-player__t-play"
                onClick={togglePlayback}
                disabled={!currentTrack?.audioUrl}
                title={attemptedAutoPlay ? "Play / Pause (Space, K)" : "Start set (Space, K)"}
                aria-label={isPlaying ? "Pause" : "Play"}
                data-state={isPlaying ? "playing" : "paused"}
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <rect x="7" y="5" width="3.6" height="14" rx="1.1" />
                    <rect x="13.4" y="5" width="3.6" height="14" rx="1.1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M8 5.14v13.72c0 .8.87 1.29 1.55.87l10.83-6.86a1.03 1.03 0 0 0 0-1.74L9.55 4.27A1.03 1.03 0 0 0 8 5.14z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className="setlist-player__t-btn setlist-player__t-btn--seek"
                onClick={() => seekBy(SEEK_STEP_SECONDS)}
                disabled={!currentTrack?.audioUrl}
                title="Forward 10 seconds (Right, L)"
                aria-label="Forward 10 seconds"
              >
                <span className="setlist-player__t-num">10</span>
                <span aria-hidden="true">»</span>
              </button>
              <button
                type="button"
                className="setlist-player__t-btn"
                onClick={() => moveBy(1)}
                title="Next track (Shift+Right, N)"
                aria-label="Next track"
              >
                <span aria-hidden="true">⏭</span>
              </button>
            </div>
          </div>

          <div className="setlist-player__mix-grid">
            <section className="setlist-player__mix-card" aria-label="Volume for current song">
              <header className="setlist-player__mix-card-head">
                <span className="setlist-player__mix-eyebrow">Volume</span>
                <strong className="setlist-player__mix-readout">{volumePercent}%</strong>
              </header>
              <input
                type="range"
                className="setlist-player__slider setlist-player__slider--volume"
                min={0}
                max={1}
                step={0.01}
                value={currentVolume}
                onChange={handleVolumeChange}
                disabled={!currentTrack?.audioUrl}
                aria-label={`Volume ${volumePercent}%`}
              />
              <p className="setlist-player__mix-foot">Saved per song</p>
            </section>

            <section className="setlist-player__mix-card" aria-label="Pitch for current song">
              <header className="setlist-player__mix-card-head">
                <span className="setlist-player__mix-eyebrow">Pitch</span>
                <div className="setlist-player__pitch-readout">
                  <button
                    type="button"
                    onClick={() => adjustPitch(-PITCH_CENTS_STEP)}
                    disabled={!currentTrack?.audioUrl || currentPitchCents <= MIN_PITCH_CENTS}
                    title="Lower pitch one cent (Down arrow)"
                    aria-label="Lower pitch one cent"
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                  <label className="setlist-player__pitch-input">
                    <span className="sr-only">Cents</span>
                    <input
                      type="number"
                      min={MIN_PITCH_CENTS}
                      max={MAX_PITCH_CENTS}
                      step={PITCH_CENTS_STEP}
                      value={currentPitchCents}
                      onChange={(event) => setPitchCents(event.target.value)}
                      disabled={!currentTrack?.audioUrl}
                      aria-label="Pitch shift in cents"
                    />
                    <span aria-hidden="true">¢</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => adjustPitch(PITCH_CENTS_STEP)}
                    disabled={!currentTrack?.audioUrl || currentPitchCents >= MAX_PITCH_CENTS}
                    title="Raise pitch one cent (Up arrow)"
                    aria-label="Raise pitch one cent"
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                </div>
              </header>
              <input
                type="range"
                className="setlist-player__pitch-slider"
                min={MIN_PITCH_CENTS}
                max={MAX_PITCH_CENTS}
                step={PITCH_CENTS_STEP}
                value={currentPitchCents}
                onChange={(event) => setPitchCents(event.target.value)}
                disabled={!currentTrack?.audioUrl}
                aria-label={`Pitch shift ${currentPitchLabel} cents`}
              />
              <p className="setlist-player__mix-foot">
                {currentPlaybackRate.toFixed(3)}× speed · ±100¢ range
              </p>
            </section>
          </div>

          {settingsSaveError ? <p className="setlist-player__pitch-status">{settingsSaveError}</p> : null}

          <p className="setlist-player__hotkeys">
            <span><kbd>Space</kbd> play/pause</span>
            <span><kbd>←</kbd> / <kbd>→</kbd> ±10s</span>
            <span><kbd>0</kbd> restart</span>
            <span><kbd>Shift</kbd>+<kbd>←</kbd> / <kbd>→</kbd> prev/next</span>
            <span><kbd>↑</kbd> / <kbd>↓</kbd> pitch</span>
          </p>

          {currentTrack?.audioUrl ? (
            <p className="setlist-player__linkline">
              <a href={currentTrack.audioUrl} target="_blank" rel="noopener noreferrer">
                Open current audio directly
              </a>
            </p>
          ) : (
            <p className="setlist-player__warning">This track is not available in Dropbox yet, so the player will skip it.</p>
          )}
        </div>

        <ol className="setlist-player__queue">
          {tracks.map((track, index) => {
            const isCurrent = index === currentIndex;
            const isAvailable = Boolean(track.audioUrl);
            const trackKey = getTrackPitchKey(track, index);
            const trackPitchCents = clampPitchCents(pitchByTrack[trackKey] || 0);
            const trackVolume = clampVolume(volumeByTrack[trackKey] ?? DEFAULT_VOLUME);
            return (
              <li key={`${track.code}-${track.title}`} className={isCurrent ? "is-current" : ""}>
                <button type="button" onClick={() => playIndex(index)} disabled={!isAvailable}>
                  <span className="setlist-player__track-meta">
                    <span className="setlist-player__track-code">{track.code}</span>
                    <span className="setlist-player__track-title">{track.title}</span>
                  </span>
                  <span className="setlist-player__queue-badges">
                    {trackPitchCents !== 0 ? (
                      <span className="setlist-player__badge setlist-player__badge--pitch">
                        Pitch {formatPitchCents(trackPitchCents)}¢
                      </span>
                    ) : null}
                    {trackVolume !== DEFAULT_VOLUME ? (
                      <span className="setlist-player__badge setlist-player__badge--pitch">
                        Vol {Math.round(trackVolume * 100)}%
                      </span>
                    ) : null}
                    <span className={`setlist-player__badge ${isAvailable ? "is-ready" : "is-missing"}`}>
                      {isAvailable ? "ready" : "missing"}
                    </span>
                  </span>
                </button>
                {track.note ? <p>{track.note}</p> : null}
              </li>
            );
          })}
        </ol>
      </div>

      <style jsx>{`
        .setlist-player {
          width: min(1100px, calc(100vw - 2rem));
          margin: 0 auto;
          padding: clamp(1.5rem, 2vw, 2.5rem);
          border-radius: 28px;
          background: var(--setlist-surface);
          box-shadow: var(--setlist-shadow);
          color: var(--setlist-text);
        }
        .setlist-player__nav {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1rem;
          align-items: center;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--setlist-border);
        }
        .setlist-player__nav-label {
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--setlist-subtle);
          margin-right: 0.25rem;
        }
        .setlist-player__nav a {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--setlist-button);
          text-decoration: none;
        }
        .setlist-player__nav a:hover {
          text-decoration: underline;
        }
        .setlist-player__hero {
          display: flex;
          justify-content: space-between;
          gap: 1.5rem;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        .setlist-player__eyebrow,
        .setlist-player__label,
        .setlist-player__code {
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 0.78rem;
          color: var(--setlist-subtle);
          margin: 0;
        }
        .setlist-player h1,
        .setlist-player h2 {
          margin: 0;
        }
        .setlist-player__lead,
        .setlist-player__intro,
        .setlist-player__note,
        .setlist-player__warning,
        .setlist-player__queue p,
        .setlist-player__linkline {
          color: var(--setlist-muted);
          line-height: 1.6;
        }
        .setlist-player__stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(120px, 1fr));
          gap: 0.75rem;
          min-width: 260px;
        }
        .setlist-player__stats div,
        .setlist-player__now-playing,
        .setlist-player__queue {
          border: 1px solid var(--setlist-border);
          border-radius: 20px;
          background: var(--setlist-panel);
        }
        .setlist-player__stats div {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .setlist-player__stats strong {
          font-size: 1.5rem;
        }
        .setlist-player__layout {
          display: grid;
          grid-template-columns: minmax(320px, 0.95fr) minmax(0, 1.2fr);
          gap: 1rem;
          margin-top: 1.5rem;
        }

        /* NOW PLAYING PANEL */
        .setlist-player__now-playing {
          padding: 1.25rem;
          position: sticky;
          top: 1rem;
          height: fit-content;
        }
        .setlist-player__audio {
          display: none;
        }
        .setlist-player__np-head {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 0.65rem;
        }
        .setlist-player__np-title {
          font-size: clamp(1.4rem, 2.6vw, 1.85rem);
          line-height: 1.15;
          letter-spacing: -0.005em;
        }
        .setlist-player__np-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem 0.85rem;
          align-items: baseline;
          margin-top: 0.1rem;
        }
        .setlist-player__np-meta .setlist-player__note {
          margin: 0;
          font-size: 0.88rem;
        }

        /* SCRUB BAR */
        .setlist-player__scrub {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin: 0.45rem 0 1rem;
        }
        .setlist-player__scrub-times {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .setlist-player__time {
          font-variant-numeric: tabular-nums;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--setlist-muted);
        }
        .setlist-player__time--end {
          text-align: right;
        }

        /* SLIDERS — shared base (used for the scrub bar) */
        .setlist-player__slider {
          appearance: none;
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            var(--setlist-button) 0%,
            var(--setlist-button) ${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%,
            rgba(255, 215, 0, 0.15) ${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%,
            rgba(255, 215, 0, 0.15) 100%
          );
          cursor: pointer;
          outline: none;
        }
        .setlist-player__slider:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .setlist-player__slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--setlist-button);
          border: 2px solid var(--setlist-button-text, #020409);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          cursor: pointer;
          transition: transform 0.12s ease;
        }
        .setlist-player__slider::-webkit-slider-thumb:hover,
        .setlist-player__slider:active::-webkit-slider-thumb,
        .setlist-player__slider.is-seeking::-webkit-slider-thumb {
          transform: scale(1.2);
        }
        .setlist-player__slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--setlist-button);
          border: 2px solid var(--setlist-button-text, #020409);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          cursor: pointer;
        }
        .setlist-player__slider.is-seeking::-moz-range-thumb {
          transform: scale(1.2);
        }
        .setlist-player__slider:focus-visible {
          box-shadow: 0 0 0 3px rgba(233, 30, 140, 0.45);
        }
        .setlist-player__slider--volume {
          background: linear-gradient(
            to right,
            var(--setlist-button) 0%,
            var(--setlist-button) ${volumePercent}%,
            rgba(255, 215, 0, 0.15) ${volumePercent}%,
            rgba(255, 215, 0, 0.15) 100%
          );
        }

        /* TRANSPORT */
        .setlist-player__transport {
          position: relative;
          display: grid;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 0.35rem;
          padding: 0.7rem 0.75rem 0.85rem;
          border: 1px solid var(--setlist-border);
          border-radius: 22px;
          background:
            radial-gradient(circle at 50% -40%, rgba(255, 215, 0, 0.18), transparent 60%),
            rgba(0, 0, 0, 0.22);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }
        .setlist-player__transport-toggles {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 0.2rem;
        }
        .setlist-player__t-toggle {
          appearance: none;
          border: 1px solid transparent;
          background: transparent;
          color: var(--setlist-muted);
          width: 2.1rem;
          height: 2.1rem;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease,
            border-color 0.15s ease, transform 0.15s ease;
        }
        .setlist-player__t-toggle svg {
          width: 1.05rem;
          height: 1.05rem;
        }
        .setlist-player__t-toggle:hover {
          color: var(--setlist-text);
          background: rgba(255, 255, 255, 0.08);
        }
        .setlist-player__t-toggle:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px rgba(233, 30, 140, 0.55);
        }
        .setlist-player__t-toggle[aria-pressed="true"] {
          color: var(--setlist-button);
          background: rgba(233, 30, 140, 0.16);
          border-color: rgba(233, 30, 140, 0.45);
        }
        .setlist-player__t-toggle[aria-pressed="true"]:hover {
          background: rgba(233, 30, 140, 0.26);
        }
        .setlist-player__transport-cluster {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
        }
        .setlist-player__t-btn,
        .setlist-player__t-play {
          appearance: none;
          cursor: pointer;
          line-height: 1;
          transition: transform 0.15s ease, background 0.15s ease,
            border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .setlist-player__t-btn {
          border: 1px solid var(--setlist-border);
          background: rgba(255, 255, 255, 0.06);
          color: var(--setlist-text);
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.05rem;
          font-weight: 700;
          padding: 0;
        }
        .setlist-player__t-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          background: rgba(255, 215, 0, 0.18);
          border-color: rgba(255, 215, 0, 0.55);
        }
        .setlist-player__t-btn:disabled,
        .setlist-player__t-play:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .setlist-player__t-btn--seek {
          width: auto;
          padding: 0 0.85rem;
          gap: 0.18rem;
        }
        .setlist-player__t-num {
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.04em;
        }
        .setlist-player__t-play {
          border: 0;
          width: 4.4rem;
          height: 4.4rem;
          border-radius: 999px;
          background: var(--setlist-button);
          color: var(--setlist-button-text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          box-shadow: 0 12px 28px rgba(233, 30, 140, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }
        .setlist-player__t-play:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 18px 36px rgba(233, 30, 140, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }
        .setlist-player__t-play svg {
          width: 1.6rem;
          height: 1.6rem;
          fill: currentColor;
        }
        .setlist-player__t-play[data-state="playing"] svg {
          width: 1.4rem;
          height: 1.4rem;
        }

        /* MIX GRID */
        .setlist-player__mix-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.7rem;
          margin-top: 0.85rem;
        }
        .setlist-player__mix-card {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          padding: 0.85rem 0.95rem;
          border: 1px solid var(--setlist-border);
          border-radius: 18px;
          background:
            radial-gradient(circle at top right, rgba(255, 215, 0, 0.1), transparent 50%),
            rgba(0, 0, 0, 0.2);
        }
        .setlist-player__mix-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.6rem;
          min-height: 2rem;
        }
        .setlist-player__mix-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--setlist-subtle);
        }
        .setlist-player__mix-readout {
          font-size: 1.05rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          color: var(--setlist-text);
        }
        .setlist-player__mix-foot {
          margin: 0;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--setlist-muted);
          letter-spacing: 0.02em;
        }

        /* PITCH READOUT (stepper + inline number) */
        .setlist-player__pitch-readout {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          padding: 0.18rem;
          border: 1px solid var(--setlist-border);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
        }
        .setlist-player__pitch-readout button {
          width: 1.65rem;
          height: 1.65rem;
          border-radius: 999px;
          border: 0;
          background: rgba(255, 215, 0, 0.18);
          color: var(--setlist-text);
          font-weight: 900;
          font-size: 0.95rem;
          line-height: 1;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: transform 0.12s ease, background 0.12s ease;
        }
        .setlist-player__pitch-readout button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: rgba(255, 215, 0, 0.32);
        }
        .setlist-player__pitch-readout button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .setlist-player__pitch-input {
          display: inline-flex;
          align-items: baseline;
          gap: 0.05rem;
          padding: 0 0.25rem;
          color: var(--setlist-text);
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .setlist-player__pitch-input input {
          width: 3.6ch;
          border: 0;
          background: transparent;
          color: var(--setlist-text);
          font: inherit;
          font-size: 0.95rem;
          font-weight: 800;
          text-align: right;
          padding: 0;
          outline: none;
          -moz-appearance: textfield;
        }
        .setlist-player__pitch-input input::-webkit-outer-spin-button,
        .setlist-player__pitch-input input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .setlist-player__pitch-input input:focus-visible {
          box-shadow: 0 0 0 2px rgba(233, 30, 140, 0.55);
          border-radius: 4px;
        }
        .setlist-player__pitch-input input:disabled {
          opacity: 0.5;
        }

        /* PITCH SLIDER */
        .setlist-player__pitch-slider {
          appearance: none;
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            rgba(255, 215, 0, 0.15) 0%,
            rgba(255, 215, 0, 0.15) ${Math.min(50, currentPitchPercent)}%,
            var(--setlist-button) ${Math.min(50, currentPitchPercent)}%,
            var(--setlist-button) ${Math.max(50, currentPitchPercent)}%,
            rgba(255, 215, 0, 0.15) ${Math.max(50, currentPitchPercent)}%,
            rgba(255, 215, 0, 0.15) 100%
          );
          cursor: pointer;
          outline: none;
        }
        .setlist-player__pitch-slider:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .setlist-player__pitch-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--setlist-button);
          border: 2px solid var(--setlist-button-text, #020409);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          cursor: pointer;
        }
        .setlist-player__pitch-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--setlist-button);
          border: 2px solid var(--setlist-button-text, #020409);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          cursor: pointer;
        }
        .setlist-player__pitch-slider:focus-visible {
          box-shadow: 0 0 0 3px rgba(233, 30, 140, 0.45);
        }

        .setlist-player__pitch-status {
          margin: 0.5rem 0 0;
          color: var(--setlist-missing-text);
          font-size: 0.82rem;
          font-weight: 700;
        }

        /* HOTKEYS / LINK / WARNING */
        .setlist-player__hotkeys {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem 1rem;
          margin: 0.85rem 0 0;
          font-size: 0.78rem;
          color: var(--setlist-subtle);
        }
        .setlist-player__hotkeys kbd {
          display: inline-block;
          padding: 0.1rem 0.4rem;
          margin: 0 0.05rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--setlist-text);
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid var(--setlist-border);
          border-radius: 6px;
        }
        .setlist-player__linkline {
          margin-top: 0.6rem;
          font-size: 0.85rem;
        }
        .setlist-player__linkline a {
          color: var(--setlist-button);
          text-decoration: none;
          border-bottom: 1px dashed currentColor;
        }
        .setlist-player__linkline a:hover {
          opacity: 0.85;
        }
        .setlist-player__warning {
          margin-top: 0.6rem;
          font-size: 0.85rem;
        }

        /* QUEUE (right column) */
        .setlist-player__queue {
          list-style: none;
          padding: 0.5rem;
          margin: 0;
        }
        .setlist-player__queue li {
          border-radius: 18px;
          padding: 0.4rem;
        }
        .setlist-player__queue li.is-current {
          background: var(--setlist-active-row);
        }
        .setlist-player__queue button {
          width: 100%;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          text-align: left;
          padding: 0.9rem 1rem;
          background: var(--setlist-row-surface);
          color: var(--setlist-text);
          border: 1px solid var(--setlist-border);
          border-radius: 16px;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .setlist-player__queue button:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .setlist-player__queue button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .setlist-player__track-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .setlist-player__track-code {
          font-size: 0.72rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--setlist-subtle);
        }
        .setlist-player__track-title {
          font-weight: 700;
        }
        .setlist-player__queue-badges {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 0.35rem;
        }
        .setlist-player__badge {
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .setlist-player__badge.is-ready {
          background: var(--setlist-ready-bg);
          color: var(--setlist-ready-text);
        }
        .setlist-player__badge.is-missing {
          background: var(--setlist-missing-bg);
          color: var(--setlist-missing-text);
        }
        .setlist-player__badge--pitch {
          background: rgba(255, 255, 255, 0.12);
          color: var(--setlist-text);
          border: 1px solid var(--setlist-border);
        }
        .setlist-player__queue p {
          margin: 0.45rem 0.5rem 0.8rem;
          font-size: 0.92rem;
        }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .setlist-player__hero,
          .setlist-player__layout {
            grid-template-columns: 1fr;
            display: grid;
          }
          .setlist-player__stats {
            min-width: 0;
          }
          .setlist-player__now-playing {
            position: static;
          }
          .setlist-player__mix-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 520px) {
          .setlist-player__transport {
            padding: 0.7rem 0.4rem;
          }
          .setlist-player__t-play {
            width: 3.6rem;
            height: 3.6rem;
          }
          .setlist-player__t-play svg {
            width: 1.35rem;
            height: 1.35rem;
          }
          .setlist-player__t-play[data-state="playing"] svg {
            width: 1.2rem;
            height: 1.2rem;
          }
          .setlist-player__t-btn {
            width: 2.2rem;
            height: 2.2rem;
            font-size: 1rem;
          }
          .setlist-player__t-btn--seek {
            padding: 0 0.55rem;
          }
          .setlist-player__transport-cluster {
            gap: 0.3rem;
          }
        }
      `}</style>
    </section>
  );
}
