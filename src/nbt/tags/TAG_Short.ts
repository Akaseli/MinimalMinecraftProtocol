import { writeByte } from '../readers/byte';
import { readShort, writeShort } from '../readers/short';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Short extends TAG_Tag{
  value: number;

  constructor(bytes: Buffer){
    super(bytes);

    const res = readShort(bytes, TAG_Tag._index);

    this.value = res.data;
    TAG_Tag._index = res.new_offset;
  }

  toBuffer(): Buffer {
      return Buffer.concat([writeByte(2), writeString(this.name), writeShort(this.value)])
  }
}