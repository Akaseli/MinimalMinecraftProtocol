import assert from "assert"
import test, { describe } from "node:test"
import zlib from "zlib";
import { NBT } from "../src/nbt/nbt";
import * as fs from 'fs';
import path from "path";
import { readBoolean, writeBoolean } from "../src/nbt/readers/boolean";
import { readByte, writeByte } from "../src/nbt/readers/byte";
import { readDouble, writeDouble } from "../src/nbt/readers/double";
import { readFloat, writeFloat } from "../src/nbt/readers/float";
import { readInt, writeInt } from "../src/nbt/readers/int";
import { readLong, writeLong } from "../src/nbt/readers/long";
import { readShort, writeShort } from "../src/nbt/readers/short";
import { readVarInt, writeVarInt } from "../src/nbt/readers/varInt";
import { readVarLong, writeVarLong } from "../src/nbt/readers/varLong";
import { readString, writeString } from "../src/nbt/readers/string";

const doubleDeviation = 1e-12;
const floatDeviation = 1e-6;

describe('nbt files', () => {
  test('test.nbt', () => {
    const stats = fs.statSync(path.join(__dirname + "/files/test.nbt"));
  
    fs.open(path.join(__dirname + "/files/test.nbt"), 'r', (error, fd) => {
      if (error) {
        return;
      }
      
      let buffer = Buffer.alloc(stats.size);

      fs.read(fd, buffer, 0, stats.size, 0, (error, bytes) => {
      });

      const bytes = zlib.unzipSync(buffer);

      const data = new NBT("test.nbt", bytes)

      assert.strictEqual(data.value.name, "hello world")
      assert.strictEqual(data.value.value[0].name, "name")
      assert.strictEqual(data.value.value[0].value, "Bananrama")
    });
  })

  test('bigtest.nbt', () => {
    const stats = fs.statSync(path.join(__dirname + "/files/bigtest.nbt"));
  
    fs.open(path.join(__dirname + "/files/bigtest.nbt"), 'r', (error, fd) => {
      if (error) {
        return;
      }
      
      let buffer = Buffer.alloc(stats.size);

      fs.read(fd, buffer, 0, stats.size, 0, (error, bytes) => {
      });

      const bytes = zlib.unzipSync(buffer);

      const data = new NBT("bigtest.nbt", bytes)

      assert.strictEqual(data.value.name, "Level")
      assert.strictEqual(data.value.value.length, 11)
    });
  })
})

describe('nbt variable writes', () => {
  test('boolean', () => {
    const write = writeBoolean(false);

    const readValue = readBoolean(write, 0);

    assert.strictEqual(readValue.data, false);
  })

  test('byte', () => {
    const write = writeByte(-128);

    const readValue = readByte(write, 0);

    assert.strictEqual(readValue.data, -128);
  })

  test('double', () => {
    const write = writeDouble(3.1415926);

    const readValue = readDouble(write, 0);

    assert(Math.abs(3.1415926 - readValue.data) < doubleDeviation);
  })

  test('float', () => {
    const write = writeFloat(2.718281);

    const readValue = readFloat(write, 0);

    assert(Math.abs(2.718281 - readValue.data) < floatDeviation);
  })

  test('int', () => {
    const write = writeInt(1335133513);

    const readValue = readInt(write, 0);

    assert.strictEqual(readValue.data, 1335133513);
  })

  test('long', () => {
    const write = writeLong(-9223372036854775808n)

    const readValue = readLong(write, 0);

    assert.strictEqual(readValue.data, -9223372036854775808n);
  })

  test('short', () => {
    const write = writeShort(-32768)

    const readValue = readShort(write, 0)

    assert.strictEqual(readValue.data, -32768);
  })

  test('varint', () => {
    const write = writeVarInt(-413357)

    const readValue = readVarInt(write, 0);

    assert.strictEqual(readValue.data, -413357);
  })

  test('varlong', () => {
    const write = writeVarLong(-9223372036854775808n)

    const readValue = readVarLong(write, 0);

    assert.strictEqual(readValue.data, -9223372036854775808n);
  })

  test('string', () => {
    const testString = "Hello world! abcdefghijklmnopqrstuvwxyzåäö";
    const write = writeString(testString)

    const readValue = readString(write, 0);

    assert.strictEqual(readValue.data, testString)
  })
})