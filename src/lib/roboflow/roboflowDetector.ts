import type { Detector } from "./detector";
import { DetectorError } from "./types";
import type { DetectionResult } from "./types";
import { callRoboflow } from "./roboflowClient";
import { getPredictions, toBox } from "./roboflowResponse";

// Midlertidige terskler.... Vi finner de riktige på valid-settet senere
const THRESHOLD_STRICT = 0.7; // bare sikre midd --> countLow
const THRESHOLD_MID = 0.5;    // beste estimat   --> count
const THRESHOLD_LOOSE = 0.3;  // også usikre     --> countHigh

// sender bildet til Roboflow og gjør svaret om til vårt format
export class RoboflowDetector implements Detector {
  async analyze(image: Uint8Array): Promise<DetectionResult> {
    const apiKey = process.env.ROBOFLOW_API_KEY;
    const endpoint = process.env.ROBOFLOW_ENDPOINT;
    const modelId = process.env.ROBOFLOW_MODEL_ID ?? "ukjent";

    if (!apiKey || !endpoint) {
      throw new DetectorError(
        "Mangler ROBOFLOW_API_KEY eller ROBOFLOW_ENDPOINT",
        "not_configured",
      );
    }

    const data = await callRoboflow(endpoint, apiKey, image);
    const funn = getPredictions(data);

    if (!funn) {
      throw new DetectorError("Svaret mangler predictions", "bad_response");
    }

    // Vi beholder alle funn over laveste terskel, så admin kan se kandidatene.
    const boxes = funn
      .filter((p) => p.confidence >= THRESHOLD_LOOSE)
      .map(toBox);

    const antall = (grense: number) =>
      boxes.filter((b) => b.confidence >= grense).length;

    return {
      count: antall(THRESHOLD_MID),
      countLow: antall(THRESHOLD_STRICT),
      countHigh: antall(THRESHOLD_LOOSE),
      boxes,
      modelVersion: `roboflow-${modelId}`,
    };
  }
}