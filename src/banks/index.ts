import { createAuroraProvider } from "./aurora";
import { createBorealProvider } from "./boreal";
import { createCedroProvider } from "./cedro";
import type { BankProvider } from "./types";

export const defaultProviders: BankProvider[] = [
  createAuroraProvider(),
  createBorealProvider(),
  createCedroProvider(),
];