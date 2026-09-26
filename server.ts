import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { loadDataset } from "./adapters/local_data.ts";
import type { OilDataset } from "./adapters/local_data.ts";
import { mockCurves, observationAsOf, day } from "./src/rates.ts";
import { replay } from "./src/replay.ts";
import type { ReplayConfig, ReplayStrategy } from "./src/replay.ts";
import { defaultReplayPolicy } from "./src/overlays/replay_policy.ts";
import type { ReplayRiskPolicy } from "./src/overlays/replay_policy.ts";
import { defaultHedgingConfig } from "./src/oil_hedging.ts";
import type { HedgingConfig } from "./src/oil_hedging.ts";
import { oilAnalysis } from "./examples/oil_analysis.ts";
import { publishedDocument } from "./ui/document.ts";

export const strategyCatalog = [
  { id: "momentum", label: "Brent momentum", thesis: "A trailing price trend persists after costs.", invalidation: "Trend reverses or the edge disappears after costs." },
  { id: "basis-reversion", label: "Brent–WTI reversion", thesis: "A one-standard-deviation spread displacement reverts.", invalidation: "The grade/location relationship changes structurally." },
  { id: "buy-hold", label: "Brent buy & hold", thesis: "Benchmark exposure over the selected research window.", invalidation: "Reference comparator; no timing edge is claimed." },
  { id: "no-trade", label: "No trade", thesis: "Preserve cash without commodity exposure.", invalidation: "A supplied strategy has a supported advantage." },
];

