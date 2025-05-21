import { LoginCompressionPacket } from "./clientbound/LoginCompressionPacket";
import { LoginDisconnectPacket } from "./clientbound/LoginDisconnectPacket";
import { LoginEncryptionRequestPacket } from "./clientbound/LoginEncryptionRequestPacket";
import { LoginFinishedPacket } from "./clientbound/LoginFinishedPacket";
import { Packet } from "./packet";

export const packets: Record<string, new () => Packet> = {
  "0-login": LoginDisconnectPacket,
  "1-login": LoginEncryptionRequestPacket,
  "2-login": LoginFinishedPacket,
  "3-login": LoginCompressionPacket
};