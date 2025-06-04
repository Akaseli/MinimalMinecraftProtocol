import {
  Authflow,
  MinecraftJavaCertificates,
  MinecraftJavaLicenses,
  MinecraftJavaProfile,
} from 'prismarine-auth';
import net from 'net';
import crypto from 'crypto';
import zlib from 'zlib';
import EventEmitter from 'events';
import { readVarInt, writeVarInt } from './nbt/readers/varInt';
import { writeProtocolString } from './nbt/readers/string';
import TypedEventEmitter from 'typed-emitter';
import { NBT } from './nbt';
import { clientboundPackets } from './packets/packets';
import { RegistryEntry } from './interfaces/RegistryEntry';
import { PlayDisguisedChat } from './packets/clientbound/PlayDisguisedChatPacket';
import { PlayInitializeBorder } from './packets/clientbound/PlayInitializeBorderPacket';
import { PlayMapItemData } from './packets/clientbound/PlayMapItemDataPacket';
import { PlayPlayerChat } from './packets/clientbound/PlayPlayerChatPacket';
import { PlaySystemChat } from './packets/clientbound/PlaySystemChatPacket';
import { ServerboundPacket } from './packets/packet';

import { S_HandshakeIntentionPacket } from './packets/serverbound/S_HandshakeIntentionPacket';
import { S_LoginStartPacket } from './packets/serverbound/S_LoginStartPacket';
import { S_ConfigurationClientInformationPacket } from './packets/serverbound/S_ConfigurationClientInformationPacket';
import { S_ConfigurationCustomPayloadPacket } from './packets/serverbound/S_ConfigurationCustomPayloadPacket';
import { S_ConfigurationSelectKnownPacksPacket } from './packets/serverbound/S_ConfigurationSelectKnownPacksPacket';
import { S_PlayChatCommandPacket } from './packets/serverbound/S_PlayChatCommandPacket';
import { S_LoginAcknowledgedPacket } from './packets/serverbound/S_LoginAcknowledgedPacket';
import { S_ConfigurationFinishConfigurationPacket } from './packets/serverbound/S_ConfigurationFinishConfigurationPacket';
import { S_PlayClientCommandPacket } from './packets/serverbound/S_PlayClientCommandPacket';

interface BotEvents {
  connected: () => void;
  world_border: (
    x: number,
    y: number,
    old: number,
    packet: PlayInitializeBorder,
  ) => void;
  map: (
    colums: number,
    rows: number,
    map_id: number,
    scale: number,
    map_data: Buffer,
    packet: PlayMapItemData,
  ) => void;
  player_chat: (
    sender_name: string | NBT,
    message: string,
    packet: PlayPlayerChat,
  ) => void;
  disguised_chat: (
    sender_name: string | NBT,
    message: string | NBT,
    packet: PlayDisguisedChat,
  ) => void;
  whisper: (
    sender_name: string | NBT,
    message: string,
    sender: Buffer,
    packet: PlayPlayerChat,
  ) => void;
  system_chat: (message: string | NBT, packet: PlaySystemChat) => void;
  custom_payload: (channel: string, data: Buffer) => void;
  disconnected: () => void;
}

//@ts-expect-error: Types do work with current interface.
export class MinecraftBot extends (EventEmitter as new () => TypedEventEmitter<BotEvents>) {
  private accountName;
  private azureToken;
  private serverAddress;
  private serverPort;
  private pluginChannels;
  private state = 'handshake';
  compressionTreshold = -1;
  cipher: crypto.Cipher | null = null;
  decipher: crypto.Decipher | null = null;

  private socket!: net.Socket;
  account!: {
    token: string;
    entitlements: MinecraftJavaLicenses;
    profile: MinecraftJavaProfile;
    certificates: MinecraftJavaCertificates;
  };

  public players: Record<string, string> = {};
  public connected = false;
  public registry: Record<string, RegistryEntry[]> = {};
  //namespace:id, version
  public serverPacks: Record<string, string> = {};

  //Paper, fabric, forge, vanilla
  public serverVariant = 'unknown';

  constructor(
    accountName: string,
    azureToken: string,
    serverAddress: string,
    serverPort: number,
    customPluginChannels: string[] = [],
  ) {
    super();
    this.accountName = accountName;
    this.azureToken = azureToken;
    this.serverAddress = serverAddress;
    this.serverPort = serverPort;
    this.pluginChannels = customPluginChannels;
  }

  public async connect() {
    await this.login();
    this.startConnection();
  }

  private async login() {
    const auth = new Authflow(this.accountName, './cache/', {
      flow: 'msal',
      //@ts-expect-error: Will work fine using a custom login instead of some preset values.
      authTitle: this.azureToken,
    });

    this.account = await auth.getMinecraftJavaToken({
      fetchProfile: true,
      fetchCertificates: true,
    });

    console.log('Logged in as: ' + this.account.profile.name);
  }

