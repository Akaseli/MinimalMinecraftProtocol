import { MinecraftBot } from "../..";
import { Packet } from "../packet";

export class ConfigurationSelectKnownPacksPacket implements Packet{
  read(buffer: Buffer, offset: number): void {
    //Server does send some packs.
  }
  handle(bot: MinecraftBot): void {
    bot.sendKnownPacks();
  }
  
}