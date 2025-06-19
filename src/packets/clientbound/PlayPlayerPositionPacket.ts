import {
  MinecraftBot,
  readDouble,
  readFloat,
  readInt,
  readVarInt,
} from '../..';
import { Packet } from '../packet';
import { S_PlayAcceptTeleportationPacket } from '../serverbound/S_PlayAcceptTeleportationPacket';

export class PlayPlayerPositionPacket implements Packet {
  private teleportId!: number;
  private x!: number;
  private y!: number;
  private z!: number;
  private velocityX!: number;
  private velocityY!: number;
  private velocityZ!: number;
  private yaw!: number;
  private pitch!: number;
  private flags!: number;

  read(buffer: Buffer, offset: number): void {
    const pTeleport = readVarInt(buffer, offset);
    const pX = readDouble(buffer, pTeleport.new_offset);
    const pY = readDouble(buffer, pX.new_offset);
    const pZ = readDouble(buffer, pY.new_offset);

    const pVelX = readDouble(buffer, pZ.new_offset);
    const pVelY = readDouble(buffer, pVelX.new_offset);
    const pVelZ = readDouble(buffer, pVelY.new_offset);

    const pYaw = readFloat(buffer, pVelZ.new_offset);
    const pPitch = readFloat(buffer, pYaw.new_offset);

    const pFlags = readInt(buffer, pPitch.new_offset);

    this.teleportId = pTeleport.data;
    this.x = pX.data;
    this.y = pY.data;
    this.z = pZ.data;
    this.velocityX = pVelX.data;
    this.velocityY = pVelY.data;
    this.velocityZ = pVelZ.data;
    this.yaw = pYaw.data;
    this.pitch = pPitch.data;
    this.flags = pFlags.data;
  }

  handle(bot: MinecraftBot): void {
    const confirm = new S_PlayAcceptTeleportationPacket(this.teleportId);

    bot.sendPacket(confirm);
  }
}
