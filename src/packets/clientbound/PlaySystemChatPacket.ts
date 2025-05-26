import { MinecraftBot, NBT } from '../..';
import { readTextComponent } from '../../nbt/readers/text_component';
import { Packet } from '../packet';

export class PlaySystemChatPacket implements Packet {
  private content!: string | NBT;

  read(buffer: Buffer, offset: number): void {
    const packetContent = readTextComponent(buffer, offset);

    //const isActionBar = readBoolean(buffer, packetContent.offset);

    this.content = packetContent.data;
  }

  handle(bot: MinecraftBot): void {
    bot.emit('system_chat', this.content);
  }
}
