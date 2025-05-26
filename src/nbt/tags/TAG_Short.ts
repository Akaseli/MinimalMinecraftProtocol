import { writeByte } from '../readers/byte';
import { readShort, writeShort } from '../readers/short';
import { writeString } from '../readers/string';
import { TAG_Tag } from './TAG_Tag';

export class TAG_Short extends TAG_Tag {
  declare value: number;

  static fromBuffer(bytes: Buffer): TAG_Short {
    const name = TAG_Tag.readName(bytes);

    const res = readShort(bytes, TAG_Tag._index);
    TAG_Tag._index = res.new_offset;

    return new TAG_Short(name, res.data);
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      writeByte(2),
      writeString(this.name),
      writeShort(this.value),
    ]);
  }
}
