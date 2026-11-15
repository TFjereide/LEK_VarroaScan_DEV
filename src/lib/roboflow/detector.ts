import type { DetectionResult } from "./types";

// Kontrakten: alle detektorer må ha analyze().
// Tar inn bildet som rå bytes Gir tilbake et resultat, eller kaster DetectorError.
export interface Detector {
  analyze(image: Uint8Array): Promise<DetectionResult>;
}