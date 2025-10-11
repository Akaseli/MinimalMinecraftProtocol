import { MinecraftBot } from '../..';
import { writeUnsignedShort } from '../../nbt/readers/short';
import { writeProtocolString } from '../../nbt/readers/string';
import { writeVarInt } from '../../nbt/readers/varInt';
import { ServerboundPacket } from '../packet';

export class S_HandshakeIntentionPacket implements ServerboundPacket {
  private protocolVersion: number;
  private serverAddress: string;
  private serverPort: number;
  private intent: 1 | 2 | 3;

  constructor(
    protocolVersion: number,
    serverAddress: string,
    serverPort: number,
    intent: 1 | 2 | 3,
  ) {
    this.protocolVersion = protocolVersion;
    this.serverAddress = serverAddress;
    this.serverPort = serverPort;
    this.intent = intent;
  }

  toBuffer(bot: MinecraftBot): Buffer {
    return Buffer.concat([
      writeVarInt(bot.serverboundPackets['HandshakeIntentionPacket']),
      writeVarInt(this.protocolVersion),
      writeProtocolString(this.serverAddress),
      writeUnsignedShort(this.serverPort),
      writeVarInt(this.intent),
    ]);
  }
}
