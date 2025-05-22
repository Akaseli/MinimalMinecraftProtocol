import { MinecraftBot } from "../..";
import { readInt } from "../../nbt/readers/int";
import { Packet } from "../packet";

export class ConfigurationPingPacket implements Packet{
  private id!: number
  
  read(buffer: Buffer, offset: number): void {
    const packetId = readInt(buffer, offset, true);
  }

  handle(bot: MinecraftBot): void {
    bot.sendPong(this.id)
  }
}