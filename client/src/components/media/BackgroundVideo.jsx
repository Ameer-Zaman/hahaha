import { useEffect, useRef, useState } from "react";

import { whenEntered } from "../../lib/intro";
import { claimVideo, useVideoSource } from "../../lib/preload";
import "./youtube-background.css";

/**
 * A self-hosted background video (e.g. /media/home.mp4) with the same behaviour as the
 * YouTube layer: muted loop, revealed only once it is really playing, paused off screen,
 * Sound and Pause controls, and no autoplay for reduced motion or data saver.
 * If the file is missing or can't play, whatever sits underneath simply stays.
 * `controls={false}` hides the buttons; the video then always stays muted (there would be
 * no way to turn the sound off again).
 */
export default function BackgroundVideo({
  src,
  poster = null,
  label = "Background video",
  controls = true,
}) {
  // While the intro is preloading this file, wait for it (then play it from memory).
  const source = useVideoSource(src);
  // streaming straight from the network (not preloaded): tell the preloader to leave it alone
  useEffect(() => {
    if (source && source === src) claimVideo(src);
  }, [source, src]);
  const videoRef = useRef(null);
  const userPaused = useRef(false);
  const wantSound = useRef(false); // "Enter with sound" chosen before the video had mounted
  const [autoplay] = useState(() => shouldAutoplay());
  const [started, setStarted] = useState(autoplay);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);

  // Pause while the video is off screen; resume when it returns (unless the visitor paused).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !started) return undefined;
    if (wantSound.current) {
      // The visitor already interacted with the page, so audio is allowed to start.
      wantSound.current = false;
      video.muted = false;
      video.play().catch(() => {});
      setMuted(false);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (userPaused.current) return;
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, [started, source]);

  // "Enter with sound" on the welcome screen: unmute inside that click, which browsers
  // accept as the gesture needed for audio.
  useEffect(
    () =>
      whenEntered(({ sound }) => {
        if (!sound || !controls) return;
        setStarted(true);
        const video = videoRef.current;
        if (!video) {
          wantSound.current = true;
          return;
        }
        video.muted = false;
        video.play().catch(() => {});
        setMuted(false);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const start = () => {
    setStarted(true);
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const togglePause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      video.play().catch(() => {});
      setPaused(false);
    } else {
      userPaused.current = true;
      video.pause();
      setPaused(true);
    }
  };

  return (
    <>
      <div
        className={`yt-bg ${playing ? "is-playing" : ""}`}
        aria-hidden="true"
      >
        {started && source && (
          <video
            ref={videoRef}
            className="bg-video__media"
            src={source}
            poster={poster ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            tabIndex={-1}
            aria-label={label}
            onPlaying={() => setPlaying(true)}
          />
        )}
      </div>

      {controls && (
        <div className="yt-bg__controls">
          {!started && (
            <button type="button" className="yt-bg__btn" onClick={start}>
              Play video
            </button>
          )}
          {playing && (
            <>
              <button
                type="button"
                className="yt-bg__btn"
                onClick={toggleSound}
                aria-pressed={!muted}
              >
                {muted ? "Sound on" : "Sound off"}
              </button>
              <button
                type="button"
                className="yt-bg__btn"
                onClick={togglePause}
                aria-pressed={paused}
              >
                {paused ? "Play" : "Pause"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function shouldAutoplay() {
  if (typeof window === "undefined") return false;
  const reduced = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const saveData = navigator.connection?.saveData === true;
  return !reduced && !saveData;
}
