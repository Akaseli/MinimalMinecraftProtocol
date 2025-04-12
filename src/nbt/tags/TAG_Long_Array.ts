import {TAG_Tag} from './TAG_Tag';
import * as reader from "../utilities/readers";

export class TAG_Long_Array extends TAG_Tag{
  value: BigInt[];
  lenght: BigInt;

  constructor(bytes: Uint8Array){
    super(bytes);
    
    this.lenght = reader.readInt(bytes);

    var value = [];
    for (let i = 0; i < this.lenght.valueOf(); i++) {
      value.push(reader.readLong(bytes));
    }

    this.value = value;
  }
}