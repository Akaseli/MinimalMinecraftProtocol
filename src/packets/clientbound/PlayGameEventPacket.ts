import { MinecraftBot, readByte } from '../..';
import { Packet } from '../packet';

export class PlayGameEventPacket implements Packet {
  private event!: number;

  read(bot: MinecraftBot, buffer: Buffer, offset: number): void {
    const packetEvent = readByte(buffer, offset);

    this.event = packetEvent.data;

    //There is more.
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle(bot: MinecraftBot): void {
    //console.log('New event');
    //console.log(this.event);
  }
}
