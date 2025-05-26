import { MinecraftBot, NBT, TAG_Tag } from "../..";
import { RegistryEntry } from "../../interfaces/RegistryEntry";
import { readBoolean } from "../../nbt/readers/boolean";
import { readProtocolString } from "../../nbt/readers/string";
import { readVarInt } from "../../nbt/readers/varInt";
import { Packet } from "../packet";

export class ConfigurationRegistryDataPacket implements Packet{
  private registryId!: string;
  private data: RegistryEntry[] = [];
  
  //https://minecraft.wiki/w/Java_Edition_protocol/Registry_data
  read(buffer: Buffer, offset: number): void {
    const regIdentifier = readProtocolString(buffer, offset);

    const arrLen = readVarInt(buffer, regIdentifier.new_offset);

    let arrayOffset = arrLen.new_offset;
    for(let i = 0; i<arrLen.data; i++){
      const identifier = readProtocolString(buffer, arrayOffset)

      const hasNBT = readBoolean(buffer, identifier.new_offset)

      //Not really tested, couldn't find an example, similar approach does work in reading text component NBT. 
      if(hasNBT.data){
        const nbtStart = buffer.slice(offset);

         const customNbt = NBT.fromBuffer(nbtStart, true);

         arrayOffset = TAG_Tag._index;

         this.data.push({identifier: identifier.data, nbt: customNbt})
      }
      else{
        arrayOffset = hasNBT.new_offset

        this.data.push({identifier: identifier.data})
      }

    }

    this.registryId = regIdentifier.data;
  }

  handle(bot: MinecraftBot): void {
    bot.registry[this.registryId] = this.data;
  }
}