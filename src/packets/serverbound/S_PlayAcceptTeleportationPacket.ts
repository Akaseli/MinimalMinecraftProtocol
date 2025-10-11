import { MinecraftBot } from '../..';
import { writeVarInt } from '../../nbt';
import { ServerboundPacket } from '../packet';

export class S_PlayAcceptTeleportationPacket implements ServerboundPacket {
  private id;

  constructor(id: number) {
    this.id = id;
  }

  toBuffer(bot: MinecraftBot): Buffer {
    return Buffer.concat([
      writeVarInt(bot.serverboundPackets['PlayAcceptTeleportationPacket']),
      writeVarInt(this.id),
    ]);
  }
}
