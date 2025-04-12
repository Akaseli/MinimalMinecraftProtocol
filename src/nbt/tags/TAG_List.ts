import { TAG_Tag } from './TAG_Tag';
import {TAG_String} from './TAG_String';
import {TAG_Short} from './TAG_Short';
import {TAG_Int} from './TAG_Int';
import {TAG_Long} from './TAG_Long'
import {TAG_Float} from './TAG_Float'
import {TAG_Double} from './TAG_Double'
import {TAG_Compound} from './TAG_Compound'
import * as reader from "../utilities/readers";

export class TAG_List extends TAG_Tag {
  value: Array<any>;
  type: number;
  lenght: BigInt;

  constructor(bytes: Uint8Array) {
    super(bytes);

    this.type = bytes[TAG_Tag._index];
    TAG_Tag._index += 1;

    this.lenght = reader.readInt(bytes);


    var value = [];
    for (let i = 0; i < this.lenght.valueOf(); i++) {
      switch (this.type) {
        //BYTE
        case 1:
          value.push(bytes[TAG_Tag._index]);
          TAG_Tag._index += 1;
          break;
        //SHORT
        case 2:
          value.push(reader.readShort(bytes));
          break
        //INT
        case 3:
          value.push(reader.readInt(bytes));
          break;
        //LONG
        case 4:
          value.push(reader.readLong(bytes));
          break;
        //FLOAT
        case 5:
          value.push(reader.readFloat(bytes));
          break;
        //DOUBLE
        case 6:
          value.push(reader.readDouble(bytes));
          break;
        //STRING
        case 8:
          value.push(reader.readString(bytes));
          break;
        //COMPOUND
        case 10:
          var cValue: Array<TAG_Tag> = [];

          //Cannot be its own reader due to class references - has to stay here
          while (bytes[TAG_Tag._index] != 0) {
            switch (bytes[TAG_Tag._index]) {
              case 0:
                TAG_Tag._index += 1;
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
              case 8:
                cValue.push(new TAG_String(bytes));
                break;
              case 10:
                cValue.push(new TAG_Compound(bytes));
                TAG_Tag._index += 1;
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