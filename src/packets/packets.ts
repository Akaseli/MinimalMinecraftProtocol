import { ConfigurationCustomPayloadPacket } from "./clientbound/ConfigurationCustomPayloadPacket";
import { ConfigurationFinishConfigurationPacket } from "./clientbound/ConfigurationFinishConfigurationPacket";
import { ConfigurationKeepAlivePacket } from "./clientbound/ConfigurationKeepAlivePacket";
import { ConfigurationPingPacket } from "./clientbound/ConfigurationPingPacket";
import { ConfigurationRegistryDataPacket } from "./clientbound/ConfigurationRegistryDataPacket";
import { ConfigurationSelectKnownPacksPacket } from "./clientbound/ConfigurationSelectKnownPacksPacket";
import { LoginCompressionPacket } from "./clientbound/LoginCompressionPacket";
import { LoginDisconnectPacket } from "./clientbound/LoginDisconnectPacket";
import { LoginEncryptionRequestPacket } from "./clientbound/LoginEncryptionRequestPacket";
import { LoginFinishedPacket } from "./clientbound/LoginFinishedPacket";
import { Packet } from "./packet";

export const packets: Record<string, new () => Packet> = {
  "1-configuration": ConfigurationCustomPayloadPacket,
  "3-configuration": ConfigurationFinishConfigurationPacket,
  "4-configuration": ConfigurationKeepAlivePacket,
  "5-configuration": ConfigurationPingPacket,
  "7-configuration": ConfigurationRegistryDataPacket,
  "14-configuration": ConfigurationSelectKnownPacksPacket,

  

  "0-login": LoginDisconnectPacket,
  "1-login": LoginEncryptionRequestPacket,
  "2-login": LoginFinishedPacket,
  "3-login": LoginCompressionPacket
};