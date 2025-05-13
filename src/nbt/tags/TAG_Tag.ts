import { readString } from "../readers/string";

export abstract class TAG_Tag{
  name:string;
  value: any;
  
  static _index: number = 0;

  constructor(bytes:Buffer, root = false){
    TAG_Tag._index += 1;
    if(!root){
      const res = readString(bytes, (TAG_Tag._index));
      this.name = res.data;
      TAG_Tag._index = res.new_offset;
    }
    else{
      this.name = "root"
    }
  }

  abstract toBuffer(): Buffer;
}