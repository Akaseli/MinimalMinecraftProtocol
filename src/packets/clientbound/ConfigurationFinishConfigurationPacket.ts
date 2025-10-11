import { MinecraftBot } from '../..';
import { Packet } from '../packet';

export class ConfigurationFinishConfigurationPacket implements Packet {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  read(bot: MinecraftBot, buffer: Buffer, offset: number): void {}

  handle(bot: MinecraftBot): void {
    bot.sendConfigurationEnd();
  }
}
