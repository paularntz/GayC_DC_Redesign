'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface HeroProps {
  data: {
    eyebrow: string;
    headline: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
  };
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export function Hero({ data }: HeroProps) {
  const [videoStarted, setVideoStarted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const playerRef = useRef<any>(null);
  const videoId = 'yyDJmjmoyz0';

  const toggleMute = () => {
    if (playerRef.current && typeof playerRef.current.mute === 'function') {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  useEffect(() => {
    // Load YouTube API
    const loadYoutubeApi = () => {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          initPlayer();
        };
      } else {
        initPlayer();
      }
    };

    const initPlayer = () => {
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player('hero-player', {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          mute: 1,
          controls: 0,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          enablejsapi: 1,
          playlist: videoId, // Required for loop if using playlist param, but we handle loop manually
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    };

    let checkInterval: NodeJS.Timeout;

    function onPlayerReady() {
      // Initial 1s wait
      setTimeout(() => {
        startVideoCycle();
      }, 1000);
    }

    function startVideoCycle() {
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
        setVideoStarted(true);
        setHeroVisible(false);
      }
    }

    function onPlayerStateChange(event: any) {
      if (event.data === window.YT.PlayerState.PLAYING) {
        // Start polling for end of video
        if (checkInterval) clearInterval(checkInterval);
        checkInterval = setInterval(() => {
          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            const currentTime = playerRef.current.getCurrentTime();
            const duration = playerRef.current.getDuration();
            
            // Last 3 seconds: fade back in
            if (duration > 0 && duration - currentTime <= 3) {
              setHeroVisible(true);
            }
          }
        }, 500);
      } else if (event.data === window.YT.PlayerState.ENDED) {
        if (checkInterval) clearInterval(checkInterval);
        setVideoStarted(false);
        setHeroVisible(true);
        
        // Wait 5 seconds before restarting
        setTimeout(() => {
          startVideoCycle();
        }, 5000);
      }
    }

    loadYoutubeApi();

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      // We don't destroy the player here to avoid issues with re-renders
      // but in a real app we might want to clean up more thoroughly
    };
  }, []);

  return (
    <section className={`hero ${videoStarted ? 'video-active' : ''}`}>
      <div className="hero-video-container">
        <div id="hero-player" className="youtube-iframe" />
        <div className="hero-overlay" />
      </div>
      {videoStarted && (
        <button 
          onClick={toggleMute}
          className="sound-toggle"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          )}
          <span className="sparkle" style={{ top: '10%', left: '10%', animationDelay: '0s' }}>✨</span>
          <span className="sparkle" style={{ bottom: '10%', right: '10%', animationDelay: '0.5s' }}>✨</span>
        </button>
      )}
      <div className={`hero-content ${heroVisible ? 'fade-in' : 'fade-out'}`}>
        <p className="eyebrow">{data.eyebrow}</p>
        <h1>{data.headline}</h1>
        <p className="lede">{data.body}</p>
        <div className="actions">
          <Link className="button" href="/shows">
            {data.primaryCta}
          </Link>
          <Link className="button ghost" href="/contact">
            {data.secondaryCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
