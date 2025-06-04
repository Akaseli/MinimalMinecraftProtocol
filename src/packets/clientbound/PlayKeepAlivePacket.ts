import { MinecraftBot } from '../..';
import { readLong } from '../../nbt/readers/long';
import { Packet } from '../packet';
import { S_PlayKeepAlivePacket } from '../serverbound/S_PlayKeepAlivePacket';

export class PlayKeepAlivePacket implements Packet {
  private challenge!: bigint;

  read(buffer: Buffer, offset: number): void {
    const packetChallenge = readLong(buffer, offset, true);

    this.challenge = packetChallenge.data;
  }

  handle(bot: MinecraftBot): void {
    const packet = new S_PlayKeepAlivePacket(this.challenge);

    bot.sendPacket(packet);
  }
}
