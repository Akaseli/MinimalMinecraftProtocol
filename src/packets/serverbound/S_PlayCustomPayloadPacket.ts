import { MinecraftBot } from '../..';
import { writeProtocolString } from '../../nbt/readers/string';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';

export class S_PlayCustomPayloadPacket implements ServerboundPacket {
  private channel;
  private data;

  constructor(channel: string, data: Buffer) {
    this.channel = channel;
    this.data = data;
  }

  toBuffer(bot: MinecraftBot): Buffer {
    return Buffer.concat([
      writeVarInt(bot.serverboundPackets['PlayCustomPayloadPacket']),
      writeProtocolString(this.channel),
      this.data,
    ]);
  }
}
