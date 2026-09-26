import { unique } from "./validation.ts";

export type UnderlyingFamily = "agriculture" | "energy" | "bulk-resource" |
  "industrial-metal" | "precious-metal" | "fx" | "equity";
export type InstrumentFamily = "physical-holding" | "currency-balance" | "equity-ownership" |
  "forward" | "future" | "swap" | "option" | "capacity-right";
export type Capability = "storage" | "transport" | "transformation" | "financing" |
  "currency-exchange" | "ownership" | "benchmark-hedging" | "contingent-payoff";

export interface FamilyModel {
  readonly state: readonly string[];
  readonly controls: readonly string[];
  readonly uncertainDrivers: readonly string[];
  readonly parameters: readonly string[];
  readonly potentialCapabilities: readonly Capability[];
  readonly constraints: readonly string[];
}

/** REQ-01: these describe economics, not executable pricers or owned resources. */
export const underlyingFamilies: Readonly<Record<UnderlyingFamily, FamilyModel>> = {
  agriculture: {
    state: ["crop year", "acreage", "stocks", "grade", "location"],
    controls: ["contract quantity", "storage allocation", "shipment"],
    uncertainDrivers: ["weather", "yield", "demand", "price"],
    parameters: ["storage loss", "quality evolution", "handling cost"],
    potentialCapabilities: ["storage", "transport", "transformation", "financing", "benchmark-hedging"],
    constraints: ["biological timing", "capacity", "quality", "delivery window"],
  },
  energy: {
    state: ["inventory", "grade", "location", "capacity", "delivery obligations"],
    controls: ["contract quantity", "shipment", "process allocation"],
    uncertainDrivers: ["production", "demand", "outage", "price", "basis"],
    parameters: ["yield", "loss", "freight", "funding cost"],
    potentialCapabilities: ["storage", "transport", "transformation", "financing", "benchmark-hedging"],
    constraints: ["throughput", "grade compatibility", "storage", "cash timing"],
  },
  "bulk-resource": {
    state: ["ore grade", "reserves", "inventory", "plant capacity"],
    controls: ["contract quantity", "extraction allocation", "shipment"],
    uncertainDrivers: ["recovery", "demand", "freight", "price"],
    parameters: ["processing yield", "impurity penalties", "extraction cost"],
    potentialCapabilities: ["storage", "transport", "transformation", "financing"],
    constraints: ["mine capacity", "plant capacity", "quality", "operating conditions"],
  },
  "industrial-metal": {
    state: ["grade", "form", "warehouse entitlement", "location", "stock"],
    controls: ["contract quantity", "warehouse allocation", "shipment"],
    uncertainDrivers: ["demand", "premium", "price"],
    parameters: ["conversion cost", "storage cost", "funding cost"],
    potentialCapabilities: ["storage", "transport", "transformation", "financing", "benchmark-hedging"],
    constraints: ["deliverable specification", "warehouse access", "capacity"],
  },
  "precious-metal": {
    state: ["fineness", "quantity", "location", "allocation status", "custody"],
    controls: ["contract quantity", "transfer instruction", "allocation request"],
    uncertainDrivers: ["price", "funding", "counterparty performance"],
    parameters: ["custody cost", "financing spread"],
    potentialCapabilities: ["storage", "transport", "financing", "ownership", "benchmark-hedging"],
    constraints: ["bar specification", "entitlement", "custody access"],
  },
  fx: {
    state: ["currency balances", "pair", "settlement dates"],
    controls: ["exchange quantity", "funding tenor", "hedge amount"],
    uncertainDrivers: ["spot", "funding curves", "cross-currency basis"],
    parameters: ["quotation convention", "settlement convention", "funding spread"],
    potentialCapabilities: ["currency-exchange", "financing", "benchmark-hedging"],
    constraints: ["two currency legs", "settlement timing", "available funding"],
  },
  equity: {
    state: ["ownership class", "share count", "distributions", "capital structure"],
    controls: ["order quantity", "hedge amount"],
    uncertainDrivers: ["business cash flows", "earnings", "price", "corporate actions"],
    parameters: ["valuation assumptions", "funding cost", "borrow cost"],
    potentialCapabilities: ["ownership", "financing", "benchmark-hedging"],
    constraints: ["ownership rights", "dilution", "corporate actions", "borrow availability"],
  },
};

export interface ModelBinding {
  readonly underlyingId: string;
  readonly underlyingFamily: UnderlyingFamily;
  readonly instrumentId: string;
  readonly instrumentFamily: InstrumentFamily;
  readonly availableCapabilities: readonly Capability[];
  readonly resourceEvidenceIds: readonly string[];
}

export interface Strategy {
  readonly id: string;
  readonly objective: string;
  readonly thesis: string;
  readonly mechanism: string;
  readonly evidenceIds: readonly string[];
  readonly horizon: string;
  readonly requiredCapabilities: readonly Capability[];
  readonly entryConditions: readonly string[];
  readonly exitConditions: readonly string[];
  readonly invalidationConditions: readonly string[];
}

export function missingCapabilities(strategy: Strategy, binding: ModelBinding): Capability[] {
  unique(binding.availableCapabilities, "available capabilities");
  return strategy.requiredCapabilities.filter(capability => !binding.availableCapabilities.includes(capability));
}
