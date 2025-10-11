import { MinecraftBot } from '../..';
import { writeProtocolString } from '../../nbt/readers/string';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';
export class S_PlayChatCommandPacket implements ServerboundPacket {
  private command;

  constructor(command: string) {
    this.command = command;
  }

  toBuffer(bot: MinecraftBot): Buffer {
    return Buffer.concat([
      writeVarInt(bot.serverboundPackets['PlayChatCommandPacket']),
      writeProtocolString(this.command),
    ]);
  }
}
