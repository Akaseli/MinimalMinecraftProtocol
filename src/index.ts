import {
  Authflow,
  MinecraftJavaCertificates,
  MinecraftJavaLicenses,
  MinecraftJavaProfile,
} from "prismarine-auth";
import net from "net";
import crypto from "crypto";
import zlib from "zlib";

import EventEmitter from "events";
import { readVarInt, writeVarInt } from "./nbt/readers/varInt";
import { writeProtocolString } from "./nbt/readers/string";
import { writeUUID } from "./nbt/readers/uuid";
import { writeBoolean } from "./nbt/readers/boolean";
import { writeLong } from "./nbt/readers/long";
import { writeInt } from "./nbt/readers/int";

import TypedEventEmitter from "typed-emitter";
import { NBT } from "./nbt";
import { packets } from "./packets/packets";
import { RegistryEntry } from "./interfaces/RegistryEntry";

interface BotEvents {
  connected: () => void,
  world_border: (x: number, y:number, old: number) => void,
  map: (colums: number, rows: number, map_id: number, scale: number, map_data: Buffer) => void,
  player_chat: (sender_name: string|NBT, message: string) => void,
  disguised_chat: (sender_name: string|NBT, message: string|NBT) => void,
  whisper: (sender_name: string|NBT, message: string, sender: Buffer) => void,
  system_chat: (message: string|NBT) => void,
  disconnected: () => void
}

//@ts-expect-error: Types do work with current interface.
export class MinecraftBot extends (EventEmitter as new () => TypedEventEmitter<BotEvents>) {
  private accountName;
  private azureToken;
  private serverAddress;
  private serverPort;
  private state = "handshake";
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
  
  public players: Record<string, string> = {}
  public connected = false
  public registry: Record<string, RegistryEntry[]> = {}
  //namespace:id, version
  public serverPacks: Record<string, string> = {}
  
  constructor(accountName: string, azureToken: string, serverAddress: string, serverPort: number){
    super();
    this.accountName = accountName;
    this.azureToken = azureToken;
    this.serverAddress = serverAddress;
    this.serverPort = serverPort;
  }

  public async connect(){
    await this.login();
    this.startConnection();
  }

  private async login() {
    const auth = new Authflow(this.accountName, "./cache/", {
      flow: "msal",
      //@ts-expect-error: Will work fine using a custom login instead of some preset values.
      authTitle: this.azureToken,
    });
  
    this.account = await auth.getMinecraftJavaToken({
      fetchProfile: true,
      fetchCertificates: true,
    });
  
    console.log("Logged in as: " + this.account.profile.name);
  }

  private async startConnection() {
    this.socket = net.createConnection({ host: this.serverAddress, port: this.serverPort });
  
    const portBuf = Buffer.alloc(2);
    portBuf.writeUInt16BE(this.serverPort, 0);
  
    //Handshake https://minecraft.wiki/w/Java_Edition_protocol#Handshake
    let data = Buffer.concat([
      writeVarInt(770),
      writeProtocolString(this.serverAddress),
      portBuf,
      writeVarInt(2),
    ]);
  
    let packet = this.createPacket(0x00, data);
    this.socket.write(packet);
  
    this.state = "login";
  
    //Login Start https://minecraft.wiki/w/Java_Edition_protocol#Login_Start
    data = Buffer.concat([
      writeProtocolString(this.account.profile.name),
      writeUUID(this.account.profile.id),
    ]);
  
    packet = this.createPacket(0x00, data);
    this.socket.write(packet);
  
    let dataBuff: Buffer = Buffer.alloc(0);
  
    this.socket.on("data", async (data) => {
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
          const uncompressedLengthResult  = readVarInt(fullPacket, 0);
          const uncompressedLength = uncompressedLengthResult.data
          const dataOffset = uncompressedLengthResult.new_offset
  
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
  
    this.socket.on("end", () => {
      console.log("Disconnected from server");
      this.handleDisconnect();
    });
  
    this.socket.on("error", (err) => {
      //@ts-expect-error: Code exists, but isnt in type defs.
      if (err.code === "ECONNREFUSED") {
        console.log("Connection refused!");
        this.handleDisconnect();
      } else {
        throw err;
      }
    });
  }

  private createPacket(
    packetId: number,
    data: Buffer | null,
    noEncrypt = false
  ): Buffer {
    const packetIdBuffer = writeVarInt(packetId);
    const dataBuffer = data ?? Buffer.alloc(0);
    const uncompressed = Buffer.concat([packetIdBuffer, dataBuffer]);
  
    let packet: Buffer;
  
    if (this.compressionTreshold >= 0) {
      if (uncompressed.length >= this.compressionTreshold) {
        // Compress the full packet
        const compressedData = zlib.deflateSync(uncompressed);
        const dataLength = writeVarInt(uncompressed.length); // uncompressed length
        const fullLength = writeVarInt(dataLength.length + compressedData.length);
  
        packet = Buffer.concat([fullLength, dataLength, compressedData]);
      } else {
        // Compression enabled, but size below threshold: send uncompressed with dataLength = 0
        const dataLength = writeVarInt(0);
        const fullLength = writeVarInt(dataLength.length + uncompressed.length);
  
        packet = Buffer.concat([fullLength, dataLength, uncompressed]);
      }
    } else {
      // Compression disabled: just send [length][packetId][data]
      const length = writeVarInt(uncompressed.length);
      packet = Buffer.concat([length, uncompressed]);
    }
  
    if (this.cipher && !noEncrypt) {
      return this.cipher.update(packet);
    }
  
    return packet;
  }

  
  async postMojangAuthentication(
    reqData: unknown,
    packetContent: Buffer
  ) {
    await fetch(
      "https://sessionserver.mojang.com/session/minecraft/join",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqData),
      }
    );

    const packet = this.createPacket(0x01, packetContent, true);
    this.socket.write(packet);
  }

