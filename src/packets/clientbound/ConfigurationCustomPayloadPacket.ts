import { MinecraftBot } from '../..';
import { readProtocolString } from '../../nbt/readers/string';
import { Packet } from '../packet';

export class ConfigurationCustomPayloadPacket implements Packet {
  //https://minecraft.wiki/w/Java_Edition_protocol/Plugin_channels
  private channelId!: string;
  private data!: string;

  read(buffer: Buffer, offset: number): void {
    const packetChannel = readProtocolString(buffer, offset);

    //minecraft:brand
    //minecraft:register
    this.channelId = packetChannel.data;

    if (packetChannel.data == 'minecraft:brand') {
      const extra = readProtocolString(buffer, packetChannel.new_offset);

      this.data = extra.data;
    }
  }

  handle(bot: MinecraftBot): void {
    if (this.channelId == 'minecraft:brand') {
      bot.serverVariant = this.data;
    }
  }
}
