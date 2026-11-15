import type { BoundingBox } from "./types";

// Ett funn slik Workflowen sender det. x og y er MIDTEN av boksen.
export type WorkflowPrediction = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

export type WorkflowResponse = {
  outputs?: { predictions?: { predictions?: WorkflowPrediction[] } }[];
};

// Henter listen med funn ut av svaret. Gir null hvis listen mangler.
// (En tom liste er gyldig og betyr "ingen midd".)
export function getPredictions(data: WorkflowResponse): WorkflowPrediction[] | null {
  const funn = data.outputs?.[0]?.predictions?.predictions;
  return Array.isArray(funn) ? funn : null;
}

// Roboflow oppgir midten av boksen. Vi bruker øvre venstre hjørne.
// Forutsetter at Workflowen gir koordinater for hele bildet, ikke for én rute.
export function toBox(p: WorkflowPrediction): BoundingBox {
  return {
    x: p.x - p.width / 2,
    y: p.y - p.height / 2,
    width: p.width,
    height: p.height,
    confidence: p.confidence,
  };
}
