import { readFile } from "node:fs/promises";
import type { OilObservation } from "../src/rates.ts";
import { validateObservations } from "../src/rates.ts";

export interface OilDataset {
  readonly metadata: {
    readonly id: string; readonly provenance: string; readonly source: string;
    readonly sourceUrls: readonly string[]; readonly retrievedAt: string; readonly rawSha256: string;
    readonly unit: string; readonly missingData: string; readonly vintage: string; readonly executionModel: string;
  };
  readonly observations: readonly OilObservation[];
}
export async function loadDataset(): Promise<OilDataset> {
  const dataset = JSON.parse(await readFile(new URL("../data/oil_history.json", import.meta.url), "utf8")) as OilDataset;
  validateObservations(dataset.observations);
  return dataset;
}
