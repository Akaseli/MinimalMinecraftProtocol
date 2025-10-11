import { MinecraftBot } from '../..';
import { readVarInt } from '../../nbt/readers/varInt';
import { Packet } from '../packet';

export class LoginCompressionPacket implements Packet {
  private threshold!: number;

  read(bot: MinecraftBot, buffer: Buffer, offset: number): void {
    const packetThreshold = readVarInt(buffer, offset);

    this.threshold = packetThreshold.data;
  }
  handle(bot: MinecraftBot): void {
    bot.compressionTreshold = this.threshold;
  }
}
