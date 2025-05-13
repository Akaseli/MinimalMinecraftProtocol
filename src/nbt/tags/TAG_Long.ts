import { writeByte } from '../readers/byte';
import { readLong, writeLong } from '../readers/long';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Long extends TAG_Tag{
  value: bigint;

  constructor(bytes: Buffer){
    super(bytes);
    
    const res = readLong(bytes, TAG_Tag._index);
    this.value = res.data;
    TAG_Tag._index = res.new_offset;
  }

  toBuffer(): Buffer {
      return Buffer.concat([writeByte(4), writeString(this.name), writeLong(this.value)])
  }
}