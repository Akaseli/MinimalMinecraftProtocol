import { NBT } from "../nbt";
import { TAG_Tag } from "../tags/TAG_Tag";
import { readString } from "./string";
import { readVarInt } from "./varInt";

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
