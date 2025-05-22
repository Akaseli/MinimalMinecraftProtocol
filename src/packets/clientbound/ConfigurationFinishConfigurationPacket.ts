import { MinecraftBot } from "../..";
import { Packet } from "../packet";

export class ConfigurationFinishConfigurationPacket implements Packet {
  read(buffer: Buffer, offset: number): void {
    
  }
  
  handle(bot: MinecraftBot): void {
    bot.sendConfigurationEnd();
  }

}