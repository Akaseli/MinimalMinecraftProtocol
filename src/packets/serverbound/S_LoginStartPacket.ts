import { writeProtocolString } from '../../nbt/readers/string';
import { writeUUID } from '../../nbt/readers/uuid';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';
import { serverboundPackets } from '../packets';

//"ServerboundHelloPacket"
export class S_LoginStartPacket implements ServerboundPacket {
  private name: string;
  private uuid: string;

  constructor(name: string, uuid: string) {
    this.name = name;
    this.uuid = uuid;
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      writeVarInt(serverboundPackets['LoginStartPacket']),
      writeProtocolString(this.name),
      writeUUID(this.uuid),
    ]);
  }
}
