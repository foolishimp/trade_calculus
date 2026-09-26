import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU,DCOILWTICO&cosd=2023-01-01&coed=2025-12-31";
const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`History download failed: ${response.status}`);
const csv = await response.text();
const lines = csv.trim().split(/\r?\n/);
const header = lines.shift()!.split(",");
const brentIndex = header.indexOf("DCOILBRENTEU");
const wtiIndex = header.indexOf("DCOILWTICO");
if (brentIndex < 0 || wtiIndex < 0) throw new Error("Unexpected historical series columns");
const observations = lines.flatMap(line => {
  const cells = line.split(",");
  const date = cells[0]!;
  if (date < "2023-01-01" || date > "2025-12-31") return [];
  const b = cells[brentIndex], w = cells[wtiIndex];
  if (!b || !w || b === "." || w === ".") return [];
  const brent = Number(b), wti = Number(w);
  if (!Number.isFinite(brent) || !Number.isFinite(wti)) throw new Error(`Invalid observation ${date}`);
  return [{ date, brent, wti }];
});
if (observations.length < 100) throw new Error("Insufficient paired historical observations");
const directory = new URL("../data/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL("oil_spot_source.csv", directory), csv);
await writeFile(new URL("oil_history.json", directory), JSON.stringify({
  metadata: {
    id: "eia-fred-oil-spot-2023-2025", provenance: "historical-observations",
    source: "U.S. Energy Information Administration, retrieved from FRED, Federal Reserve Bank of St. Louis",
    sourceUrls: ["https://fred.stlouisfed.org/series/DCOILBRENTEU", "https://fred.stlouisfed.org/series/DCOILWTICO"],
    downloadUrl: url, retrievedAt: new Date().toISOString(), rawSha256: createHash("sha256").update(csv).digest("hex"),
    unit: "USD/bbl", missingData: "Keep only dates with both observations; no forward fill",
    vintage: "Downloaded historical series; original publication vintages are not supplied",
    executionModel: "Spot-reference P&L proxy; previous available observation generates a signal, next available observation supplies simulated execution price",
  }, observations,
}, null, 2) + "\n");
console.log(`Imported ${observations.length} paired daily observations: ${observations[0]!.date} to ${observations.at(-1)!.date}`);
