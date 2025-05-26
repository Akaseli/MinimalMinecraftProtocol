import { readString } from '../readers/string';

export abstract class TAG_Tag {
  name: string;
  value: unknown;

  static _index = 0;

  constructor(name: string, value: unknown) {
    this.name = name;
    this.value = value;
  }

  abstract toBuffer(): Buffer;

  static readName(bytes: Buffer, root = false): string {
    TAG_Tag._index += 1;
    if (!root) {
      const res = readString(bytes, TAG_Tag._index);
      TAG_Tag._index = res.new_offset;
      return res.data;
    } else {
      return 'root';
    }
  }
}
