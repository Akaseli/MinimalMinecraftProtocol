export function writeUUID(value: string): Buffer {
  const cleanedUuid = value.replace(/-/g, "");

  return Buffer.from(cleanedUuid, "hex");
}

export function readUUID(buff: Buffer, offset: number): { data: Buffer; new_offset: number } {
  const uuid = buff.slice(offset, offset + 16);

  return { data: uuid, new_offset: offset + 16 };
}
