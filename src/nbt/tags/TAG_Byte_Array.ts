import {TAG_Tag} from './TAG_Tag';
import * as reader from "../utilities/readers";

export class TAG_Byte_Array extends TAG_Tag{
  value: number[];
  lenght: BigInt;

  constructor(bytes: Uint8Array){
    super(bytes);
    
    this.lenght = reader.readInt(bytes);

    var value = [];
    for (let i = 0; i < this.lenght.valueOf(); i++) {
      value.push(bytes[TAG_Tag._index]);
      TAG_Tag._index += 1;
    }

    this.value = value;
  }
}