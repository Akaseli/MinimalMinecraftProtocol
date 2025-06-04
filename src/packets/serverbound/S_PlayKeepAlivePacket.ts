import { writeLong } from '../../nbt';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';
import { serverboundPackets } from '../packets';

export class S_PlayKeepAlivePacket implements ServerboundPacket {
  private id;

  constructor(id: bigint) {
    this.id = id;
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      writeVarInt(serverboundPackets['PlayKeepAlivePacket']),
      writeLong(this.id, true),
    ]);
  }
}
