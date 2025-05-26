import { MinecraftBot } from "../..";
import { Packet } from "../packet";

export class LoginFinishedPacket implements Packet{
  read(buffer: Buffer, offset: number): void {
    //Gameprofile
  }

  handle(bot: MinecraftBot): void {
    bot.sendAcknowledged();
  }
}