import { getDetector } from "@/lib/roboflow";
import { DetectorError } from "@/lib/roboflow/types";
import type { DetectorErrorReason } from "@/lib/roboflow/types";

// Hvilken HTTP-status hver feiltype skal gi.
const STATUS_FOR_REASON: Record<DetectorErrorReason, number> = {
  not_configured: 500, // vår feil: manglende oppsett
  unavailable: 503,    // Roboflow nede, time-out eller kvote tom
  bad_response: 502,   // Roboflow svarte med noe uventet
};

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("image");

  if (!(file instanceof File)) {
    return Response.json({ error: "Mangler bilde" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const result = await getDetector().analyze(bytes);

    // VIKTIG!!!! Birøkteren får bare estimatet. Boksene er kun for admin.
    return Response.json({
      count: result.count,
      countLow: result.countLow,
      countHigh: result.countHigh,
    });
  } catch (error) {
    console.error("Analyse feilet:", error);

    const status = error instanceof DetectorError
      ? STATUS_FOR_REASON[error.reason]
      : 500;

    // Samme melding til brukeren uansett årsak.
    return Response.json({ error: "Analysen feilet, prøv igjen senere" }, { status });
  }

// VIKTIG FOR SENERE IKKE GLEM !!!!!!!!!! 
// TODO (før appen går live): ruten er åpen, hvem som helst kan kalle den
// og bruke opp Roboflow-kredittene. Legg til beskyttelse, f.eks. at bare
// bilder som allerede er lagret i Supabase kan analyseres, og en grense
// for antall kall per bruker.

}