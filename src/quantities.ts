import { finite } from "./validation.ts";

export type Unit = "bbl" | "US-gallon" | "tonne" | "contract" | "share";
export type Quantity<U extends Unit = Unit> = Readonly<{ value: number; unit: U }>;
export type UsdPrice<U extends Unit> = Readonly<{ value: number; currency: "USD"; per: U }>;
export type UsdMoney = Readonly<{ value: number; currency: "USD" }>;

/** REQ-02: signed quantities; subject compatibility is a separate domain binding. */
export function quantity<U extends Unit>(value: number, unit: U): Quantity<U> {
  return { value: finite(value, "quantity"), unit };
}

export function addQuantities<U extends Unit>(left: Quantity<U>, right: Quantity<NoInfer<U>>): Quantity<U> {
  if (left.unit !== right.unit) throw new Error("Incompatible units; convert explicitly");
  finite(left.value, "left quantity");
  finite(right.value, "right quantity");
  return quantity(left.value + right.value, left.unit);
}

export function scaleQuantity<U extends Unit>(input: Quantity<U>, factor: number): Quantity<U> {
  finite(input.value, "quantity");
  return quantity(input.value * finite(factor, "scale factor"), input.unit);
}

export function barrelsToGallons(input: Quantity<"bbl">): Quantity<"US-gallon"> {
  if (input.unit !== "bbl") throw new Error("Expected barrels");
  return quantity(finite(input.value, "barrels") * 42, "US-gallon");
}

export function multiplyUsd<U extends Unit>(input: Quantity<U>, price: UsdPrice<NoInfer<U>>): UsdMoney {
  if (input.unit !== price.per || price.currency !== "USD") throw new Error("Incompatible price basis");
  return {
    value: finite(finite(input.value, "quantity") * finite(price.value, "price"), "money"),
    currency: "USD",
  };
}
