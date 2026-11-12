import { DetectorError } from "./types";
import type { WorkflowResponse } from "./roboflowResponse";

const TIMEOUT_MS = 30_000;

// Sender bildet til Roboflow og gir tilbake svaret, eller kaster DetectorError.
export async function callRoboflow(
  endpoint: string,
  apiKey: string,
  image: Uint8Array,
): Promise<WorkflowResponse> {
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // (TGF)NOTE: Tydeligvis skal dette være i body, under api_key?
        // Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        api_key: apiKey,
        inputs: {
          image: {
            type: "base64",
            value: Buffer.from(image).toString("base64"),
          },
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch(error) {
    console.error("Fikk ikke kontakt med Roboflow:", error instanceof Error ? error.message : String(error));
    throw new DetectorError("Fikk ikke kontakt med Roboflow", "unavailable");
  }

  if (!response.ok) {
    throw new DetectorError(
      `Roboflow svarte med status ${response.status}`,
      "unavailable",
    );
  }

  try {
    const json = await response.json(); 
     console.log(
    "========== RAW ROBOFLOW RESPONSE =========="
    );
    console.dir(json, { depth: null });
    console.log("===========================================");
    return (json) as WorkflowResponse;
  } catch {
    throw new DetectorError("Svaret var ikke gyldig JSON", "bad_response");
  }
}