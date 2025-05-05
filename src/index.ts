import {
  Authflow,
  MinecraftJavaCertificates,
  MinecraftJavaLicenses,
  MinecraftJavaProfile,
} from "prismarine-auth";
import net from "net";
import crypto from "crypto";
import zlib from "zlib";
import { NBT } from "./nbt/nbt";
import { TAG_Tag } from "./nbt/tags/TAG_Tag";

import EventEmitter from "events";

// READING / WRITING OF BUFFERS 
// TODO: Move elsewhere

const SEGMENT_BITS = 0x7f;
const CONTINUE_BIT = 0x80;

function writeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  do {
    let temp = value & 0b01111111;
    value >>>= 7;
    if (value !== 0) temp |= 0b10000000;
    bytes.push(temp);
  } while (value !== 0);
  return Buffer.from(bytes);
}

function readVarInt(
  buff: Buffer,
  offset: number
): { data: number; new_offset: number } {
  let value = 0;
  let position = offset;
  let currentByte;
  let read = 0;

  while (true) {
    currentByte = buff.readUInt8(position);
    position++;

    value |= (currentByte & SEGMENT_BITS) << read;

    if ((currentByte & CONTINUE_BIT) == 0) {
      break;
    }
    read += 7;

    if (read >= 32) {
      throw new Error("VarInt is too big");
    }
  }

  return { data: value, new_offset: position };
}

function readVarLong(
  buff: Buffer,
  offset: number
): { data: bigint; new_offset: number } {
  let value = 0n;
  let position = offset;
  let currentByte;
  let read = 0n;

  while (true) {
    currentByte = buff.readUint8(position);
    position++;

    value |= (BigInt(currentByte & SEGMENT_BITS)) << read;

    if ((currentByte & CONTINUE_BIT) == 0) {
      break;
    }
    read += 7n;

    if (read >= 64n) {
      throw new Error("VarLong is too big");
    }
  }

  return { data: value, new_offset: position };
}

function readByte(
  buff: Buffer,
  offset: number
): { data: number; new_offset: number } {
  const value = buff.subarray(offset, offset+1).at(0) ?? 0;

  return {data: value, new_offset: offset + 1}
}

function writeLong(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64LE(value);

  return buffer;
}

function readLong(
  buff: Buffer,
  offset: number
): { data: bigint; new_offset: number } {
  const value = buff.readBigInt64LE(offset);

  return { data: value, new_offset: offset + 8 };
}

function writeInt(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32LE(value);

  return buffer;
}

function readInt(buff: Buffer,offset: number): { data: number; new_offset: number } {
  const value = buff.readInt32LE(offset);

  return { data: value, new_offset: offset + 4 };
}

function readDouble(buff: Buffer,offset: number): { data: number; new_offset: number } {
  const value = buff.readDoubleBE(offset);

  return { data: value, new_offset: offset + 8 };
}


function readBoolean(
  buff: Buffer,
  offset: number
): { data: boolean; new_offset: number } {
  let read = 0;

  let bool = buff.readUint8(offset);
  read += 1;

  return { data: bool === 0x01, new_offset: offset + read };
}

function writeBoolean(bool: boolean): Buffer {
  let data: Buffer;
  if (bool) {
    data = Buffer.from([1]);
  } else {
    data = Buffer.from([0]);
  }

  return data;
}

function readString(
  buff: Buffer,
  offset: number
): { data: string; new_offset: number } {
  const length = readVarInt(buff, offset);
  let value = "";

  if (length.data > 0) {
    value = buff.toString(
      "utf-8",
      length.new_offset,
      length.new_offset + length.data
    );
  }

  return { data: value, new_offset: length.new_offset + length.data };
}

function readPrefixedArray(
  buff: Buffer,
  offset: number
): { data: Buffer; new_offset: number } {
  const length = readVarInt(buff, offset);
  const data = buff.slice(length.new_offset, length.new_offset + length.data);

  return { data: data, new_offset: length.new_offset + length.data };
}

function writeUUID(value: string): Buffer {
  const cleanedUuid = value.replace(/-/g, "");

  return Buffer.from(cleanedUuid, "hex");
}

function readUUID(
  buff: Buffer,
  offset: number
): { data: Buffer; new_offset: number } {
  const uuid = buff.slice(offset, offset + 16);

  return { data: uuid, new_offset: offset + 16 };
}

function writeString(value: string): Buffer {
  const textBuffer = Buffer.from(value, "utf-8");
  const lengthBuffer = writeVarInt(textBuffer.length);

  return Buffer.concat([lengthBuffer, textBuffer]);
}

// https://minecraft.wiki/w/Java_Edition_protocol#Type:Text_Component
function readTextComponent(
  buff: Buffer,
  offset: number
): { data: string | NBT; offset: number } {
  let nbtPart = buff.slice(offset);

  const type = readVarInt(buff, offset);

  if (type.data == 8) {
    let parsed = readString(buff, type.new_offset + 1);

    return { data: parsed.data, offset: parsed.new_offset };
  } else {
    let parsed = new NBT("", nbtPart, true);

    return { data: parsed, offset: TAG_Tag._index };
  }
}


//
//  READ / WRITE ENDS
//  

export class MinecraftBot extends EventEmitter{
  private accountName;
  private azureToken;
  private serverAddress;
  private serverPort;
  private state = "handshake";
  private compressionTreshold = -1;
  private cipher: crypto.Cipher | null = null;
  private decipher: crypto.Decipher | null = null;

