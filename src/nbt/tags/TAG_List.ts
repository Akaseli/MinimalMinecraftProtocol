import { TAG_Tag } from './TAG_Tag';
import {TAG_String} from './TAG_String';
import {TAG_Short} from './TAG_Short';
import {TAG_Int} from './TAG_Int';
import {TAG_Long} from './TAG_Long'
import {TAG_Float} from './TAG_Float'
import {TAG_Double} from './TAG_Double'
import {TAG_Compound} from './TAG_Compound'
import { TAG_Long_Array } from './TAG_Long_Array';
import { TAG_Int_Array } from './TAG_Int_Array';
import { TAG_Byte_Array } from './TAG_Byte_Array';
import { TAG_Byte } from './TAG_Byte';
import { readInt } from '../readers/int';
import { readShort } from '../readers/short';
import { readLong } from '../readers/long';
import { readFloat } from '../readers/float';
import { readDouble } from '../readers/double';
import { readString } from '../readers/string';

export class TAG_List extends TAG_Tag {
  value: Array<any>;
  type: number;
  lenght: number;

  constructor(bytes: Buffer) {
    super(bytes);

    this.type = bytes[TAG_Tag._index];
    TAG_Tag._index += 1;

    const res = readInt(bytes, TAG_Tag._index);
    this.lenght = res.data;
    TAG_Tag._index = res.new_offset;


    var value = [];
    for (let i = 0; i < this.lenght; i++) {
      switch (this.type) {
        //BYTE
        case 1:
          value.push(bytes[TAG_Tag._index]);
          TAG_Tag._index += 1;
          break;
        //SHORT
        case 2:
          let res1 = readShort(bytes, TAG_Tag._index)
          value.push(res1.data)
          TAG_Tag._index = res1.new_offset;
          break
        //INT
        case 3:
          let res2 = readInt(bytes, TAG_Tag._index)
          value.push(res2.data)
          TAG_Tag._index = res2.new_offset;
          break;
        //LONG
        case 4:
          let res3 = readLong(bytes, TAG_Tag._index)
          value.push(res3.data)
          TAG_Tag._index = res3.new_offset;
          break;
        //FLOAT
        case 5:
          let res4 = readFloat(bytes, TAG_Tag._index)
          value.push(res4.data)
          TAG_Tag._index = res4.new_offset;
          break;
        //DOUBLE
        case 6:
          let res5 = readDouble(bytes, TAG_Tag._index)
          value.push(res5.data)
          TAG_Tag._index = res5.new_offset;
          break;
        //STRING
        case 8:
          let res6 = readString(bytes, (TAG_Tag._index + 1))
          value.push(res6.data)
          TAG_Tag._index = res6.new_offset;
          break;
        //COMPOUND
        case 10:
          var cValue: Array<TAG_Tag> = [];

          //Cant remember what I was thinking years ago, probably can be removed / made more clean
          while (bytes[TAG_Tag._index] != 0) {
            switch (bytes[TAG_Tag._index]) {
              case 0:
                TAG_Tag._index += 1;
                break;
              case 1:
                cValue.push(new TAG_Byte(bytes));
                break;
              case 2:
                cValue.push(new TAG_Short(bytes));
                break;
              case 3:
                cValue.push(new TAG_Int(bytes));
                break;
              case 4:
                cValue.push(new TAG_Long(bytes));
                break;
              case 5:
                cValue.push(new TAG_Float(bytes));
                break;
              case 6:
                cValue.push(new TAG_Double(bytes));
                break;
              case 7:
                cValue.push(new TAG_Byte_Array(bytes));
                break;
              case 8:
                cValue.push(new TAG_String(bytes));
                break;
              case 9:
                cValue.push(new TAG_List(bytes));
                break;
              case 10:
                cValue.push(new TAG_Compound(bytes));
                TAG_Tag._index += 1;
                break;
              case 11:
                cValue.push(new TAG_Int_Array(bytes));
                break;
              case 12:
                cValue.push(new TAG_Long_Array(bytes));
                break;        

              default:
                console.log("Missing case for " + bytes[TAG_Tag._index])
                TAG_Tag._index = bytes.length - 1
            }

          }
          TAG_Tag._index += 1;
          value.push(cValue);
          break;

        default:
          console.log("MISSING TYPE " + this.type)
          break;
      }
    }

    this.value = value;
  }
}