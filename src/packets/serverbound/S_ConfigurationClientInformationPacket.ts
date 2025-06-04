import { writeBoolean } from '../../nbt';
import { writeProtocolString } from '../../nbt/readers/string';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';
import { serverboundPackets } from '../packets';

export class S_ConfigurationClientInformationPacket
  implements ServerboundPacket
{
  private language: string;

  constructor(language: string) {
    this.language = language;
  }

  //TODO take all the variables
  toBuffer(): Buffer {
    return Buffer.concat([
      writeVarInt(serverboundPackets['ConfigurationClientInformationPacket']),
      writeProtocolString(this.language),
      Buffer.from([0x07]),
      writeVarInt(0), //enabled
      writeBoolean(true),
      //Bitmask, so any byte
      Buffer.from([0x7f]),
      writeVarInt(1),
      writeBoolean(false),
      writeBoolean(true),
      writeVarInt(0), //Particles
    ]);
  }
}
