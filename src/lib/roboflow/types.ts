// Én boks rundt ett funn (ett mistenkt midd).
// Koordinater er i piksler på ORIGINALbildet.
export type BoundingBox = {
  x: number;          // venstre kant
  y: number;          // øvre kant
  width: number;
  height: number;
  confidence: number; // hvor sikker modellen er, 0 til 1
};

// Svaret fra en vellykket analyse.
export type DetectionResult = {
  count: number;      // beste estimat
  countLow: number;   // laveste rimelige antall
  countHigh: number;  // høyeste rimelige antall
  boxes: BoundingBox[]; // alle funn, slik at admin kan kontrollere og markere på nytt
  modelVersion: string; // hvilken modell som ga svaret, f.eks. "roboflow-v6"
};

// Hvorfor en analyse kan feile.
export type DetectorErrorReason =
  | "not_configured" // mangler nøkkel eller adresse
  | "unavailable"    // Roboflow nede, time-out, kvote tom
  | "bad_response";  // svaret hadde ikke formen vi forventet

// Vår egen feiltype. Kastes når analysen feiler, i stedet for å returnere count: 0.
export class DetectorError extends Error {
  constructor(
    message: string,
    public reason: DetectorErrorReason,
  ) {
    super(message);
    this.name = "DetectorError";
  }
}

// Kontrakten: alle detektorer må ha analyze().
// Tar inn bildet som rå bytes. Gir tilbake et resultat, eller kaster DetectorError.
export interface Detector {
  analyze(image: Uint8Array): Promise<DetectionResult>;
}