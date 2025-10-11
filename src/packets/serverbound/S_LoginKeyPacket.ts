import { MinecraftBot } from '../..';
import { writeVarInt } from '../../nbt';
import { ServerboundPacket } from '../packet';

export class S_LoginKeyPacket implements ServerboundPacket {
  private sharedSecret;
  private verifyToken;

  constructor(shared: Buffer, verify: Buffer) {
    this.sharedSecret = shared;
    this.verifyToken = verify;
  }

  toBuffer(bot: MinecraftBot): Buffer {
    return Buffer.concat([
      writeVarInt(bot.serverboundPackets['LoginKeyPacket']),
      writeVarInt(this.sharedSecret.length),
      this.sharedSecret,
      writeVarInt(this.verifyToken.length),
      this.verifyToken,
    ]);
  }
}
