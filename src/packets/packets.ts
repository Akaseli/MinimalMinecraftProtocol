import { ConfigurationCustomPayloadPacket } from './clientbound/ConfigurationCustomPayloadPacket';
import { ConfigurationFinishConfigurationPacket } from './clientbound/ConfigurationFinishConfigurationPacket';
import { ConfigurationKeepAlivePacket } from './clientbound/ConfigurationKeepAlivePacket';
import { ConfigurationPingPacket } from './clientbound/ConfigurationPingPacket';
import { ConfigurationRegistryDataPacket } from './clientbound/ConfigurationRegistryDataPacket';
import { ConfigurationSelectKnownPacksPacket } from './clientbound/ConfigurationSelectKnownPacksPacket';
import { LoginCompressionPacket } from './clientbound/LoginCompressionPacket';
import { LoginDisconnectPacket } from './clientbound/LoginDisconnectPacket';
import { LoginEncryptionRequestPacket } from './clientbound/LoginEncryptionRequestPacket';
import { LoginFinishedPacket } from './clientbound/LoginFinishedPacket';
import { PlayCustomPayloadPacket } from './clientbound/PlayCustomPayloadPacket';
import { PlayDisconnectPacket } from './clientbound/PlayDisconnectPacket';
import { PlayDisguisedChatPacket } from './clientbound/PlayDisguisedChatPacket';
import { PlayGameEventPacket } from './clientbound/PlayGameEventPacket';
import { PlayInitializeBorderPacket } from './clientbound/PlayInitializeBorderPacket';
import { PlayKeepAlivePacket } from './clientbound/PlayKeepAlivePacket';
import { PlayMapItemDataPacket } from './clientbound/PlayMapItemDataPacket';
import { PlayPlayerChatPacket } from './clientbound/PlayPlayerChatPacket';
import { PlayPlayerInfoRemovePacket } from './clientbound/PlayPlayerInfoRemovePacket';
import { PlayPlayerInfoUpdatePacket } from './clientbound/PlayPlayerInfoUpdatePacket';
import { PlaySystemChatPacket } from './clientbound/PlaySystemChatPacket';
import { Packet } from './packet';

export const clientboundPackets: Record<string, new () => Packet> = {
  '0-login': LoginDisconnectPacket,
  '1-login': LoginEncryptionRequestPacket,
  '2-login': LoginFinishedPacket,
  '3-login': LoginCompressionPacket,

  '1-configuration': ConfigurationCustomPayloadPacket,
  '3-configuration': ConfigurationFinishConfigurationPacket,
  '4-configuration': ConfigurationKeepAlivePacket,
  '5-configuration': ConfigurationPingPacket,
  '7-configuration': ConfigurationRegistryDataPacket,
  '14-configuration': ConfigurationSelectKnownPacksPacket,

  '24-play': PlayCustomPayloadPacket,
  '28-play': PlayDisconnectPacket,
  '29-play': PlayDisguisedChatPacket,
  '34-play': PlayGameEventPacket,
  '37-play': PlayInitializeBorderPacket,
  '38-play': PlayKeepAlivePacket,
  '44-play': PlayMapItemDataPacket,
  '58-play': PlayPlayerChatPacket,
  '62-play': PlayPlayerInfoRemovePacket,
  '63-play': PlayPlayerInfoUpdatePacket,
  '114-play': PlaySystemChatPacket,
};

export const serverboundPackets: Record<string, number> = {
  HandshakeIntentionPacket: 0,

  LoginStartPacket: 0,

  ConfigurationClientInformationPacket: 0,
  ConfigurationCustomPayloadPacket: 2,

  PlayCustomPayloadPacket: 20,
};
