import { writeInt } from '../../nbt';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';
import { serverboundPackets } from '../packets';

export class S_ConfigurationPongPacket implements ServerboundPacket {
  private id;

  constructor(id: number) {
    this.id = id;
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      writeVarInt(serverboundPackets['ConfigurationPongPacket']),
      writeInt(this.id, true),
    ]);
  }
}
