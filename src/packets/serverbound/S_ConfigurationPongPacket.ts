import { MinecraftBot } from '../..';
import { writeInt } from '../../nbt';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';

export class S_ConfigurationPongPacket implements ServerboundPacket {
  private id;

  constructor(id: number) {
    this.id = id;
  }

  toBuffer(bot: MinecraftBot): Buffer {
    return Buffer.concat([
      writeVarInt(bot.serverboundPackets['ConfigurationPongPacket']),
      writeInt(this.id, true),
    ]);
  }
}
