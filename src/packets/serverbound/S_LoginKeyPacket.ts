import { writeVarInt } from '../../nbt';
import { ServerboundPacket } from '../packet';
import { serverboundPackets } from '../packets';

export class S_LoginKeyPacket implements ServerboundPacket {
  private sharedSecret;
  private verifyToken;

  constructor(shared: Buffer, verify: Buffer) {
    this.sharedSecret = shared;
    this.verifyToken = verify;
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      writeVarInt(serverboundPackets['LoginKeyPacket']),
      writeVarInt(this.sharedSecret.length),
      this.sharedSecret,
      writeVarInt(this.verifyToken.length),
      this.verifyToken,
    ]);
  }
}
