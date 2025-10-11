import { MinecraftBot, NBT, readTextComponent } from '../..';
import { Packet } from '../packet';

export class PlayDisconnectPacket implements Packet {
  private reason!: string | NBT;

  read(bot: MinecraftBot, buffer: Buffer, offset: number): void {
    //Gameprofile
    const packetReason = readTextComponent(buffer, offset);

    this.reason = packetReason.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle(bot: MinecraftBot): void {
    //console.log(this.reason);
  }
}
