import { Authflow, MinecraftJavaCertificates, MinecraftJavaLicenses, MinecraftJavaProfile } from "prismarine-auth"
import dotenv from 'dotenv'
import path from 'path'
import net from "net"
import crypto from "crypto"
import zlib from "zlib"
import { NBT } from "./nbt/nbt"

const envPath = path.join(path.resolve() + "/src/.env");
dotenv.config({path: envPath});

let account: {
  token: string;
  entitlements: MinecraftJavaLicenses;
  profile: MinecraftJavaProfile;
  certificates: MinecraftJavaCertificates;
};

let socket: net.Socket;

let compressionTreshold = -1;

let somePublicKey: crypto.KeyObject | null;
let signatureSomething: string | null;

const SEGMENT_BITS = 0x7F;
const CONTINUE_BIT = 0x80

let cipher: crypto.Cipher | null = null;
let decipher: crypto.Decipher | null = null;

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

function readVarInt(buff: Buffer, offset: number): {data: number, new_offset: number}{
  let value = 0
  let position = offset
  let currentByte;
  let read = 0;

  while(true){
    currentByte = buff.readUInt8(position);
    position++

    value |= (currentByte & SEGMENT_BITS) << read
    
    if((currentByte & CONTINUE_BIT) == 0){
      break;
    }
    read += 7;

    if (read >= 32) {
      throw new Error("VarInt is too big");
    }
  }
  
  return {data: value, new_offset: position}
}

function writeLong(value: bigint): Buffer {
  const buffer = Buffer.alloc(8)
  buffer.writeBigInt64LE(value)

  return buffer
}

function readLong(buff: Buffer, offset: number): {data: bigint, new_offset: number}{
  const value = buff.readBigInt64LE(offset)

  return {data: value, new_offset: offset + 8}
}

function writeInt(value: number): Buffer {
  const buffer = Buffer.alloc(4)
  buffer.writeInt32LE(value)

  return buffer
}

function readInt(buff: Buffer, offset: number): {data: number, new_offset: number}{
  const value = buff.readInt32LE(offset)

  return {data: value, new_offset: offset + 4}
}

function readBoolean(buff: Buffer, offset: number): {data: boolean, new_offset: number}{
  let read = 0;

  let bool = buff.readUint8(offset);
  read += 1;

  return {data: bool === 0x01, new_offset: offset + read}
}

function writeBoolean(bool: boolean): Buffer{
  let data: Buffer
  if(bool){
    data = Buffer.from([1])
  }
  else{
    data = Buffer.from([0])
  }

  return data
}

function readString(buff: Buffer, offset: number): {data: string, new_offset: number}{
  const length = readVarInt(buff, offset);
  let value = ""

  if (length.data > 0) {
    value = buff.toString("utf-8", length.new_offset, length.new_offset + length.data)
  }

  return {data: value, new_offset: length.new_offset + length.data}
}

function readPrefixedArray(buff: Buffer, offset: number): {data: Buffer, new_offset: number}{
  const length = readVarInt(buff, offset); 
  const data = buff.slice(length.new_offset, length.new_offset + length.data);

  return {data: data, new_offset: length.new_offset + length.data}
}

function writeUUID(value: string): Buffer {
  const cleanedUuid = value.replace(/-/g, '');

  return Buffer.from(cleanedUuid, "hex");
}

function writeString(value: string): Buffer {
  const textBuffer = Buffer.from(value, 'utf-8')
  const lengthBuffer = writeVarInt(textBuffer.length);

  return Buffer.concat([lengthBuffer, textBuffer])
}

