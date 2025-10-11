import { MinecraftBot } from '../..';
import { writeVarInt } from '../../nbt';
import { ServerboundPacket } from '../packet';

export class S_PlayClientCommandPacket implements ServerboundPacket {
  private action;

  constructor(action: number) {
    this.action = action;
  }

  toBuffer(bot: MinecraftBot): Buffer {
    return Buffer.concat([
      writeVarInt(bot.serverboundPackets['PlayClientCommandPacket']),
      writeVarInt(this.action),
    ]);
  }
}
