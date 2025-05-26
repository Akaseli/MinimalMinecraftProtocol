import { MinecraftBot } from '../..';
import { readProtocolString } from '../../nbt/readers/string';
import { Packet } from '../packet';

export class LoginDisconnectPacket implements Packet {
  private reason!: string;

  read(buffer: Buffer, offset: number): void {
    const packetReason = readProtocolString(buffer, offset);

    this.reason = packetReason.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle(bot: MinecraftBot): void {
    console.log('Bot got disconnected with reason: ' + this.reason);
  }
}
