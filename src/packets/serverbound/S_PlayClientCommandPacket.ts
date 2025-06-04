import { writeVarInt } from '../../nbt';
import { ServerboundPacket } from '../packet';
import { serverboundPackets } from '../packets';

export class S_PlayClientCommandPacket implements ServerboundPacket {
  private action;

  constructor(action: number) {
    this.action = action;
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      writeVarInt(serverboundPackets['PlayClientCommandPacket']),
      writeVarInt(this.action),
    ]);
  }
}
