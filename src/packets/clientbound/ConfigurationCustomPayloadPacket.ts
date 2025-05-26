import { MinecraftBot } from "../..";
import { readProtocolString } from "../../nbt/readers/string";
import { Packet } from "../packet";

export class ConfigurationCustomPayloadPacket implements Packet{
  //https://minecraft.wiki/w/Java_Edition_protocol/Plugin_channels
  private channelId!: string;

  read(buffer: Buffer, offset: number): void {
    const packetChannel = readProtocolString(buffer, offset);
    
    //minecraft:brand 
    //minecraft:register
    this.channelId = packetChannel.data;

    /*
    if(packetChannel.data == "minecraft:register"){
      const extra = readProtocolString(buffer, packetChannel.new_offset)
    }
    */
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  handle(bot: MinecraftBot): void {
    
  }
}