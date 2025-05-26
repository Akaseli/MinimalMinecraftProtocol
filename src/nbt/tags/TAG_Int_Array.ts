import { writeByte } from '../readers/byte';
import { readInt, writeInt } from '../readers/int';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Int_Array extends TAG_Tag{
  declare value: number[];
  length!: number;

  constructor(name: string, value: number[]){
    super(name, value);
    this.length = value.length
  }

  static fromBuffer(bytes: Buffer): TAG_Int_Array {
    const name = TAG_Tag.readName(bytes);
    
    const res = readInt(bytes, TAG_Tag._index);
    TAG_Tag._index = res.new_offset;

    let value = [];
    for (let i = 0; i < res.data; i++) {
      const val = readInt(bytes, TAG_Tag._index)

      value.push(val.data);
      TAG_Tag._index = val.new_offset
    }

    return new TAG_Int_Array(name, value)
  }
  
  toBuffer(): Buffer {
    let values: Buffer[] = [];

    this.value.forEach((num) => {
      values.push(writeInt(num))
    })

    return Buffer.concat([writeByte(11), writeString(this.name), writeInt(this.length), ...values])
  }
}