import { writeByte } from '../readers/byte';
import { readString, writeString } from '../readers/string';
import { TAG_Tag } from './TAG_Tag';

export class TAG_String extends TAG_Tag {
  declare value: string;

  static fromBuffer(bytes: Buffer): TAG_String {
    const name = TAG_Tag.readName(bytes);

    const res = readString(bytes, TAG_Tag._index);
    TAG_Tag._index = res.new_offset;

    return new TAG_String(name, res.data);
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      writeByte(8),
      writeString(this.name),
      writeString(this.value),
    ]);
  }
}
