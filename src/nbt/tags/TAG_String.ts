import { writeByte } from '../readers/byte';
import { readString, writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_String extends TAG_Tag{
  value: string;

  constructor(bytes: Buffer){
    super(bytes);
    
    const res = readString(bytes, (TAG_Tag._index));
    
    this.value = res.data;
    TAG_Tag._index = res.new_offset;
  }

  toBuffer(): Buffer {
      return Buffer.concat([writeByte(8), writeString(this.name), writeString(this.value)])
  }
}