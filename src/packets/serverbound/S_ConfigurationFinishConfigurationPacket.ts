import { writeVarInt } from '../../nbt';
import { ServerboundPacket } from '../packet';
import { serverboundPackets } from '../packets';

export class S_ConfigurationFinishConfigurationPacket
  implements ServerboundPacket
{
  toBuffer(): Buffer {
    return writeVarInt(
      serverboundPackets['ConfigurationFinishConfigurationPacket'],
    );
  }
}
