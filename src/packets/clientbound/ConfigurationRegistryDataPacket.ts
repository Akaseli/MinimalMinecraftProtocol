import { MinecraftBot } from "../..";
import { readProtocolString } from "../../nbt/readers/string";
import { readVarInt } from "../../nbt/readers/varInt";
import { Packet } from "../packet";

export class ConfigurationRegistryDataPacket implements Packet{
  read(buffer: Buffer, offset: number): void {
    // TODO needs to be implemented properly for future features.
    // https://minecraft.wiki/w/Java_Edition_protocol/Registry_data
    const regIdentifier = readProtocolString(buffer, offset);

    const arrLen = readVarInt(buffer, regIdentifier.new_offset);
  }

  handle(bot: MinecraftBot): void {
    
  }
}