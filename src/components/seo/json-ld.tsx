/**
 * JsonLd — renders a schema.org structured-data block into the page
 * head/body as `application/ld+json`.
 *
 * Server-safe (no "use client"): when rendered inside a client
 * component, Next still emits it in the server HTML, so crawlers and
 * generative engines see it without executing JS.
 *
 * The `<` escape prevents a `</script>` in any string value from
 * breaking out of the block. Our data is first-party, but the escape
 * is cheap insurance and standard practice.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
