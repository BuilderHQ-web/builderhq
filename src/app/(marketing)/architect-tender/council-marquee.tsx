/**
 * CouncilMarquee — quiet credibility band shown below the main content.
 *
 * Renders the council list twice so the CSS `marqueeDrift` keyframe can
 * translate the track by -50% and create a seamless infinite loop. Each
 * item has two visual states:
 *
 *   · Idle: filter `brightness(0) invert(1)` turns the artwork into a
 *     uniform soft-white silhouette. This gives the band visual cohesion
 *     across logos that otherwise span navy, multi-colour, monochrome,
 *     and yellow — without any of them stealing focus.
 *   · Hover: the filter falls away and the real council brand colours
 *     bloom in. Acts as a gentle "yes, these are the real marks"
 *     reveal for the curious.
 *
 * No interaction beyond hover treatment — this is decorative legitimacy
 * signalling, not a clickable nav. Marquee continues to scroll on hover
 * (we don't pause) because halting mid-loop creates a jarring snap.
 */

type CouncilItem = {
  /** Display name — also the alt text for the image. */
  name: string;
  /** Path under /public to the pre-processed transparent logo. */
  logoSrc: string;
  /** Horizontal wordmarks get a wider slot than stacked marks. */
  wide?: boolean;
};

interface Props {
  styles: Readonly<Record<string, string>>;
  /** Label rendered above the marquee. Short + neutral — this is a
   *  private outreach page, not an "as seen in" boast. */
  label?: string;
  councils: CouncilItem[];
}

export function CouncilMarquee({
  styles,
  label = "Active council areas",
  councils,
}: Props) {
  // The track contains the list twice. The first set is the "real" one
  // for screen readers and SEO context; the duplicate is purely visual
  // (aria-hidden) so assistive tech doesn't read the same list twice.
  const renderItem = (c: CouncilItem, i: number, dup: boolean) => (
    <span
      key={`${dup ? "b" : "a"}-${i}-${c.name}`}
      className={`${styles.marqueeItem} ${c.wide ? styles.marqueeItemWide : ""}`}
      aria-hidden={dup}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={c.logoSrc}
        alt={dup ? "" : c.name}
        className={styles.marqueeLogo}
        loading="lazy"
        decoding="async"
      />
    </span>
  );

  return (
    <section className={styles.marquee} aria-label={label}>
      <p className={styles.marqueeLabel}>{label}</p>
      <div className={styles.marqueeViewport}>
        <div className={styles.marqueeTrack}>
          {councils.map((c, i) => renderItem(c, i, false))}
          {councils.map((c, i) => renderItem(c, i, true))}
        </div>
      </div>
    </section>
  );
}
