import { readShort } from '../readers/short';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Short extends TAG_Tag{
  value: number;

  constructor(bytes: Buffer){
    super(bytes);

    const res = readShort(bytes, TAG_Tag._index);

    this.value = res.data;
    TAG_Tag._index = res.new_offset;
  }
}