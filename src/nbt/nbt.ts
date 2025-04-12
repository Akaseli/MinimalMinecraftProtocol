import {TAG_Compound} from './tags/TAG_Compound';
import { TAG_Tag } from './tags/TAG_Tag';

export class NBT {
  path: string;
  value: TAG_Compound;

  constructor(filepath: string, bytes: Uint8Array, root = false) {
    TAG_Tag._index = 0;
    this.path = filepath;
    this.value = new TAG_Compound(bytes, root)
  }
}