  private async startConnection() {
    this.socket = net.createConnection({
      host: this.serverAddress,
      port: this.serverPort,
    });

    const intention = new S_HandshakeIntentionPacket(
      770,
      this.serverAddress,
      this.serverPort,
      2,
    );
    this.sendPacket(intention);

    this.state = 'login';

    const loginStart = new S_LoginStartPacket(
      this.account.profile.name,
      this.account.profile.id,
    );
    this.sendPacket(loginStart);

    let dataBuff: Buffer = Buffer.alloc(0);

    this.socket.on('data', async (data) => {
      if (this.decipher) {
        data = this.decipher.update(data);
      }

      dataBuff = Buffer.concat([dataBuff, data]);

      let offset = 0;
      while (dataBuff.length > offset) {
        let packetLengthResult;
        try {
          packetLengthResult = readVarInt(dataBuff, offset);
        } catch {
          //Not enough to even read the length
          break;
        }

        const packetLength = packetLengthResult.data;
        const newOffset = packetLengthResult.new_offset;

        //Not enough
        if (dataBuff.length < newOffset + packetLength) {
          break;
        }

        //Full found.
        const fullPacket = dataBuff.slice(newOffset, newOffset + packetLength);
        offset = newOffset + packetLength;

        let dataToProcess: Buffer;

        if (this.compressionTreshold >= 0) {
          const uncompressedLengthResult = readVarInt(fullPacket, 0);
          const uncompressedLength = uncompressedLengthResult.data;
          const dataOffset = uncompressedLengthResult.new_offset;

          if (uncompressedLength == 0) {
            //Normal
            dataToProcess = fullPacket.slice(dataOffset);
          } else {
            //Compressed
            const compressedData = fullPacket.slice(dataOffset);
            dataToProcess = await zlib.unzipSync(compressedData);
          }
        } else {
          //Normal
          dataToProcess = fullPacket;
        }

        // Process the packet
        const packetIdResult = readVarInt(dataToProcess, 0);

        const packetId = packetIdResult.data;
        const packetDataOffset = packetIdResult.new_offset;

        this.handlePacket(dataToProcess, packetDataOffset, packetId);

        // Update dataBuff to remove processed packet
        dataBuff = dataBuff.slice(offset);
        offset = 0;
      }
    });

    this.socket.on('end', () => {
      console.log('Disconnected from server');
      this.handleDisconnect();
    });

    this.socket.on('error', (err) => {
      //@ts-expect-error: Code exists, but isnt in type defs.
      if (err.code === 'ECONNREFUSED') {
        console.log('Connection refused!');
        this.handleDisconnect();
      } else {
        throw err;
      }
    });
  }

  sendPacket(packet: ServerboundPacket, noEncrypt = false) {
    const uncompressed = packet.toBuffer();
    let bytes: Buffer;

    if (this.compressionTreshold >= 0) {
      if (uncompressed.length >= this.compressionTreshold) {
        // Compress the full packet
        const compressedData = zlib.deflateSync(uncompressed);
        const dataLength = writeVarInt(uncompressed.length); // uncompressed length
        const fullLength = writeVarInt(
          dataLength.length + compressedData.length,
        );

        bytes = Buffer.concat([fullLength, dataLength, compressedData]);
      } else {
        // Compression enabled, but size below threshold: send uncompressed with dataLength = 0
        const dataLength = writeVarInt(0);
        const fullLength = writeVarInt(dataLength.length + uncompressed.length);

        bytes = Buffer.concat([fullLength, dataLength, uncompressed]);
      }
    } else {
      // Compression disabled: just send [length][packetId][data]
      const length = writeVarInt(uncompressed.length);
      bytes = Buffer.concat([length, uncompressed]);
    }

    if (this.cipher && !noEncrypt) {
      bytes = this.cipher.update(bytes);
    }

    this.socket.write(bytes);
  }

  sendClientInformation() {
    const information = new S_ConfigurationClientInformationPacket('en_US');
    this.sendPacket(information);

    const brand = new S_ConfigurationCustomPayloadPacket(
      'minecraft:brand',
      writeProtocolString('minimalminecraftprotocol'),
    );
    this.sendPacket(brand);
  }

  sendAcknowledged() {
    const packet = new S_LoginAcknowledgedPacket();
    this.sendPacket(packet);

    this.state = 'configuration';

    this.sendClientInformation();
  }

  sendKnownPacks() {
    const knownPacks = new S_ConfigurationSelectKnownPacksPacket([
      { namespace: 'minecraft', id: 'core', version: '1.21.5' },
    ]);

    this.sendPacket(knownPacks);
  }

  private setupInGame() {
    //Respawn packet
    const respawn = new S_PlayClientCommandPacket(0);
    this.sendPacket(respawn);
  }

  sendConfigurationEnd() {
    const packet = new S_ConfigurationFinishConfigurationPacket();
    this.sendPacket(packet);

    this.emit('connected');
    this.state = 'play';

    this.connected = true;
    this.players = {};

    this.setupInGame();
  }

  registerCustomChannels(serverPlugins: string[]) {
    serverPlugins = serverPlugins.filter(
      (val) => val != 'fabric:custom_ingredient_sync',
    );

    if (serverPlugins.length > 0) {
      const payload = new S_ConfigurationCustomPayloadPacket(
        'minecraft:register',
        Buffer.from(serverPlugins.join('\u0000')),
      );

      this.sendPacket(payload);
    }
  }

  private handlePacket(
    dataToProcess: Buffer,
    offset: number,
    packetId: number,
  ) {
    const key = packetId + '-' + this.state;

    //console.log('0x' + dataToProcess[0].toString(16).padStart(2, '0'));

    const PacketClass = clientboundPackets[key];

    //Use old handler for packets not yet implemented
    if (PacketClass) {
      const packet = new PacketClass();
      //Gets the raw variables
      packet.read(dataToProcess, offset);

      //Formats some information
      packet.handle(this);
    } else {
      //console.log("Not handled " + this.state + " TYPE 0x" + dataToProcess[0].toString(16).padStart(2, '0'))
    }
  }

  public sendCommand(command: string) {
    const commandPacket = new S_PlayChatCommandPacket(command);

    this.sendPacket(commandPacket);
  }

  private handleDisconnect() {
    this.players = {};
    this.compressionTreshold = -1;
    this.cipher = null;
    this.decipher = null;
    this.connected = false;
    this.registry = {};
    this.serverPacks = {};
    this.emit('disconnected');
  }
}

export * from './nbt';
export * from './packets';