  sendClientInformation() {
    const data = Buffer.concat([
      writeProtocolString("en_US"),
      Buffer.from([0x07]),
      writeVarInt(0), //enabled
      writeBoolean(true),
      //Bitmask, so any byte
      Buffer.from([0x7f]),
      writeVarInt(1),
      writeBoolean(false),
      writeBoolean(true),
      writeVarInt(0), //Particles
    ]);

    const packet = this.createPacket(0x00, data);
    this.socket.write(packet);
  }

  sendAcknowledged() {
    const packet = this.createPacket(0x03, null);

    this.state = "configuration";

    this.socket.write(packet);

    this.sendClientInformation();
  }

  sendConfigurationKeepAlive(random_id: bigint) {
    const packet = this.createPacket(0x04, writeLong(random_id, true));
    this.socket.write(packet);
  }

  sendPlayKeepAlive(random_id: bigint) {
    const packet = this.createPacket(0x1a, writeLong(random_id, true));
    this.socket.write(packet);
  }

  sendPong(random_id: number) {
    const packet = this.createPacket(0x05, writeInt(random_id, true));
    this.socket.write(packet);
  }

  sendKnownPacks() {
    const packData = Buffer.concat([
      writeVarInt(1),
      writeProtocolString("minecraft"),
      writeProtocolString("core"),
      writeProtocolString("1.21.5"),
    ]);

    const packet = this.createPacket(0x07, packData);

    this.socket.write(packet);
  }

  //TODO move to custom_bot
  private setupInGame() {
    //Respawn packet
    const data = Buffer.concat([writeVarInt(0)]);

    const packet = this.createPacket(0x0a, data);
    this.socket.write(packet);

    const tpPacket = this.createPacket(0x00, writeVarInt(1));
    this.socket.write(tpPacket);
  }

  sendConfigurationEnd() {
    const packet = this.createPacket(0x03, null);
    this.socket.write(packet);

    this.emit("connected");
    this.state = "play";

    this.connected = true;
    this.players = {}
    
    this.setupInGame();
  }

  private handlePacket(dataToProcess: Buffer, offset: number, packetId: number) {
    const key = packetId + "-" + this.state;

    const PacketClass = packets[key];
  
    //Use old handler for packets not yet implemented
    if(PacketClass){
      const packet = new PacketClass()
      packet.read(dataToProcess, offset);
      packet.handle(this);
    }
    else{
      //console.log("Not handled " + state + " TYPE 0x" + dataToProcess[0].toString(16).padStart(2, '0'))
    }
  }

  public sendCommand(command: string){
    const commandPacket = this.createPacket(0x05, writeProtocolString(command));
    this.socket.write(commandPacket);
  }

  private handleDisconnect() {
    this.players = {}
    this.compressionTreshold = -1;
    this.cipher = null;
    this.decipher = null;
    this.connected = false;
    this.registry = {}
    this.serverPacks= {}
    this.emit("disconnected")
  }
}

export * from './nbt';