import { MinecraftBot, writeByte } from '../..';
import { readProtocolString } from '../../nbt/readers/string';
import { Packet } from '../packet';
import { S_ConfigurationCustomPayloadPacket } from '../serverbound/S_ConfigurationCustomPayloadPacket';

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
    } else if (packetChannel.data == 'minecraft:register') {
      const dataBuffer = buffer.slice(packetChannel.new_offset);

      this.data = dataBuffer.toString();
    } else if (packetChannel.data == 'c:register') {
      const dataBuffer = buffer.slice(packetChannel.new_offset);

      this.data = dataBuffer.toString();
    }
  }

  handle(bot: MinecraftBot): void {
    switch (this.channelId) {
      case 'minecraft:brand':
        bot.serverVariant = this.data;
        break;
      case 'minecraft:register':
        bot.registerCustomChannels(this.data.split('\u0000'));
        break;
      case 'fabric:accepted_attachments_v1': {
        const response = new S_ConfigurationCustomPayloadPacket(
          this.channelId,
          writeByte(0),
        );
        bot.sendPacket(response);
        break;
      }
      //does send version information which should be parsed
      case 'c:version': {
        const response = new S_ConfigurationCustomPayloadPacket(
          this.channelId,
          Buffer.concat([writeByte(1), writeByte(1)]),
        );
        bot.sendPacket(response);
        break;
      }
      case 'c:register': {
        const response = new S_ConfigurationCustomPayloadPacket(
          this.channelId,
          Buffer.from(this.data),
        );
        bot.sendPacket(response);

        break;
      }

      default:
        console.log('unhandled channel: ' + this.channelId);
        break;
    }
  }
}
