import { MinecraftBot } from '../..';
import { readUUID } from '../../nbt/readers/uuid';
import { readVarInt } from '../../nbt/readers/varInt';
import { Packet } from '../packet';

export class PlayPlayerInfoRemovePacket implements Packet {
  private uuidToRemove: string[] = [];

  read(bot: MinecraftBot, buffer: Buffer, offset: number): void {
    const packetRemoveLength = readVarInt(buffer, offset);

    let removeLoopOffset = packetRemoveLength.new_offset;
    for (let i = 0; i < packetRemoveLength.data; i++) {
      const packetUuid = readUUID(buffer, removeLoopOffset);

      const uuidKey = packetUuid.data.toString('hex');

      this.uuidToRemove.push(uuidKey);

      removeLoopOffset = packetUuid.new_offset;
    }
  }

  handle(bot: MinecraftBot): void {
    for (const uuid of this.uuidToRemove) {
      if (bot.players[uuid]) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete bot.players[uuid];
      }
    }
  }
}
