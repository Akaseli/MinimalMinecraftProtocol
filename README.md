A Minecraft protocol implementation for version 1.21.6. Goal of this project is to implement the minecraft protocol ignoring chunks, entities and other graphical elements. Mainly suitable for accounts that are operators on the server and can get to spectator mode.

Information that is avaivable currently:
- World border information
- Map (item) information
- Chat (player, disguised, system and whispers)
- Custom payloads (Communication with mods)

For an example of how these can be used see [Minecraft Bot](https://github.com/Akaseli/MinecraftBot)

> [!WARNING]
> There are projects that are more stable than this and support multiple minecraft versions. Updates and changes on this project might break your bots / remove support for older minecraft versions.
> 
> For now I am not trying to implement stuff that is missing, instead adding handling for new packets when my bots need them.
