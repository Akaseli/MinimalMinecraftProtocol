import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, ComponentType, Embed, EmbedBuilder, GatewayIntentBits, MessageFlags, TextChannel } from 'discord.js';
import { players } from '.';
//import { AddConnectionRequest, bot, HandleShopTranslation, HandleTranslation } from './bot';
//import { AddContainerEvent, ClaimContainer, GetMinecraft, GetWebhookUrl, IsConnected } from './database';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

export function StartDiscord(){
  client.on('ready', () => {
    console.log(`Discord is up!`);
  });

  client.on('interactionCreate', async interaction => {
    //CHAT COMMANDS
    if (interaction.isChatInputCommand()){
      /*
      //CONNECT
      if (interaction.commandName === 'connect') {
        let username: string = interaction.options.data[0].value?.toString() ?? "";
  
        if(bot.players[username]){
          //Check if minecraft account is already linked.
          const linkStatus = await IsConnected(bot.players[username].uuid, interaction.user.id);
  
          if(linkStatus){
            await interaction.reply("This discord or minecraft account is already linked!")
          }
          //Can connect.
          else{          
            let code = randomCodeGenerator();
            AddConnectionRequest(code, interaction, username);
  
            let expiration = Math.round(Date.now()/1000) + 300;
            await interaction.reply('Whisper this in game to Phoebot: ```/w PhoebotJr ' + code + '``` Expires <t:' + expiration + ':R>.');
          }
        }
        else{
          await interaction.reply("Please check the username or log in to connect your account.")
        }
       
      }

      if(interaction.commandName === 'chat'){
        let uuid = await GetMinecraft(interaction.user.id);
   
        if(uuid !== "<error>"){
           let username = (await (await fetch("https://api.minecraftservices.com/minecraft/profile/lookup/" + uuid)).json()).name;
           let message = (interaction.options.data[0].value?.toString() ?? "");
           let commmand = `/tellraw @a {\"text\": \"[DISCORD] <${username}> ${message}\"}`
           bot.chat(commmand)
           interaction.reply({content: "Success!", flags: MessageFlags.Ephemeral})
         }
         else{
           interaction.reply({content: "You need to link your discord to a minecraft account!", flags: MessageFlags.Ephemeral})
         }
      }
      */

      if(interaction.commandName === 'who'){
        let playerRecord = Object.values(players);

        const embed = new EmbedBuilder()
        .setTitle(`${playerRecord.length}/20 players online!`)
        .setColor("Blue")
        .setDescription(escapeMarkdown(playerRecord.join(", ")))

        interaction.reply({embeds: [embed]})
      }
    } 
  });


  client.login(process.env.DISCORD);
}
/*
export async function notifyAboutMail(id: string, coordinates: string){
  const user = await client.users.fetch(id)

  user.send("📬 The contents of you mailbox at **[" + coordinates + "]** have changed!")
}

export async function notifyAboutShop(id: string, coordinates: string, changes: Record<string, Record<string, number>>) {
  const user = await client.users.fetch(id)

  //changes = username (item name, amount) 

  const embed = new EmbedBuilder()
    .setTitle("🛒 Your shop at **[" + coordinates + "]** has had customers")
    .setColor("Blue")
    .setDescription("I saw the following transactions happen:")
    .setFooter({text: "Shops are checked every minute, if transaction seems wrong it may have been split into multiple messages due to timing."})

  for(const [player, value] of Object.entries(changes)){
    let field = "";

    
    for(const[item, quantity] of Object.entries(value)) {
      //Try as item first
      let name = HandleShopTranslation(item.replace(":", "."));

      let quantityFormatted = quantity >= 0 ? `+${quantity}` : `${quantity}`

      if(quantity != 0){
        field += `${quantityFormatted} ${name}\n`;
      }
    }

    embed.addFields({name: player, value: field, inline: false});
  }

  user.send({embeds: [embed]});
}

export async function notifyAboutShopWebhook(coordinates: string, changes: Record<string, Record<string, number>>){
  let coords = coordinates.replace(/ /g, "");
  
  const webhookUrl = await GetWebhookUrl(coords);

  if(webhookUrl !== ""){
    const embed = new EmbedBuilder()
      .setTitle("🛒 Your shop at **[" + coordinates + "]** has had customers")
      .setColor("Blue")
      .setDescription("I saw the following transactions happen:")
      .setFooter({text: "Shops are checked every minute, if transaction seems wrong it may have been split into multiple messages due to timing."})

    for(const [player, value] of Object.entries(changes)){
      let field = "";

      
      for(const[item, quantity] of Object.entries(value)) {
        //Try as item first
        let name = HandleShopTranslation(item.replace(":", "."));

        let quantityFormatted = quantity >= 0 ? `+${quantity}` : `${quantity}`

        if(quantity != 0){
          field += `${quantityFormatted} ${name}\n`;
        }
      }

      embed.addFields({name: player, value: field, inline: false});
    }

    fetch(webhookUrl, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify({embeds: [embed]})
    });

  }
}

export async function notifyAboutBrokenContainer(id: string, coordinates: string, type: string){
  const user = await client.users.fetch(id)

  user.send("Your " + type + " at **[" + coordinates + "]** seems to be missing or changed. I have stopped tracking it for you.")
}

export async function askUserForBox(id: string, boxes: number[][], uuid: string, isMail: boolean){
  const user = await client.users.fetch(id)

  let title = isMail ? "📪 Select which mailbox you want to add to your account." : "🛒 Select which shop you want to add to your account."

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(boxes.map((box, index) => `**${index + 1}:** [${box[0] + ", " + box[1] + ", " + box[2]}]`).join("\n"))
    .setColor("Blue");

  const buttons = boxes.map((_, index) =>
    new ButtonBuilder()
      .setCustomId(`box_${index}`)
      .setLabel(`${index + 1}`)
      .setStyle(ButtonStyle.Primary)
  );

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(0, 4));
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(4));

  const rows = [row1];
  //avoid discord error of empty rows
  if(buttons.length > 4){
    rows.push(row2);
  }

  const message = await user.send({embeds: [embed], components: rows})

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000 * 5 //5 minutes
  })

  collector.on("collect", async (interaction) => {
    const selectedIndex = parseInt(interaction.customId.replace("box_", ""), 10);
    let type = isMail ? 1 : 2;
    const response = await ClaimContainer(uuid, boxes[selectedIndex].slice(0, 3).toString(), type);

    if(response.status){
      AddContainerEvent(boxes[selectedIndex].slice(0, 3).toString(), {type: "container_claim", to: uuid});
      if(isMail){
        await interaction.reply({ content: `📪 Adding mailbox at **[${boxes[selectedIndex].slice(0, 3).join(", ")}]** to your account, you will be notified if someone puts items in this container.` });
      }
      else{
        await interaction.reply({ content: `🛒 Adding container at **[${boxes[selectedIndex].slice(0, 3).join(", ")}]** to your account, you will be about any future transactions.` });
      }
      
    }
    else{
      await interaction.reply({content: `🚨 ${response.error}`})
    }

    

    disableButtons(rows);
    await message.edit({ components: rows });
    
    collector.stop();
  })

  collector.on("end", () => {
    console.log("Interaction collector stopped.");

    disableButtons(rows);
    message.edit({ components: rows })
  });
}

function disableButtons(rows: ActionRowBuilder<ButtonBuilder>[]) {
  rows.forEach(row => {
    row.components.forEach(button => button.setDisabled(true));
  });
}

*/

export async function sendChatToChannel(cId: string, message: string){
  const channel = await client.channels.fetch(cId);
  const finalMessage = escapeMarkdown(message)

  if (channel && channel.isTextBased()) {
    (channel as TextChannel).send({content: finalMessage, allowedMentions: {parse: []}});
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_\[\]()~<>#{}+-.!])/g, '\\$1');
}

/*
function randomCodeGenerator(): string {
  let val = "";

  const length = 8;
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    let index = Math.floor(Math.random() * characters.length);
    val += characters.charAt(index)
  }

  return val;
}
*/