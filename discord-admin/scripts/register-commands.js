const applicationId = process.env.DISCORD_APPLICATION_ID?.trim();
const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();
const forceGlobal = process.argv.includes("--global");

if (!applicationId || !botToken) {
  throw new Error("Faltan DISCORD_APPLICATION_ID o DISCORD_BOT_TOKEN en las variables de Railway.");
}
if (!/^\d{17,20}$/.test(applicationId)) {
  throw new Error("DISCORD_APPLICATION_ID no tiene un formato válido.");
}
if (!forceGlobal && guildId && !/^\d{17,20}$/.test(guildId)) {
  throw new Error("DISCORD_GUILD_ID no tiene un formato válido.");
}

const commands = [
  {
    name: "rcc",
    description: "Pide a RCC Admin que te ayude a administrar este servidor",
    type: 1,
    options: [
      {
        type: 1,
        name: "solicitud",
        description: "Escribe una petición para que RCC Admin la resuelva",
        options: [
          {
            type: 3,
            name: "texto",
            description: "Describe en español lo que quieres que haga",
            required: true,
            max_length: 1000
          },
          {
            type: 11,
            name: "archivo",
            description: "Adjunta una imagen, audio, PDF, DOCX, ZIP o archivo de texto",
            required: false
          }
        ]
      },
      {
        type: 1,
        name: "instruccion",
        description: "Compatibilidad con el subcomando anterior",
        options: [
          {
            type: 3,
            name: "solicitud",
            description: "Describe en español lo que quieres que haga",
            required: true,
            max_length: 1000
          },
          {
            type: 11,
            name: "archivo",
            description: "Adjunta un archivo compatible",
            required: false
          }
        ]
      },
      {
        type: 1,
        name: "anuncio",
        description: "Genera un anuncio con los últimos cambios y pide tu aprobación"
      }
    ]
  }
];

const api = "https://discord.com/api/v10";
const headers = {
  Authorization: "Bot " + botToken,
  "Content-Type": "application/json"
};

// Confirm that the token belongs to the application whose commands are being edited.
const meResponse = await fetch(api + "/users/@me", { headers, signal: AbortSignal.timeout(15000) });
const meText = await meResponse.text();
let me;
try { me = meText ? JSON.parse(meText) : null; } catch { me = null; }
if (!meResponse.ok) {
  throw new Error("No pude validar DISCORD_BOT_TOKEN: HTTP " + meResponse.status + " " + meText);
}
if (me?.id !== applicationId) {
  throw new Error("DISCORD_APPLICATION_ID (" + applicationId + ") no coincide con el ID del bot autenticado (" + me?.id + "). Revisa las variables de Railway.");
}

const useGuildCommands = !forceGlobal && Boolean(guildId);
const route = useGuildCommands
  ? "/applications/" + applicationId + "/guilds/" + guildId + "/commands"
  : "/applications/" + applicationId + "/commands";

console.log("[Discord Commands] Sincronizando " + commands.map(command => "/" + command.name).join(", ") +
  (useGuildCommands ? " en el servidor " + guildId + "..." : " globalmente..."));

const response = await fetch(api + route, {
  method: "PUT",
  headers,
  body: JSON.stringify(commands),
  signal: AbortSignal.timeout(20000)
});
const responseText = await response.text();
let registered;
try { registered = responseText ? JSON.parse(responseText) : []; } catch { registered = null; }

if (!response.ok) {
  throw new Error("Discord rechazó el registro de comandos: HTTP " + response.status + " " + responseText);
}
if (!Array.isArray(registered) || !registered.some(command => command.name === "rcc")) {
  throw new Error("Discord respondió correctamente, pero no confirmó el comando /rcc.");
}

console.log("[Discord Commands] Registro confirmado: " +
  registered.map(command => "/" + command.name + (command.options?.length ? " (" + command.options.map(option => option.name).join(", ") + ")" : "")).join(", "));
if (!useGuildCommands) {
  console.warn("[Discord Commands] Registro GLOBAL. Discord puede tardar un tiempo en propagar los cambios; usa DISCORD_GUILD_ID para sincronización inmediata en tu servidor.");
}
