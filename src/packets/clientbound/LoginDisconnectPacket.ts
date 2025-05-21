import { MinecraftBot } from "../..";
import { readProtocolString } from "../../nbt/readers/string";
import { Packet } from "../packet";

export class LoginDisconnectPacket implements Packet{
  private reason!: string;

  read(buffer: Buffer, offset: number): void {
    let packetReason = readProtocolString(buffer, offset);
    
    this.reason = packetReason.data;
  }

  handle(bot: MinecraftBot): void {
    console.log("Bot got disconnected with reason: " + this.reason)
  }

}