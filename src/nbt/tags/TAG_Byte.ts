import { writeByte } from '../readers/byte';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Byte extends TAG_Tag{
  value: number;

  constructor(bytes: Buffer){
    super(bytes);
    
    this.value = bytes[TAG_Tag._index];
    TAG_Tag._index += 1;
  }

  toBuffer(): Buffer {
      return Buffer.concat([writeByte(1), writeString(this.name), writeByte(this.value)])
  }
}