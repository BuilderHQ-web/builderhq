import { briefIssues, briefPerspectives, issueNo } from "../brief-data";

/**
 * The Build Brief · RSS 2.0 feed at /build-brief/feed.xml.
 * Static output; regenerated at build when a new issue lands.
 */

const SITE = "https://builderhq.com.au";

export const dynamic = "force-static";

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function GET() {
  const issues = briefIssues();
  const [latest] = issues;

  // Editions and Perspectives share the feed, newest first.
  const feedItems: Array<{ date: string; xml: string }> = [];

  for (const i of issues) {
    const url = `${SITE}/build-brief/${i.slug}`;
    feedItems.push({
      date: i.date,
      xml: `    <item>
      <title>${esc(`The Build Brief ${issueNo(i)} · ${i.title}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${i.date}T07:00:00+10:00`).toUTCString()}</pubDate>
      <description>${esc(i.seoDescription)}</description>
    </item>`,
    });
  }

  for (const p of briefPerspectives()) {
    const url = `${SITE}/build-brief/perspectives/${p.slug}`;
    feedItems.push({
      date: p.dateISO,
      xml: `    <item>
      <title>${esc(`${p.title} ${p.titleAccent}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${p.dateISO}T07:00:00+10:00`).toUTCString()}</pubDate>
      <category>Perspectives</category>
      <description>${esc(p.standfirst)}</description>
    </item>`,
    });
  }

  const items = feedItems
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((i) => i.xml)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Build Brief · by BuilderHQ</title>
    <link>${SITE}/build-brief</link>
    <atom:link href="${SITE}/build-brief/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Five minutes on the economics of getting homes built in Australia. Plain, sourced, every Friday.</description>
    <language>en-au</language>
    <copyright>BuilderHQ, Melbourne</copyright>
    ${latest ? `<lastBuildDate>${new Date(`${latest.date}T07:00:00+10:00`).toUTCString()}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
