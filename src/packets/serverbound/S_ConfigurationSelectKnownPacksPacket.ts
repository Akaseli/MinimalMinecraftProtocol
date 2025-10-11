import { MinecraftBot } from '../..';
import { writeProtocolString } from '../../nbt';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';

export interface KnownPacks {
  namespace: string;
  id: string;
  version: string;
}

export class S_ConfigurationSelectKnownPacksPacket
  implements ServerboundPacket
{
  private packs: KnownPacks[];

  constructor(packs: KnownPacks[]) {
    this.packs = packs;
  }

  toBuffer(bot: MinecraftBot): Buffer {
    const packData: Buffer[] = [];

    for (const pack of this.packs) {
      packData.push(
        Buffer.concat([
          writeProtocolString(pack.namespace),
          writeProtocolString(pack.id),
          writeProtocolString(pack.version),
        ]),
      );
    }

    return Buffer.concat([
      writeVarInt(
        bot.serverboundPackets['ConfigurationSelectKnownPacksPacket'],
      ),
      writeVarInt(this.packs.length),
      ...packData,
    ]);
  }
}
