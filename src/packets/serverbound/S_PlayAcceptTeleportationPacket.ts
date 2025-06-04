import { writeVarInt } from '../../nbt';
import { ServerboundPacket } from '../packet';
import { serverboundPackets } from '../packets';

export class S_PlayAcceptTeleportationPacket implements ServerboundPacket {
  private id;

  constructor(id: number) {
    this.id = id;
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      writeVarInt(serverboundPackets['PlayAcceptTeleportationPacket']),
      writeVarInt(this.id),
    ]);
  }
}
