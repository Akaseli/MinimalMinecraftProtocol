import { readByte, writeByte } from '../readers/byte';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Byte extends TAG_Tag{
  declare value: number;

  static fromBuffer(bytes: Buffer): TAG_Byte {
    const name = TAG_Tag.readName(bytes);
    
    const res = readByte(bytes, TAG_Tag._index);
    TAG_Tag._index = res.new_offset;

    return new TAG_Byte(name, res.data)
  }
  toBuffer(): Buffer {
      return Buffer.concat([writeByte(1), writeString(this.name), writeByte(this.value)])
  }
}