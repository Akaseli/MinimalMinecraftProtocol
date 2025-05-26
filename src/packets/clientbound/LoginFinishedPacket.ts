import { MinecraftBot } from '../..';
import { Packet } from '../packet';

export class LoginFinishedPacket implements Packet {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  read(buffer: Buffer, offset: number): void {
    //Gameprofile
  }

  handle(bot: MinecraftBot): void {
    bot.sendAcknowledged();
  }
}
