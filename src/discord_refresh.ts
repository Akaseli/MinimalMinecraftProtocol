
import { REST, Routes } from 'discord.js';

// the broader type 1 = chat input, 2 = user right click, 3 = message right click
// context 0 = GUILD, 1 = BOT_DM, 2 = PRIVATE_CHANNEl
// options type 3=string

const commands = [
  {
    options: [
      {
        type: 3,
        name: 'account',
        description: 'Name of your minecraft account.',
        required: true,
      }
    ],
    name: 'connect',
    description: 'Connect your discord account to your minecraft account',
    type: 1,
    contexts: [1]
  }
]

const guildCommands = [
  {
    options: [
      {
        type: 3,
        name: 'message',
        description: 'Your message.',
        required: true,
      }
    ],
    name: 'chat',
    description: 'Sends a message to the server',
    type: 1,
    contexts: [0]
  },
  {
    name: 'who',
    description: 'Lists people on the server.',
    type: 1,
    contexts: [0]
  },
]

export async function refreshDiscord(){
  if(!process.env.DISCORD) return;
  if(!process.env.DCLIENT) return;
  

  const rest = new REST().setToken(process.env.DISCORD);


  rest.put(Routes.applicationGuildCommands(process.env.DCLIENT, "519971669406646297"), { body: [] })
	.then(() => console.log('Successfully deleted all application commands.'))
	.catch(console.error);

  try {
    console.log('Started refreshing application (/) commands.');
  
    await rest.put(Routes.applicationCommands(process.env.DCLIENT), { body: commands });

    //Guild specific command
    if(process.env.PUBLICDISCORDID){
      await rest.put(Routes.applicationGuildCommands(process.env.DCLIENT, process.env.PUBLICDISCORDID), {body: guildCommands})
    }
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}