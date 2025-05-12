import { NBT } from "../nbt";
import { TAG_Tag } from "../tags/TAG_Tag";
import { readString, writeString } from "./string";
import { readVarInt, writeVarInt } from "./varInt";

// https://minecraft.wiki/w/Java_Edition_protocol#Type:Text_Component
export function readTextComponent(buff: Buffer, offset: number): { data: string | NBT; offset: number } {
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

export function writeTextComponent(data: string|NBT): Buffer {
  if(typeof(data) == "string"){
    return Buffer.concat([writeVarInt(8), writeString(data)])
  }
  else{
    //TODO: Add the written Buffer of the NBT data + check if type is correct.
    return Buffer.concat([writeVarInt(10)])
  }
}
