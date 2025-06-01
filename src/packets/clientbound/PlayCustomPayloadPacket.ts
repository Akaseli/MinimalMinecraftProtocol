import { MinecraftBot, S_PlayCustomPayloadPacket } from '../..';
import { readProtocolString } from '../../nbt/readers/string';
import { Packet } from '../packet';

export class PlayCustomPayloadPacket implements Packet {
  //https://minecraft.wiki/w/Java_Edition_protocol/Plugin_channels
  private channelId!: string;
  private data!: Buffer;

  read(buffer: Buffer, offset: number): void {
    const packetChannel = readProtocolString(buffer, offset);

    this.data = buffer.slice(packetChannel.new_offset);

    this.channelId = packetChannel.data;
  }

  handle(bot: MinecraftBot): void {
    if (this.channelId == 'minecraft:register') {
      const register = new S_PlayCustomPayloadPacket(
        'minecraft:register',
        this.data,
      );

      bot.sendPacket(register);
    } else {
      bot.emit('custom_payload', this.channelId, this.data);
    }
  }
}
