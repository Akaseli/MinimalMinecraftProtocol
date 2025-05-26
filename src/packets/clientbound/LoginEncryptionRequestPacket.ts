import { MinecraftBot } from "../..";
import { readBoolean } from "../../nbt/readers/boolean";
import { readPrefixedArray } from "../../nbt/readers/prefixed_array";
import { readProtocolString } from "../../nbt/readers/string";
import { writeVarInt } from "../../nbt/readers/varInt";
import { Packet } from "../packet";

import crypto from "crypto";

//Obfuscation map "ClientboundHelloPacket"
export class LoginEncryptionRequestPacket implements Packet{
  private serverId!: string;
  private publicKey!: Buffer;
  private verifyToken!: Buffer;
  private authenticate!: boolean;

  read(buffer: Buffer, offset: number): void {
    const packetServerId = readProtocolString(buffer, offset);

    const packetPublicKey = readPrefixedArray(
      buffer,
      packetServerId.new_offset
    );
    const packetVerifyToken = readPrefixedArray(
      buffer,
      packetPublicKey.new_offset
    );
    const packetAuthenticate = readBoolean(
      buffer,
      packetVerifyToken.new_offset
    );

    this.serverId = packetServerId.data;
    this.publicKey = packetPublicKey.data;
    this.verifyToken = packetVerifyToken.data;
    this.authenticate = packetAuthenticate.data;
  }

  handle(bot: MinecraftBot): void {
    if (this.authenticate) {
      const pKey = crypto.createPublicKey({
        key: this.publicKey,
        format: "der",
        type: "spki",
      });

      const sharedSecret = crypto.randomBytes(16);

      const sha1 = crypto.createHash("sha1");
      sha1.update(this.serverId, "ascii");
      sha1.update(sharedSecret);
      sha1.update(this.publicKey);

      const hashBuff = sha1.digest();

      const hashHex = hashBuff.toString("hex");
      let hashInt = BigInt("0x" + hashHex);

      const bytel = hashBuff.length;
      const maxValue = BigInt(2 ** (bytel * 8));
      if (hashInt >= maxValue / 2n) {
        hashInt -= maxValue;
      }

      let resultHex = hashInt.toString(16);
      if (hashInt < 0) {
        resultHex = "-" + resultHex.substring(1);
      }

      const reqData = {
        accessToken: bot.account.token,
        selectedProfile: bot.account.profile.id,
        serverId: resultHex,
      };

      const eSharedSecret = crypto.publicEncrypt(
        { key: pKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        sharedSecret
      );
      const eVerifyToken = crypto.publicEncrypt(
        { key: pKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        this.verifyToken
      );

      const packetToSend = Buffer.concat([
        writeVarInt(eSharedSecret.length),
        eSharedSecret,
        writeVarInt(eVerifyToken.length),
        eVerifyToken,
      ]);

      //Auth to mojang
      bot.postMojangAuthentication(
        reqData,
        packetToSend
      );

      bot.cipher = crypto.createCipheriv(
        "aes-128-cfb8",
        sharedSecret,
        sharedSecret
      );
      bot.decipher = crypto.createDecipheriv(
        "aes-128-cfb8",
        sharedSecret,
        sharedSecret
      );
    }
  }

}