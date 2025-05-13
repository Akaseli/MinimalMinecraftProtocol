import { writeByte } from '../readers/byte';
import { readDouble, writeDouble } from '../readers/double';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Double extends TAG_Tag{
  value: number;

  constructor(bytes: Buffer){
    super(bytes);
    
    const res = readDouble(bytes, TAG_Tag._index);

    this.value = res.data;
    TAG_Tag._index = res.new_offset;
  }

  toBuffer(): Buffer {
      return Buffer.concat([writeByte(6), writeString(this.name), writeDouble(this.value)])
  }
}