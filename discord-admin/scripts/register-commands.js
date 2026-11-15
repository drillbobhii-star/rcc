const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!applicationId || !botToken) {
  console.error("Faltan DISCORD_APPLICATION_ID o DISCORD_BOT_TOKEN.");
  process.exit(1);
}

const commands = [
  {
    name: "rcc",
    description: "Pide a RCC Admin que te ayude a administrar este servidor",
    type: 1,
    options: [{
      type: 3, name: "solicitud",
      description: "Describe en español lo que quieres que haga",
      required: true, max_length: 1000
    }]
  },
  {
    name: "hablar",
    description: "Habla con RCC sin ejecutar acciones administrativas",
    type: 1,
    options: [{
      type: 3, name: "mensaje",
      description: "Escribe tu mensaje para RCC",
      required: true, max_length: 1500
    }]
  }
];

const route = guildId
  ? "https://discord.com/api/v10/applications/" + applicationId + "/guilds/" + guildId + "/commands"
  : "https://discord.com/api/v10/applications/" + applicationId + "/commands";

const response = await fetch(route, {
  method: "PUT",
  headers: {
    Authorization: "Bot " + botToken,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(commands)
});

const responseText = await response.text();
if (!response.ok) {
  console.error("Discord rechazó el registro de comandos:", response.status, responseText);
  process.exit(1);
}

console.log(guildId
  ? "Comandos /rcc y /hablar registrados para el servidor configurado."
  : "Comandos /rcc y /hablar registrados globalmente. La propagación global puede tardar.");
