import { MinecraftBot } from '../..';
import { readProtocolString } from '../../nbt/readers/string';
import { Packet } from '../packet';

export class PlayCustomPayloadPacket implements Packet {
  //https://minecraft.wiki/w/Java_Edition_protocol/Plugin_channels
  private channelId!: string;
  private data!: string;

  read(buffer: Buffer, offset: number): void {
    const packetChannel = readProtocolString(buffer, offset);

    if (packetChannel.data == 'minecraft:register') {
      const dataBuffer = buffer.slice(packetChannel.new_offset);

      this.data = dataBuffer.toString();
    }

    this.channelId = packetChannel.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle(bot: MinecraftBot): void {
    if (this.channelId == 'minecraft:register') {
      //console.log(this.data.split('\u0000'));
    } else {
      //console.log(this.channelId);
    }
  }
}
