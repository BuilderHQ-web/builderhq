"use client";

import * as React from "react";
import { Play } from "lucide-react";

/**
 * The welcome video, presented as a portrait piece rather than an embed.
 *
 * The film is 9:16, so it is framed the way it was shot: a tall, softly
 * lifted card with the poster frame showing until the viewer chooses to
 * start. Native controls stay hidden until first play so the resting
 * state is a photograph and a single button, not a scrubber.
 */
export function WelcomeVideo() {
  const ref = React.useRef<HTMLVideoElement | null>(null);
  const [started, setStarted] = React.useState(false);

  function start() {
    const el = ref.current;
    if (!el) return;
    setStarted(true);
    void el.play();
  }

  return (
    <figure className="relative mx-auto w-full max-w-[320px] sm:max-w-[350px]">
      {/* Soft ground shadow so the card sits on the cream rather than floating. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -bottom-6 h-24 rounded-full blur-2xl"
        style={{ background: "rgba(24,34,44,0.16)" }}
      />

      <div className="relative overflow-hidden rounded-[22px] border border-border-subtle bg-black shadow-[0_40px_90px_-30px_rgba(24,34,44,0.45)]">
        <video
          ref={ref}
          className="block h-auto w-full"
          src="/partners/welcome/welcome.mp4"
          poster="/partners/welcome/poster.jpg"
          preload="metadata"
          playsInline
          controls={started}
          onEnded={() => setStarted(false)}
        />

        {/* Resting state: the poster, a whisper of shade, one button. */}
        {!started ? (
          <button
            type="button"
            onClick={start}
            aria-label="Play the welcome video"
            className="group absolute inset-0 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-inset"
          >
            <span
              aria-hidden
              className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-90"
              style={{
                background:
                  "linear-gradient(180deg, rgba(16,24,32,0.10) 0%, rgba(16,24,32,0.02) 42%, rgba(16,24,32,0.42) 100%)",
              }}
            />
            <span className="relative flex size-[66px] items-center justify-center rounded-full bg-white/95 shadow-[0_10px_30px_-8px_rgba(16,24,32,0.55)] backdrop-blur-sm transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]">
              <Play className="size-6 translate-x-[2px] fill-[#141c22] text-[#141c22]" strokeWidth={1} />
            </span>
            <span className="absolute bottom-5 left-0 right-0 text-center text-[12px] font-medium tracking-[0.02em] text-white/90">
              46 seconds
            </span>
          </button>
        ) : null}
      </div>
    </figure>
  );
}
