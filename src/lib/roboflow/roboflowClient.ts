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
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: {
          image: {
            type: "base64",
            value: Buffer.from(image).toString("base64"),
          },
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new DetectorError("Fikk ikke kontakt med Roboflow", "unavailable");
  }

  if (!response.ok) {
    throw new DetectorError(
      `Roboflow svarte med status ${response.status}`,
      "unavailable",
    );
  }

  try {
    return (await response.json()) as WorkflowResponse;
  } catch {
    throw new DetectorError("Svaret var ikke gyldig JSON", "bad_response");
  }
}