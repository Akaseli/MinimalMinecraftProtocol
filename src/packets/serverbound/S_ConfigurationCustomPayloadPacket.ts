import { MinecraftBot } from '../..';
import { writeProtocolString } from '../../nbt/readers/string';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';

export class S_ConfigurationCustomPayloadPacket implements ServerboundPacket {
  private channel;
  private data;

  constructor(channel: string, data: Buffer) {
    this.channel = channel;
    this.data = data;
  }

  toBuffer(bot: MinecraftBot): Buffer {
    return Buffer.concat([
      writeVarInt(bot.serverboundPackets['ConfigurationCustomPayloadPacket']),
      writeProtocolString(this.channel),
      this.data,
    ]);
  }
}
