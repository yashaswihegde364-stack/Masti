// Thin client for Voyage AI's embeddings REST API. Deliberately not using
// an SDK package here — this is a small surface (one endpoint) and a
// direct fetch call is easier to audit than trusting a third-party
// wrapper's version pinning.
const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";

export async function embedTexts(
  texts: string[],
  inputType: "document" | "query"
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set — copy .env.example to .env first.");
  }
  const model = process.env.VOYAGE_EMBED_MODEL ?? "voyage-3";

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: texts, model, input_type: inputType }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage embeddings request failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}
