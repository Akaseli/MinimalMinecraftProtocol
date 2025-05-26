import { MinecraftBot } from "../..";
import { PackInfo } from "../../interfaces/PackInfo";
import { readProtocolString } from "../../nbt/readers/string";
import { readVarInt } from "../../nbt/readers/varInt";
import { Packet } from "../packet";

export class ConfigurationSelectKnownPacksPacket implements Packet{
  private packs: PackInfo[] = [];

  read(buffer: Buffer, offset: number): void {
    const packetArrayLength = readVarInt(buffer, offset);

    let packetArrayIndex = packetArrayLength.new_offset;

    for(let i = 0; i<packetArrayLength.data; i++){
      const packetNamespace = readProtocolString(buffer, packetArrayIndex);
      const packetId = readProtocolString(buffer, packetNamespace.new_offset);
      const packetVersion = readProtocolString(buffer, packetId.new_offset);

      packetArrayIndex = packetVersion.new_offset;

      this.packs.push({namespace: packetNamespace.data, id: packetId.data, version: packetVersion.data})
    }
  }
  handle(bot: MinecraftBot): void {
    this.packs.forEach((pack) => {
      const identifier = pack.namespace + ":" + pack.id

      bot.serverPacks[identifier] = pack.version;
    })
      
    bot.sendKnownPacks();
  }
  
}