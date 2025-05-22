import { MinecraftBot } from "../..";
import { Packet } from "../packet";

export class PlayDisguisedChatPacket implements Packet{
  read(buffer: Buffer, offset: number): void {
    
  }
  
  handle(bot: MinecraftBot): void {
    console.log("Disguised are not handled at this moment.")
  }

}