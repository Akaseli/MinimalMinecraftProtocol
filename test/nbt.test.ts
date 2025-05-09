import assert from "assert"
import test, { describe } from "node:test"
import zlib from "zlib";
import { NBT } from "../src/nbt/nbt";
import * as fs from 'fs';
import path from "path";

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
