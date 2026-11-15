const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!applicationId || !botToken) {
  console.error("Faltan DISCORD_APPLICATION_ID o DISCORD_BOT_TOKEN.");
  process.exit(1);
}

const command = {
  name: "rcc",
  description: "Pide a RCC Admin que te ayude a administrar este servidor",
  type: 1,
  options: [
    {
      type: 1,
      name: "instruccion",
      description: "Pide a RCC Admin que gestione el servidor",
      options: [
        {
          type: 3,
          name: "solicitud",
          description: "Describe en español lo que quieres que haga",
          required: true,
          max_length: 1000
        }
      ]
    },
    {
      type: 1,
      name: "anuncio",
      description: "Genera un anuncio con los últimos commits y pide tu aprobación"
    }
  ]
};

const route = guildId
  ? "https://discord.com/api/v10/applications/" + applicationId + "/guilds/" + guildId + "/commands"
  : "https://discord.com/api/v10/applications/" + applicationId + "/commands";

const response = await fetch(route, {
  method: "PUT",
  headers: {
    Authorization: "Bot " + botToken,
    "Content-Type": "application/json"
  },
  body: JSON.stringify([command])
});

const responseText = await response.text();
if (!response.ok) {
  console.error("Discord rechazó el registro de comandos:", response.status, responseText);
  process.exit(1);
}

console.log(guildId
  ? "Comando /rcc registrado para el servidor configurado."
  : "Comando /rcc registrado globalmente. La propagación global puede tardar.");