export function createAppServer(dataset: OilDataset) {
  return createServer(async (request, response) => {
    const sendJson = (status: number, value: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify(value));
    };
    try {
      if (request.method !== "GET") { sendJson(405, { error: "This PoC exposes read-only GET endpoints" }); return; }
      const url = new URL(request.url ?? "/", "http://localhost");
      const p = url.searchParams;
      if (url.pathname === "/api/health") { sendJson(200, { status: "ok", mode: "local-poc" }); return; }
      if (url.pathname === "/api/metadata") {
        sendJson(200, { metadata: dataset.metadata, start: dataset.observations[0]!.date, end: dataset.observations.at(-1)!.date,
          observations: dataset.observations.length, strategies: strategyCatalog }); return;
      }
      if (url.pathname === "/api/history" || url.pathname === "/api/replay") {
        const start = p.get("start") ?? dataset.observations[0]!.date;
        const end = p.get("end") ?? dataset.observations.at(-1)!.date;
        if (day(start) > day(end)) throw new Error("Start date must precede end date");
        const observations = dataset.observations.filter(row => row.date >= start && row.date <= end);
        if (url.pathname === "/api/history") { sendJson(200, { metadata: dataset.metadata, observations }); return; }
        const config: ReplayConfig = {
          strategy: (p.get("strategy") ?? "momentum") as ReplayStrategy, lookback: Number(p.get("lookback") ?? 20),
          riskLookback: Number(p.get("riskWindow") ?? 60),
          quantityBarrels: Number(p.get("quantity") ?? 1000), costPerBarrelUsd: Number(p.get("cost") ?? 0.05),
          fundingAnnualRate: Number(p.get("funding") ?? 0.04), initialCapitalUsd: 1000000,
          liquidationDate: end,
          hedging: {
            mode: (p.get("hedgeMode") ?? "off") as HedgingConfig["mode"],
            riskAversion: Number(p.get("riskAversion") ?? defaultHedgingConfig.riskAversion),
            maxDepth: Number(p.get("hedgeDepth") ?? defaultHedgingConfig.maxDepth),
            minimumExpectedNetPnlUsd: Number(p.get("returnFloor") ?? 0),
            minimumPrimaryScale: Number(p.get("primaryFloor") ?? 0),
          },
          riskPolicy: {
            mode: (p.get("riskMode") ?? "control") as ReplayRiskPolicy["mode"],
            maxExpectedShortfallUsd: Number(p.get("tailBudget") ?? defaultReplayPolicy.maxExpectedShortfallUsd),
            maxStressLossUsd: Number(p.get("stressBudget") ?? defaultReplayPolicy.maxStressLossUsd),
            maxGrossNotionalUsd: Number(p.get("notionalLimit") ?? defaultReplayPolicy.maxGrossNotionalUsd),
          },
        };
        const result = replay(observations, config);
        const uncontrolled = config.riskPolicy!.mode === "observe" ? result : replay(observations, { ...config, riskPolicy: { ...config.riskPolicy!, mode: "observe" } });
        const unhedged = config.hedging!.mode === "off" ? result : replay(observations, { ...config, hedging: { ...config.hedging!, mode: "off" } });
        const comparisonView = (trial: typeof result) => ({ config: trial.config, summary: trial.summary,
          rows: trial.rows.map(row => ({ date: row.date, cumulativePnlUsd: row.cumulativePnlUsd, brentPosition: row.brentPosition, wtiPosition: row.wtiPosition })) });
        const comparisons = strategyCatalog.map(strategy => {
          const trial = strategy.id === config.strategy ? result : replay(observations, { ...config, strategy: strategy.id as ReplayStrategy });
          let tradeDays = 0, interventions = 0;
          const trajectory = trial.rows.map(row => {
            if (row.tradedBarrels) tradeDays++;
            if (["resize", "reject", "await-evidence"].includes(row.riskDecision.outcome) ||
              row.riskDecision.outcome === "exit" && (row.signal.brentBarrels || row.signal.wtiBarrels)) interventions++;
            return { date: row.date, cumulativePnlUsd: row.cumulativePnlUsd, tradeDays, interventions };
          });
          return { ...strategy, trajectory };
        });
        sendJson(200, { ...result, metadata: dataset.metadata, uncontrolled: comparisonView(uncontrolled), unhedged: comparisonView(unhedged), comparisons }); return;
      }
      if (url.pathname === "/api/rates") {
        const asOf = p.get("date") ?? dataset.observations.at(-1)!.date;
        const observation = observationAsOf(dataset.observations, asOf);
        sendJson(200, { requestedAsOf: asOf, observation, observationProvenance: dataset.metadata.id,
          curves: mockCurves(observation.date, observation.brent) }); return;
      }
      if (url.pathname === "/api/analysis") { sendJson(200, oilAnalysis(p.get("reconciled") !== "false")); return; }
      if (url.pathname.startsWith("/definition/")) {
        const raw = p.get("raw") === "1";
        const document = await publishedDocument(url.pathname, raw);
        if (document === undefined) { sendJson(404, { error: "Document not found" }); return; }
        response.writeHead(200, { "Content-Type": `${raw ? "text/plain" : "text/html"}; charset=utf-8`, "Cache-Control": "no-store" });
        response.end(document); return;
      }
      const assets: Record<string, readonly [string, string]> = {
        "/": ["index.html", "text/html"], "/app.js": ["app.js", "text/javascript"], "/style.css": ["style.css", "text/css"],
        "/replay-explainer.js": ["replay-explainer.js", "text/javascript"],
        "/demo.js": ["demo.js", "text/javascript"],
        "/document.css": ["document.css", "text/css"],
        "/src/linear_sensitivities.js": ["../src/linear_sensitivities.js", "text/javascript"],
      };
      const asset = assets[url.pathname];
      if (!asset) { sendJson(404, { error: "Not found" }); return; }
      response.writeHead(200, { "Content-Type": `${asset[1]}; charset=utf-8`, "Cache-Control": "no-store" });
      response.end(await readFile(new URL(`ui/${asset[0]}`, import.meta.url)));
    } catch (error) {
      sendJson(400, { error: error instanceof Error ? error.message : "Invalid request" });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createAppServer(await loadDataset());
  const port = Number(process.env.TRADE_CALCULUS_PORT ?? 4317);
  server.listen(port, "127.0.0.1", () => console.log(`Trade Calculus PoC: http://127.0.0.1:${port}`));
}
