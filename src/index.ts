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
import { readProtocolString, writeProtocolString } from "./nbt/readers/string";
import { readUUID, writeUUID } from "./nbt/readers/uuid";
import { readBoolean, writeBoolean } from "./nbt/readers/boolean";
import { readLong, writeLong } from "./nbt/readers/long";
import { readInt, writeInt } from "./nbt/readers/int";
import { readPrefixedArray } from "./nbt/readers/prefixed_array";
import { readDouble } from "./nbt/readers/double";
import { readVarLong } from "./nbt/readers/varLong";
import { readByte } from "./nbt/readers/byte";
import { readTextComponent } from "./nbt/readers/text_component";
import TypedEventEmitter from "typed-emitter";
import { NBT } from "./nbt";
import { packets } from "./packets/packets";

type BotEvents = {
  connected: () => void,
  world_border: (x: number, y:number, old: number) => void,
  map: (colums: number, rows: number, map_id: number, scale: number, map_data: Buffer) => void,
  player_chat: (sender_name: string|NBT, message: string) => void,
  whisper: (sender_name: string|NBT, message: string, sender: Buffer) => void,
  system_chat: (message: string|NBT) => void,
  disconnected: () => void
}

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
      //@ts-ignore Will work fine using a custom login instead of some minecraft versions token.
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
        } catch (e) {
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
      //@ts-ignore
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
    const res = await fetch(
      "https://sessionserver.mojang.com/session/minecraft/join",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqData),
      }
    );

    let packet = this.createPacket(0x01, packetContent, true);
    this.socket.write(packet);
  }

  private sendClientInformation() {
    let data = Buffer.concat([
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

    let packet = this.createPacket(0x00, data);
    this.socket.write(packet);
  }

  sendAcknowledged() {
    let packet = this.createPacket(0x03, null);

    this.state = "configuration";

    this.socket.write(packet);

    this.sendClientInformation();
  }

  private sendConfigurationKeepAlive(random_id: bigint) {
    let packet = this.createPacket(0x04, writeLong(random_id, true));
    this.socket.write(packet);
  }

  private sendPlayKeepAlive(random_id: bigint) {
    let packet = this.createPacket(0x1a, writeLong(random_id, true));
    this.socket.write(packet);
  }

  private sendPong(random_id: number) {
    let packet = this.createPacket(0x05, writeInt(random_id, true));
    this.socket.write(packet);
  }

  private sendKnownPacks() {
    let packData = Buffer.concat([
      writeVarInt(1),
      writeProtocolString("minecraft"),
      writeProtocolString("core"),
      writeProtocolString("1.21.5"),
    ]);

    let packet = this.createPacket(0x07, packData);

    this.socket.write(packet);
  }

  //TODO move to custom_bot
  private setupInGame() {
    //Respawn packet
    let data = Buffer.concat([writeVarInt(0)]);

    let packet = this.createPacket(0x0a, data);
    this.socket.write(packet);

    let tpPacket = this.createPacket(0x00, writeVarInt(1));
    this.socket.write(tpPacket);
  }

  private sendConfigurationEnd() {
    let packet = this.createPacket(0x03, null);
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
    if(!PacketClass){
      switch (key) {    
        case "1-configuration":
          //TODO needs to be properly implemented for some planned features
          //https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Plugin_channels
          const pluginIdentifier = readProtocolString(dataToProcess, offset);
    
          break;
    
        case "3-configuration":
          this.sendConfigurationEnd();
          break;
    
        case "4-configuration":
          //Configuration keepalive
          const random = readLong(dataToProcess, offset, true);
          this.sendConfigurationKeepAlive(random.data);
          break;
    
        case "5-configuration":
          const id = readInt(dataToProcess, offset, true);
          this.sendPong(id.data);
          break;
    
        case "7-configuration":
          // TODO needs to be implemented properly.
          // https://minecraft.wiki/w/Java_Edition_protocol#Registry_Data_2
          const regIdentifier = readProtocolString(dataToProcess, offset);
    
          const arrLen = readVarInt(dataToProcess, regIdentifier.new_offset);
    
          break;
    
        case "14-configuration":
          //Basicly just send nothing, some integrations might require something to be sent
          this.sendKnownPacks();
          break;
    
        case "29-play":
          //Disguised Chat Message
          console.log("Disguised are not handled at this moment.")
          //Most likely when a server uses commands like say and others.
          break;
    
        case "38-play":
          //Keep alive
          const playAlive = readLong(dataToProcess, offset, true);
          this.sendPlayKeepAlive(playAlive.data);
          break;

        case "37-play":
          //World border
          const x = readDouble(dataToProcess, offset);
          const y = readDouble(dataToProcess, x.new_offset);

          const oldDia = readDouble(dataToProcess, y.new_offset);
          const newDia = readDouble(dataToProcess, oldDia.new_offset);

          const speed = readVarLong(dataToProcess, newDia.new_offset);
          
          const portalTeleportBoundary = readVarInt(dataToProcess, speed.new_offset);
          const warningBlocks = readVarInt(dataToProcess, portalTeleportBoundary.new_offset);
          const warningTime = readVarInt(dataToProcess, warningBlocks.new_offset);

          this.emit("world_border", x.data, y.data, oldDia.data)
          break
          
        case "44-play":
          //Map data
          const mapId = readVarInt(dataToProcess, offset)
          const scale = readByte(dataToProcess, mapId.new_offset)
          const locked = readBoolean(dataToProcess, scale.new_offset)

          const hasIcons = readBoolean(dataToProcess, locked.new_offset)
          let iconOffset = hasIcons.new_offset

          if(hasIcons.data){
            const iconCount = readVarInt(dataToProcess, iconOffset)
            iconOffset = iconCount.new_offset

            for(let i = 0; i<iconCount.data; i++){
              const iconType = readVarInt(dataToProcess, iconOffset)
              const x = readByte(dataToProcess, iconType.new_offset)
              const y = readByte(dataToProcess, x.new_offset)
              const direction = readByte(dataToProcess, y.new_offset)

              const hasName = readBoolean(dataToProcess, direction.new_offset)
              if(hasName.data){
                const displayName = readTextComponent(dataToProcess, hasName.new_offset)
                iconOffset = displayName.offset
              } 
              else{
                iconOffset = hasName.new_offset
              }
            }
          }

          const columns = readByte(dataToProcess, iconOffset)
          if(columns.data > 0){
            const rows = readByte(dataToProcess, columns.new_offset)
            const xOffset = readByte(dataToProcess, rows.new_offset)
            const zOffset = readByte(dataToProcess, xOffset.new_offset)

            const dataLength = readVarInt(dataToProcess, zOffset.new_offset)
            
            const mapData =  dataToProcess.slice(dataLength.new_offset, dataLength.new_offset + dataLength.data)
            this.emit("map", columns.data, rows.data, mapId.data, scale.data, mapData)
          }

          break  

        case "58-play":
          //Player Chat Message
          
          //Seems to increment with index, undocumented on the wiki
          const someVarInt = readVarInt(dataToProcess, offset)
    
          const sender = readUUID(dataToProcess, someVarInt.new_offset);
          const index = readVarInt(dataToProcess, sender.new_offset);
    
          const hasSignature = readBoolean(dataToProcess, index.new_offset);
          let signatureOffset = hasSignature.new_offset;
          if (hasSignature.data) {
            signatureOffset += 256;
          }
    
          //Body
          const message = readProtocolString(dataToProcess, signatureOffset);
          const timestamp = readLong(dataToProcess, message.new_offset, true);
          const salt = readLong(dataToProcess, timestamp.new_offset, true);
    
          //The signature
          const arrayLength = readVarInt(dataToProcess, salt.new_offset);
          
          let loopOffset = arrayLength.new_offset;
          for (let i = 0; i < arrayLength.data; i++) {
            const messageId = readVarInt(dataToProcess, loopOffset);
            
            if (messageId.data == 0) {
              loopOffset = messageId.new_offset + 256;
            } else {
              loopOffset = messageId.new_offset;
            }
          }
    
          
          const hasSomeContent = readBoolean(dataToProcess, loopOffset);
    
          let someContentIndex = hasSomeContent.new_offset
    
          if (hasSomeContent.data) {
            const theContent = readTextComponent(dataToProcess, someContentIndex)
    
            someContentIndex = theContent.offset
          }
    
          const filter = readVarInt(dataToProcess, someContentIndex);
    
          //Partially filtered - probably should filter message to match 1:1 with ingame
          let filterOffset = filter.new_offset
          if (filter.data == 2) {
            const bitsetLength = readVarInt(dataToProcess, filterOffset)
    
            filterOffset = bitsetLength.new_offset + bitsetLength.data * 8
          }
    
          const chatType = readVarInt(dataToProcess, filter.new_offset);
          const senderName = readTextComponent(dataToProcess, chatType.new_offset);
          
          const hasTargetName = readBoolean(dataToProcess, senderName.offset)
    
          if(hasTargetName){
            //Todo currently causing alot of missing case
            //const targetContent = readTextComponent(dataToProcess, hasTargetName.new_offset)
          }
          
          //Should be read from a registry
          if (chatType.data == 1) {
            this.emit("player_chat", senderName.data, message.data);
          }
          else if (chatType.data == 3){
            this.emit("whisper", senderName.data, message.data, sender.data);
          }
    
          break;
        
        case "62-play":
          //Player Info Remove
          const removeLength = readVarInt(dataToProcess, offset)
    
          let removeLoopOffset = removeLength.new_offset
          for (let i = 0; i < removeLength.data; i++) {
    
            const uuidToRemove = readUUID(dataToProcess, removeLoopOffset)
    
            const uuidKey = uuidToRemove.data.toString("hex")
            
            if(this.players[uuidKey]) {
              delete this.players[uuidKey]
            }
    
            removeLoopOffset = uuidToRemove.new_offset
          }
    
          break
        
        case "63-play":
          //Player Info Update
          //https://minecraft.wiki/w/Java_Edition_protocol#Player_Info_Update
          const actions = readByte(dataToProcess, offset);
    
          const playersLength = readVarInt(dataToProcess, actions.new_offset)
          let playersLengthOffset = playersLength.new_offset
          
          for(let playerIndex = 0; playerIndex < playersLength.data; playerIndex++){
              const playerUUID = readUUID(dataToProcess, playersLengthOffset);
              let playerUUIDString = playerUUID.data.toString("hex")
              
              let actionOffset = playerUUID.new_offset;
              
              if(actions.data & 1){
                //We have player, and the info should be first in the packet
                const joiningUsername = readProtocolString(dataToProcess, actionOffset);
    
                this.players[playerUUIDString] = joiningUsername.data
    
                //Property
                const propertySize = readVarInt(dataToProcess, joiningUsername.new_offset);
    
                let pIoffset = propertySize.new_offset;
                for(let pI = 0; pI < propertySize.data; pI++){
                  const sName = readProtocolString(dataToProcess, pIoffset)
                  const sValue = readProtocolString(dataToProcess, sName.new_offset)
    
                  const sSignatureExists = readBoolean(dataToProcess, sValue.new_offset)
    
                  if(sSignatureExists.data){
                    const sSignature = readProtocolString(dataToProcess, sSignatureExists.new_offset)
                    pIoffset = sSignature.new_offset;
                  }
                  else{
                    pIoffset = sSignatureExists.new_offset;
                  }
                }
    
                actionOffset = pIoffset
              }
    
              if(actions.data & 2){
                const initChatPresent = readBoolean(dataToProcess, actionOffset)
    
                if(initChatPresent.data){
                  const sessionId = readUUID(dataToProcess, initChatPresent.new_offset)
                  
                  const expiringTiem = readLong(dataToProcess, sessionId.new_offset, true)
                  
                  const epkeyLenght = readVarInt(dataToProcess, expiringTiem.new_offset)
                  
                  const pkeysigLength = readVarInt(dataToProcess, epkeyLenght.new_offset + epkeyLenght.data)
    
                  actionOffset = pkeysigLength.new_offset + pkeysigLength.data
                }
                else{
                  actionOffset = initChatPresent.new_offset
                }
              }
    
              if(actions.data & 4){
                const gameMode = readVarInt(dataToProcess, actionOffset)
    
                actionOffset = gameMode.new_offset
              }
    
              if(actions.data & 8){
                //Probably should not list players having this enabled.
                const listed = readBoolean(dataToProcess, actionOffset)
    
                actionOffset = listed.new_offset
              }
    
              if(actions.data & 16){
                const ping = readVarInt(dataToProcess, actionOffset)
    
                actionOffset = ping.new_offset
              }
    
              if(actions.data & 32){
                //Display name
                const hasDisplayName = readBoolean(dataToProcess, actionOffset)
                if(hasDisplayName.data){
                  const displayName = readTextComponent(dataToProcess, hasDisplayName.new_offset)
                  actionOffset = displayName.offset
                }
                else{
                  actionOffset = hasDisplayName.new_offset
                }
              }
    
              if(actions.data & 64){
                //Tab list priority or similar
                const priority = readVarInt(dataToProcess, actionOffset)
    
                actionOffset = priority.new_offset
              }
    
              if(actions.data & 128){
                const hat = readBoolean(dataToProcess, actionOffset)
    
                actionOffset = hat.new_offset
              }
    
              playersLengthOffset = actionOffset
          }
          
        
          break
        
        case "114-play":
          //System chat
          const sysChat = readTextComponent(dataToProcess, offset);
          //Offset out of range errors...
          //const isActionBar = readBoolean(dataToProcess, sysChat.offset);
          
          this.emit("system_chat", sysChat.data)
          
          break;
    
        default:
          //console.log("Not handled " + state + " TYPE 0x" + dataToProcess[0].toString(16).padStart(2, '0'))
          break;
      }
    }
    else{
      const packet = new PacketClass()
      packet.read(dataToProcess, offset);
      packet.handle(this);
    }


  }

  public sendCommand(command: string){
    let commandPacket = this.createPacket(0x05, writeProtocolString(command));
    this.socket.write(commandPacket);
  }

  private handleDisconnect() {
    this.players = {}
    this.compressionTreshold = -1;
    this.cipher = null;
    this.decipher = null;
    this.connected = false;
    
    this.emit("disconnected")
  }
}

export * from './nbt';