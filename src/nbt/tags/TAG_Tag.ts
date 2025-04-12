import * as reader from "../utilities/readers";

export class TAG_Tag{
  name:string;
  value: any;
  
  static _index: number = 0;

  constructor(bytes:Uint8Array, root = false){
    TAG_Tag._index += 1;
    if(!root){
      this.name = reader.readString(bytes);
    }
    else{
      this.name = "root"
    }
  }
}