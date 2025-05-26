import { MinecraftBot } from "../..";
import { readLong } from "../../nbt/readers/long";
import { Packet } from "../packet";

export class ConfigurationKeepAlivePacket implements Packet{
  private challenge!: bigint;

  read(buffer: Buffer, offset: number): void {
    const packetChallenge = readLong(buffer, offset, true);

    this.challenge = packetChallenge.data
  }

  handle(bot: MinecraftBot): void {
    bot.sendConfigurationKeepAlive(this.challenge);
  }
}