function createPacket(
  packetId: number,
  data: Buffer | null,
  noEncrypt = false
): Buffer {
  const packetIdBuffer = writeVarInt(packetId);
  const dataBuffer = data ?? Buffer.alloc(0);
  const uncompressed = Buffer.concat([packetIdBuffer, dataBuffer]);

  let packet: Buffer;

  if (compressionTreshold >= 0) {
    if (uncompressed.length >= compressionTreshold) {
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

  if (cipher && !noEncrypt) {
    return cipher.update(packet);
  }

  return packet;
}

// https://minecraft.wiki/w/Java_Edition_protocol#Type:Text_Component
async function readTextComponent(buff: Buffer, offset: number) {
  let nbtPart = buff.slice(offset);

  let parsed = new NBT("", nbtPart, true);
  
  console.log(parsed)
}

async function login(){
  //@ts-ignore Will work fine using a custom login instead of some minecraft versions token.
  const auth = new Authflow("PhoebotJr", "./cache/", { flow: "msal", authTitle: process.env.LOGIN_TOKEN})

  account = await auth.getMinecraftJavaToken({ fetchProfile: true, fetchCertificates: true })


  console.log("Logged in as: " + account.profile.name)
}

async function postMojangAuthentication(reqData: unknown, shared_secret: Buffer, verify_token: Buffer, packetContent: Buffer){
  const res = await fetch("https://sessionserver.mojang.com/session/minecraft/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(reqData),
  })
     
  let packet = createPacket(0x01, packetContent, true)
  socket.write(packet)
}

let state = "handshake";

async function connect(){
  socket = net.createConnection({ host: 'localhost', port: 25565 }, () => {
    console.log('Started to connect.')

    const portBuf = Buffer.alloc(2)
    portBuf.writeUInt16BE(25565, 0)

    //Handshake https://minecraft.wiki/w/Java_Edition_protocol#Handshake
    let data = Buffer.concat([
      writeVarInt(770),
      writeString("localhost"),
      portBuf,
      writeVarInt(2)
    ])

    let packet = createPacket(0x00, data)
    socket.write(packet)

    state = "login"

    //Login Start https://minecraft.wiki/w/Java_Edition_protocol#Login_Start
    data = Buffer.concat([
      writeString(account.profile.name),
      writeUUID(account.profile.id)
    ])

    packet = createPacket(0x00, data)
    socket.write(packet)
  });

  let dataBuff: Buffer = Buffer.alloc(0);

  socket.on('data', async (data) => {
    if (decipher) {
      data = decipher.update(data);
    }
  
    dataBuff = Buffer.concat([dataBuff, data]);
  
    let offset = 0;
    while (dataBuff.length > offset) {
      const packetLengthResult = readVarInt(dataBuff, offset);
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
      if (compressionTreshold >= 0) {
        const packetLength = readVarInt(fullPacket, 0);

        if (packetLength.data == 0) {
          //Normal
          dataToProcess = fullPacket.slice(packetLength.new_offset);
        } else {
          //Compressed
          const compressedData = fullPacket.slice(packetLength.new_offset);
          dataToProcess = await zlib.unzipSync(compressedData)

        }
      } else {
        //Normal
        dataToProcess = fullPacket;
      }
  
      // Process the packet
      const packetIdResult = readVarInt(dataToProcess, 0);

      const packetId = packetIdResult.data;
      const packetDataOffset = packetIdResult.new_offset;

      handlePacket(dataToProcess, packetDataOffset, packetId);
  
      // Update dataBuff to remove processed packet
      dataBuff = dataBuff.slice(offset);
      offset = 0
    }
  });

  socket.on('end', () => {
    console.log('Disconnected from server');
  });
}

function sendClientInformation(){
  let data = Buffer.concat([
    writeString("en_US"),
    Buffer.from([0x07]),
    writeVarInt(0), //enabled
    writeBoolean(true),
    //Bitmask, so any byte
    Buffer.from([0x7F]),
    writeVarInt(1),
    writeBoolean(false),
    writeBoolean(true),
    writeVarInt(0) //Particles
  ])

  let packet = createPacket(0x00, data)
  socket.write(packet)
}

function sendAcknowledged() {
  let packet = createPacket(0x03, null)
  state = "configuration"
  socket.write(packet)

  sendClientInformation()
}

function sendConfigurationKeepAlive(random_id: bigint) {
  let packet = createPacket(0x04, writeLong(random_id))
  socket.write(packet)
}

function sendPlayKeepAlive(random_id: bigint) {
  let packet = createPacket(0x1A, writeLong(random_id))
  socket.write(packet)
}

function sendPong(random_id: number) {
  let packet = createPacket(0x05, writeInt(random_id))
  socket.write(packet)
}

function sendKnownPacks(){
  let packData = Buffer.concat([
    writeVarInt(1),
    writeString("minecraft"),
    writeString("core"),
    writeString("1.21.5")
  ])

  let packet = createPacket(0x07, packData)

  socket.write(packet)
}

function setupInGame(){
  //Respawn packet
  let data = Buffer.concat([
    writeVarInt(0)
  ])

  let packet = createPacket(0x0A, data)
  socket.write(packet)

  let tpPacket = createPacket(0x00, writeVarInt(1))
  socket.write(tpPacket)
}

function sendConfigurationEnd(){
  let packet = createPacket(0x03, null)
  socket.write(packet)

  state = "play"

  setupInGame()
}

function handlePacket(dataToProcess: Buffer, offset: number, packetId: number){
  //console.log("Received " + packetId.toString(16).toUpperCase() + " in " + state + " [" + packetId + "-" + state + "]")
  switch(packetId + "-" + state){
    case "0-login":
      let info = readString(dataToProcess, offset); 
      console.log(info.data)
      break
    //Encrypt https://minecraft.wiki/w/Java_Edition_protocol#Encryption_Request
    case "1-login":
      console.log("Received Encryption request.")
      const serverString = readString(dataToProcess, offset);
      const publicKey = readPrefixedArray(dataToProcess, serverString.new_offset);
      const verifyToken = readPrefixedArray(dataToProcess, publicKey.new_offset);
      const shouldAuthenticate = readBoolean(dataToProcess, verifyToken.new_offset);

      if(shouldAuthenticate.data){
        //https://minecraft.wiki/w/Protocol_encryption#Authentication
        console.log("Proceeding to authenticate as requested.")
        
        const pKey = crypto.createPublicKey({ key: publicKey.data, format: 'der', type: 'spki' })

        somePublicKey = pKey

        const sharedSecret = crypto.randomBytes(16)

        const sha1 = crypto.createHash("sha1")
        sha1.update(serverString.data, "ascii");
        sha1.update(sharedSecret)
        sha1.update(publicKey.data)

        const hashBuff = sha1.digest()

        let hashHex = hashBuff.toString("hex")
        let hashInt = BigInt('0x' + hashHex)

        const bytel = hashBuff.length;
        const maxValue = BigInt(2 ** (bytel * 8))
        if(hashInt >= maxValue / 2n){
          hashInt -= maxValue;
        }

        let resultHex = hashInt.toString(16)
        if(hashInt < 0){
          resultHex = '-' + resultHex.substring(1);
        }

        const reqData = {
          accessToken: account.token,
          selectedProfile: account.profile.id,
          serverId: resultHex
        }
                  
        

        const eSharedSecret = crypto.publicEncrypt({key: pKey, padding: crypto.constants.RSA_PKCS1_PADDING}, sharedSecret);
        const eVerifyToken = crypto.publicEncrypt({key: pKey, padding: crypto.constants.RSA_PKCS1_PADDING}, verifyToken.data);
        
        
        let packetToSend = Buffer.concat([
          writeVarInt(eSharedSecret.length),
          eSharedSecret,
          writeVarInt(eVerifyToken.length),
          eVerifyToken,
        ])

        //Auth to mojang
        postMojangAuthentication(reqData, eSharedSecret, eVerifyToken, packetToSend);


        cipher = crypto.createCipheriv('aes-128-cfb8', sharedSecret, sharedSecret);
        decipher = crypto.createDecipheriv('aes-128-cfb8', sharedSecret, sharedSecret);


      }

      break
    case "2-login":
      //https://minecraft.wiki/w/Java_Edition_protocol#Login_Success
      console.log("Logged in")
      sendAcknowledged()
      break
    case "3-login":
      const threshold = readVarInt(dataToProcess, offset)
      compressionTreshold = threshold.data;
      console.log("Threshold changed to " + compressionTreshold); 
      break
    
    case "1-configuration":
      const pluginIdentifier = readString(dataToProcess, offset)

      console.log("Plugin message from " + pluginIdentifier.data)
      //https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Plugin_channels
      break

    case "3-configuration":
      sendConfigurationEnd()
      break
    
    case "4-configuration":
      const random = readLong(dataToProcess, offset)
      sendConfigurationKeepAlive(random.data)
      break
    //Ping Pong non-vanilla servers
    case "5-configuration":
      const id = readInt(dataToProcess, offset)
      sendPong(id.data)
      break
    //Registries
    // https://minecraft.wiki/w/Java_Edition_protocol#Registry_Data_2
    case "7-configuration":
      const regIdentifier = readString(dataToProcess, offset);

      const arrLen = readVarInt(dataToProcess, regIdentifier.new_offset)

    
      break
    case "14-configuration":
      sendKnownPacks()  
      break
    
    //Disguised Chat Message
    case "29-play":
      console.log("Disguised!")
      //Nbt data either string or
      break
    case "38-play":
      const playAlive = readLong(dataToProcess, offset)
      sendPlayKeepAlive(playAlive.data)
      break
    //Player Chat Message
    case "58-play":
      console.log("Chat message received!")
      break
    case "64-play":
      console.log("Some update received!")
      break

    //Synchronize Player Position
    case "66-play":
      console.log("Synching position")
      break
    case "114-play":
      console.log("System chat")
      readTextComponent(dataToProcess, offset)
      break
    default:
      //console.log("Not handled " + state + " TYPE 0x" + dataToProcess[0].toString(16).padStart(2, '0'))
      
      
      break
  }
}

async function main(){
  await login()
  connect()
}

main()
