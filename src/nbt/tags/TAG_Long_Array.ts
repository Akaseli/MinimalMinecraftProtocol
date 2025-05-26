import { writeByte } from '../readers/byte';
import { readInt, writeInt } from '../readers/int';
import { readLong, writeLong } from '../readers/long';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';
export class TAG_Long_Array extends TAG_Tag{
  declare value: bigint[];
  length!: number;

  constructor(name: string, value: bigint[]){
    super(name, value);
    this.length = value.length
  }

  static fromBuffer(bytes: Buffer): TAG_Long_Array {
    const name = TAG_Tag.readName(bytes);
    
    const res = readInt(bytes, TAG_Tag._index);
    TAG_Tag._index = res.new_offset;

    let value = [];
    for (let i = 0; i < res.data; i++) {
      const val = readLong(bytes, TAG_Tag._index)

      value.push(val.data);
      TAG_Tag._index = val.new_offset
    }

    return new TAG_Long_Array(name, value)
  }
  
  toBuffer(): Buffer {
    let values: Buffer[] = [];

    this.value.forEach((num) => {
      values.push(writeLong(num))
    })

    return Buffer.concat([writeByte(12), writeString(this.name), writeInt(this.length), ...values])
  }
}