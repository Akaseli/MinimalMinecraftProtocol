import { MinecraftBot } from "..";

export interface Packet {
  read(buffer: Buffer, offset: number): void;
  handle(bot: MinecraftBot): void;
}