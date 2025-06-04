import { writeProtocolString } from '../../nbt/readers/string';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';
import { serverboundPackets } from '../packets';

export class S_PlayChatCommandPacket implements ServerboundPacket {
  private command;

  constructor(command: string) {
    this.command = command;
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      writeVarInt(serverboundPackets['PlayChatCommandPacket']),
      writeProtocolString(this.command),
    ]);
  }
}
