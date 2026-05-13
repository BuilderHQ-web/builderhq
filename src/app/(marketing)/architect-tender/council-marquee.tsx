/**
 * CouncilMarquee — quiet credibility band shown below the main content.
 *
 * Renders the council list twice so the CSS `marqueeDrift` keyframe
 * can translate the track -50% and create a seamless infinite loop.
 *
 * Two modes per item:
 *   · `logoSrc` set → renders an <img>, desaturated by default, full
 *     colour on hover (see `.marqueeLogo` in the CSS module).
 *   · Otherwise → renders the wordmark in Fraunces italic so the
 *     placeholder reads as a directory line, not a missing image.
 *     Drops in as soon as Aryan supplies the logo files for each council.
 *
 * No interaction beyond the hover treatment — this is decorative
 * legitimacy signalling, not a clickable nav.
 */

type CouncilItem = {
  /** Display name (also the alt text when an image is supplied). */
  name: string;
  /** Optional image src. If unset, the name renders as a wordmark. */
  logoSrc?: string;
};

interface Props {
  styles: Readonly<Record<string, string>>;
  /** Label rendered above the marquee. Keep it short + neutral — the
   *  page is private outreach, this isn't an "as seen in" boast. */
  label?: string;
  councils: CouncilItem[];
}

export function CouncilMarquee({
  styles,
  label = "Active council areas",
  councils,
}: Props) {
  // Render the row twice. The CSS keyframe translates the inner track
  // by -50% which lines up exactly with the start of the duplicate.
  const row = (
    <>
      {councils.map((c, i) => (
        <span key={`a-${i}-${c.name}`} className={styles.marqueeItem} aria-hidden={i !== 0}>
          {c.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logoSrc} alt={c.name} className={styles.marqueeLogo} />
          ) : (
            <span className={styles.marqueeWordmark}>{c.name}</span>
          )}
        </span>
      ))}
      {councils.map((c, i) => (
        <span key={`b-${i}-${c.name}`} className={styles.marqueeItem} aria-hidden>
          {c.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logoSrc} alt="" className={styles.marqueeLogo} />
          ) : (
            <span className={styles.marqueeWordmark}>{c.name}</span>
          )}
        </span>
      ))}
    </>
  );

  return (
    <section className={styles.marquee} aria-label="Active council areas">
      <p className={styles.marqueeLabel}>{label}</p>
      <div className={styles.marqueeViewport}>
        <div className={styles.marqueeTrack}>{row}</div>
      </div>
    </section>
  );
}
