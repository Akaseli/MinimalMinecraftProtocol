import { MinecraftBot } from '../..';
import { readLong } from '../../nbt/readers/long';
import { Packet } from '../packet';
import { S_ConfigurationKeepAlivePacket } from '../serverbound/S_ConfigurationKeepAlivePacket';

export class ConfigurationKeepAlivePacket implements Packet {
  private challenge!: bigint;

  read(bot: MinecraftBot, buffer: Buffer, offset: number): void {
    const packetChallenge = readLong(buffer, offset, true);

    this.challenge = packetChallenge.data;
  }

  handle(bot: MinecraftBot): void {
    const response = new S_ConfigurationKeepAlivePacket(this.challenge);

    bot.sendPacket(response);
  }
}
