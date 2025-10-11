import { MinecraftBot, NBT, readTextComponent } from '../..';
import { readBoolean } from '../../nbt/readers/boolean';
import { readLong } from '../../nbt/readers/long';
import { readProtocolString } from '../../nbt/readers/string';
import { readUUID } from '../../nbt/readers/uuid';
import { readVarInt } from '../../nbt/readers/varInt';
import { Packet } from '../packet';

export interface PlayPlayerChat {
  type: number;
  sender: string | NBT;
  message: string;
  senderUuid: Buffer;
}

export class PlayPlayerChatPacket implements Packet, PlayPlayerChat {
  public type!: number;
  public sender!: string | NBT;
  public message!: string;
  public senderUuid!: Buffer;

  read(bot: MinecraftBot, buffer: Buffer, offset: number): void {
    const globalIndex = readVarInt(buffer, offset);

    const sender = readUUID(buffer, globalIndex.new_offset);
    const index = readVarInt(buffer, sender.new_offset);

    const hasSignature = readBoolean(buffer, index.new_offset);
    let signatureOffset = hasSignature.new_offset;
    if (hasSignature.data) {
      signatureOffset += 256;
    }

    //Body
    const message = readProtocolString(buffer, signatureOffset);
    const timestamp = readLong(buffer, message.new_offset, true);
    const salt = readLong(buffer, timestamp.new_offset, true);

    //The signature
    const arrayLength = readVarInt(buffer, salt.new_offset);

    let loopOffset = arrayLength.new_offset;
    for (let i = 0; i < arrayLength.data; i++) {
      const messageId = readVarInt(buffer, loopOffset);

      if (messageId.data == 0) {
        loopOffset = messageId.new_offset + 256;
      } else {
        loopOffset = messageId.new_offset;
      }
    }

    const hasSomeContent = readBoolean(buffer, loopOffset);

    let someContentIndex = hasSomeContent.new_offset;

    if (hasSomeContent.data) {
      const theContent = readTextComponent(buffer, someContentIndex);

      someContentIndex = theContent.offset;
    }

    const filter = readVarInt(buffer, someContentIndex);

    //Partially filtered - probably should filter message to match 1:1 with ingame
    let filterOffset = filter.new_offset;
    if (filter.data == 2) {
      const bitsetLength = readVarInt(buffer, filterOffset);

      filterOffset = bitsetLength.new_offset + bitsetLength.data * 8;
    }

    const chatType = readVarInt(buffer, filter.new_offset);
    const senderName = readTextComponent(buffer, chatType.new_offset);

    const hasTargetName = readBoolean(buffer, senderName.offset);

    if (hasTargetName.data) {
      //const targetContent = readTextComponent(buffer, hasTargetName.new_offset)
    }

    this.type = chatType.data;
    this.sender = senderName.data;
    this.message = message.data;
    this.senderUuid = sender.data;
  }
  handle(bot: MinecraftBot): void {
    const channel =
      bot.registry['minecraft:chat_type'][this.type - 1].identifier;

    if (channel == 'minecraft:chat') {
      bot.emit('player_chat', this.sender, this.message, this);
    } else if (channel == 'minecraft:msg_command_incoming') {
      bot.emit('whisper', this.sender, this.message, this.senderUuid, this);
    }
  }
}
