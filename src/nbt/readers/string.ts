import { readVarInt, writeVarInt } from "./varInt";

export function readString(buff: Buffer, offset: number): { data: string; new_offset: number } {
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

export function writeString(value: string): Buffer {
  const textBuffer = Buffer.from(value, "utf-8");
  const lengthBuffer = writeVarInt(textBuffer.length);

  return Buffer.concat([lengthBuffer, textBuffer]);
}