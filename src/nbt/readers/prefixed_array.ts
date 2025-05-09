import { readVarInt } from "./varInt";

export function readPrefixedArray(buff: Buffer, offset: number): { data: Buffer; new_offset: number } {
  const length = readVarInt(buff, offset);
  const data = buff.slice(length.new_offset, length.new_offset + length.data);

  return { data: data, new_offset: length.new_offset + length.data };
}
