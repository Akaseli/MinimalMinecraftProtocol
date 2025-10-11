import { MinecraftBot } from '../..';
import { writeLong } from '../../nbt';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';

export class S_PlayKeepAlivePacket implements ServerboundPacket {
  private id;

  constructor(id: bigint) {
    this.id = id;
  }

  toBuffer(bot: MinecraftBot): Buffer {
    return Buffer.concat([
      writeVarInt(bot.serverboundPackets['PlayKeepAlivePacket']),
      writeLong(this.id, true),
    ]);
  }
}
