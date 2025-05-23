import { MinecraftBot, NBT } from "../..";
import { readBoolean } from "../../nbt/readers/boolean";
import { readTextComponent } from "../../nbt/readers/text_component";
import { readVarInt } from "../../nbt/readers/varInt";
import { Packet } from "../packet";

export class PlayDisguisedChatPacket implements Packet{
  private message!: string | NBT;
  private chatType!: number;
  private senderName!: string | NBT;
  private targetName?: string | NBT;

  read(buffer: Buffer, offset: number): void {
    const packetMessage = readTextComponent(buffer, offset)
    const packetChatType = readVarInt(buffer, packetMessage.offset);
    const packetSenderName = readTextComponent(buffer, packetChatType.new_offset);
    
    const hasTarget = readBoolean(buffer, packetSenderName.offset);

    
    if(hasTarget.data){
      const packetTargetName = readTextComponent(buffer, hasTarget.new_offset);

      this.targetName = packetTargetName.data;
    }

    this.message = packetMessage.data;
    this.chatType = packetChatType.data;
    this.senderName = packetSenderName.data;
  }
  
  handle(bot: MinecraftBot): void {
    const channel = bot.registry["minecraft:chat_type"][this.chatType - 1].identifier;

    if(channel == "minecraft:say_command"){
      //Probably could just pass the channel in this event instead of limiting.
      bot.emit("disguised_chat", this.senderName, this.message)
    }
  }

}