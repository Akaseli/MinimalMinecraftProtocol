import { MinecraftBot } from "../..";
import { readProtocolString } from "../../nbt/readers/string";
import { Packet } from "../packet";

export class ConfigurationCustomPayloadPacket implements Packet{
  read(buffer: Buffer, offset: number): void {
    //TODO needs to be properly implemented for some planned features
    //https://minecraft.wiki/w/Java_Edition_protocol/Plugin_channels
    const pluginIdentifier = readProtocolString(buffer, offset);
    
  }

  handle(bot: MinecraftBot): void {
    
  }
}