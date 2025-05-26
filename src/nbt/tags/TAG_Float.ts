import { writeByte } from '../readers/byte';
import { readFloat, writeFloat } from '../readers/float';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Float extends TAG_Tag{
  declare value: number;

  constructor(name: string, value: number){
    super(name, value);
  }

  static fromBuffer(bytes: Buffer): TAG_Float {
    const name = TAG_Tag.readName(bytes);
    
    const res = readFloat(bytes, TAG_Tag._index);
    TAG_Tag._index = res.new_offset;

    return new TAG_Float(name, res.data)
  }

  toBuffer(): Buffer {
      return Buffer.concat([writeByte(5), writeString(this.name), writeFloat(this.value)])
  }
}