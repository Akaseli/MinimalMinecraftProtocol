import { TextDecoder } from "util";
import { TAG_Tag } from "./tags/TAG_Tag";

//2 Bytes
export function readShort(bytes: any): BigInt {
  var byteSection = bytes.slice(TAG_Tag._index, TAG_Tag._index + 2);
  TAG_Tag._index += 2;


  var value = BigInt(0);

  for (var i = 0; i <= byteSection.length - 1; i++) {
    value = (value * BigInt(256)) + BigInt(byteSection[i]);
  }

  return value;
}

//4 Bytes

/**
 * Reads 4 bytes from the index returning the value and new index.
 * @param bytes List of UInt8
 * @returns a list containing the output.
 */
export function readInt(bytes: any): BigInt{
  var byteSection = bytes.slice(TAG_Tag._index, TAG_Tag._index + 4);
  TAG_Tag._index += 4;

  var value = BigInt(0);

  for (var i = 0; i <= byteSection.length - 1; i++) {
    value = (value * BigInt(256)) + BigInt(byteSection[i]);
  }

  return value;
}

//8 Bytes
export function readLong(bytes: any): BigInt {
  var byteSection = bytes.slice(TAG_Tag._index, TAG_Tag._index + 8);
  TAG_Tag._index += 8;

  var value = BigInt(0);

  for (var i = 0; i <= byteSection.length - 1; i++) {
    value = (value * BigInt(256)) + BigInt(byteSection[i]);
  }

  return value;
}

//4 bytes
export function readFloat(bytes: any): number {
  var buf = new ArrayBuffer(4);
  var view = new DataView(buf);

  var byteSection = bytes.slice(TAG_Tag._index, TAG_Tag._index + 4);

  byteSection.forEach((b: any, i: any) => {
    view.setUint8(i, b);
  });

  TAG_Tag._index += 4;

  return view.getFloat32(0);
}

//8 Bytes
export function readDouble(bytes: any): number {
  var buf = new ArrayBuffer(8);
  var view = new DataView(buf);

  var byteSection = bytes.slice(TAG_Tag._index, TAG_Tag._index + 8);

  byteSection.forEach((b: any, i: any) => {
    view.setUint8(i, b);
  });

  TAG_Tag._index += 8;

  return view.getFloat64(0);
}

export function readString(bytes: any): string {
  var valueLenght = bytes[TAG_Tag._index + 1];
  TAG_Tag._index += 2;

  var valueSection = bytes.slice(TAG_Tag._index, TAG_Tag._index + valueLenght);
  var valueString = new TextDecoder("utf-8").decode(valueSection);

  TAG_Tag._index += valueLenght;

  return valueString;
}