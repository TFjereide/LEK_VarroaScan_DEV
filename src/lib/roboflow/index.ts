import type { Detector } from "./detector";
import { DetectorError } from "./types";
import { RoboflowDetector } from "./roboflowDetector";

// Eneste stedet som vet hvilken detektor appen bruker.
// Styres av DETECTOR i .env.local. Mangler den, brukes "roboflow".
export function getDetector(): Detector {
  const kind = process.env.DETECTOR ?? "roboflow";

  if (kind === "roboflow") {
    return new RoboflowDetector();
  }

  // Hvis vi har ny Detecor så er det bare å lage en ny IF-test her....
  throw new DetectorError(`Ukjent DETECTOR: ${kind}`, "not_configured");
}