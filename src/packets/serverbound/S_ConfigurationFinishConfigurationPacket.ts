import { MinecraftBot } from '../..';
import { writeVarInt } from '../../nbt';
import { ServerboundPacket } from '../packet';

export class S_ConfigurationFinishConfigurationPacket
  implements ServerboundPacket
{
  toBuffer(bot: MinecraftBot): Buffer {
    return writeVarInt(
      bot.serverboundPackets['ConfigurationFinishConfigurationPacket'],
    );
  }
}
