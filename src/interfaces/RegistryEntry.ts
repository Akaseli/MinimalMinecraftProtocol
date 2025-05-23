import { NBT } from "../nbt";

export interface RegistryEntry {
  identifier: string;
  nbt?: NBT;
}