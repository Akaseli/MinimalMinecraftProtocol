import { MinecraftBot } from '../..';
import { readInt } from '../../nbt/readers/int';
import { Packet } from '../packet';
import { S_ConfigurationPongPacket } from '../serverbound/S_ConfigurationPongPacket';

export class ConfigurationPingPacket implements Packet {
  private id!: number;

  read(bot: MinecraftBot, buffer: Buffer, offset: number): void {
    const packetId = readInt(buffer, offset, true);

    this.id = packetId.data;
  }

  handle(bot: MinecraftBot): void {
    const pong = new S_ConfigurationPongPacket(this.id);

    bot.sendPacket(pong);
  }
}