  //TODO: figure how to properly do this instead of !
  private socket!: net.Socket;
  private account!: {
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
      writeString(this.serverAddress),
      portBuf,
      writeVarInt(2),
    ]);
  
    let packet = this.createPacket(0x00, data);
    this.socket.write(packet);
  
    this.state = "login";
  
    //Login Start https://minecraft.wiki/w/Java_Edition_protocol#Login_Start
    data = Buffer.concat([
      writeString(this.account.profile.name),
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

  
  private async postMojangAuthentication(
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
      writeString("en_US"),
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

  private sendAcknowledged() {
    let packet = this.createPacket(0x03, null);

    this.state = "configuration";

    this.socket.write(packet);

    this.sendClientInformation();
  }

  private sendConfigurationKeepAlive(random_id: bigint) {
    let packet = this.createPacket(0x04, writeLong(random_id));
    this.socket.write(packet);
  }

  private sendPlayKeepAlive(random_id: bigint) {
    let packet = this.createPacket(0x1a, writeLong(random_id));
    this.socket.write(packet);
  }

  private sendPong(random_id: number) {
    let packet = this.createPacket(0x05, writeInt(random_id));
    this.socket.write(packet);
  }

  private sendKnownPacks() {
    let packData = Buffer.concat([
      writeVarInt(1),
      writeString("minecraft"),
      writeString("core"),
      writeString("1.21.5"),
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
    switch (packetId + "-" + this.state) {
      case "0-login":
        let info = readString(dataToProcess, offset);
        console.log(info.data);
        break;
  
      case "1-login":
        //Encryption https://minecraft.wiki/w/Java_Edition_protocol#Encryption_Request
        const serverString = readString(dataToProcess, offset);
  
        const publicKey = readPrefixedArray(
          dataToProcess,
          serverString.new_offset
        );
        const verifyToken = readPrefixedArray(
          dataToProcess,
          publicKey.new_offset
        );
        const shouldAuthenticate = readBoolean(
          dataToProcess,
          verifyToken.new_offset
        );
  
        //https://minecraft.wiki/w/Protocol_encryption#Authentication
        if (shouldAuthenticate.data) {
          const pKey = crypto.createPublicKey({
            key: publicKey.data,
            format: "der",
            type: "spki",
          });
  
          const sharedSecret = crypto.randomBytes(16);
  
          const sha1 = crypto.createHash("sha1");
          sha1.update(serverString.data, "ascii");
          sha1.update(sharedSecret);
          sha1.update(publicKey.data);
  
          const hashBuff = sha1.digest();
  
          let hashHex = hashBuff.toString("hex");
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
            accessToken: this.account.token,
            selectedProfile: this.account.profile.id,
            serverId: resultHex,
          };
  
          const eSharedSecret = crypto.publicEncrypt(
            { key: pKey, padding: crypto.constants.RSA_PKCS1_PADDING },
            sharedSecret
          );
          const eVerifyToken = crypto.publicEncrypt(
            { key: pKey, padding: crypto.constants.RSA_PKCS1_PADDING },
            verifyToken.data
          );
  
          let packetToSend = Buffer.concat([
            writeVarInt(eSharedSecret.length),
            eSharedSecret,
            writeVarInt(eVerifyToken.length),
            eVerifyToken,
          ]);
  
          //Auth to mojang
          this.postMojangAuthentication(
            reqData,
            packetToSend
          );
  
          this.cipher = crypto.createCipheriv(
            "aes-128-cfb8",
            sharedSecret,
            sharedSecret
          );
          this.decipher = crypto.createDecipheriv(
            "aes-128-cfb8",
            sharedSecret,
            sharedSecret
          );
        }
  
        break;
      case "2-login":
        //https://minecraft.wiki/w/Java_Edition_protocol#Login_Success
        this.sendAcknowledged();
        break;
  
      case "3-login":
        //Enabling compression
        const threshold = readVarInt(dataToProcess, offset);
        this.compressionTreshold = threshold.data;
        break;
  
      case "1-configuration":
        //TODO needs to be properly implemented for some planned features
        //https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Plugin_channels
        const pluginIdentifier = readString(dataToProcess, offset);
  
        break;
  
      case "3-configuration":
        this.sendConfigurationEnd();
        break;
  
      case "4-configuration":
        //Configuration keepalive
        const random = readLong(dataToProcess, offset);
        this.sendConfigurationKeepAlive(random.data);
        break;
  
      case "5-configuration":
        const id = readInt(dataToProcess, offset);
        this.sendPong(id.data);
        break;
  
      case "7-configuration":
        // TODO needs to be implemented properly.
        // https://minecraft.wiki/w/Java_Edition_protocol#Registry_Data_2
        const regIdentifier = readString(dataToProcess, offset);
  
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
        const playAlive = readLong(dataToProcess, offset);
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
        const message = readString(dataToProcess, signatureOffset);
        const timestamp = readLong(dataToProcess, message.new_offset);
        const salt = readLong(dataToProcess, timestamp.new_offset);
  
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
              const joiningUsername = readString(dataToProcess, actionOffset);
  
              this.players[playerUUIDString] = joiningUsername.data
  
              //Property
              const propertySize = readVarInt(dataToProcess, joiningUsername.new_offset);
  
              let pIoffset = propertySize.new_offset;
              for(let pI = 0; pI < propertySize.data; pI++){
                const sName = readString(dataToProcess, pIoffset)
                const sValue = readString(dataToProcess, sName.new_offset)
  
                const sSignatureExists = readBoolean(dataToProcess, sValue.new_offset)
  
                if(sSignatureExists.data){
                  const sSignature = readString(dataToProcess, sSignatureExists.new_offset)
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
                
                const expiringTiem = readLong(dataToProcess, sessionId.new_offset)
                
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

  public sendCommand(command: string){
    let commandPacket = this.createPacket(0x05, writeString(command));
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