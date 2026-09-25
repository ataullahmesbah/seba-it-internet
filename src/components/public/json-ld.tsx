/** JSON-LD structured data. `<` is escaped so content can never break out of the script element. */
export function JsonLd({ data, nonce }: { data: Record<string, unknown>; nonce?: string }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: json }} />;
}
