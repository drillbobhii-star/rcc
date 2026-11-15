import http from "node:http";
import crypto from "node:crypto";
import OpenAI from "openai";

const PORT = Number(process.env.PORT || 3000);
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";
const ALLOWED_GUILD_ID = process.env.DISCORD_GUILD_ID || null;
const MAX_BODY_BYTES = 1024 * 1024;

const pendingActions = new Map();
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function jsonResponse(res, status, data) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function textResponse(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("El cuerpo de la solicitud es demasiado grande.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function verifyDiscordSignature(rawBody, signatureHex, timestamp) {
  if (!PUBLIC_KEY || !signatureHex || !timestamp) return false;
  if (!/^[0-9a-f]{128}$/i.test(signatureHex)) return false;
  if (!/^[0-9a-f]{64}$/i.test(PUBLIC_KEY)) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;
  if (Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([SPKI_ED25519_PREFIX, Buffer.from(PUBLIC_KEY, "hex")]),
      format: "der",
      type: "spki"
    });
    return crypto.verify(
      null,
      Buffer.concat([Buffer.from(timestamp, "utf8"), rawBody]),
      key,
      Buffer.from(signatureHex, "hex")
    );
  } catch {
    return false;
  }
}

function discordHeaders() {
  if (!BOT_TOKEN) throw new Error("Falta configurar DISCORD_BOT_TOKEN en el hosting.");
  return {
    Authorization: "Bot " + BOT_TOKEN,
    "Content-Type": "application/json"
  };
}

async function discordApi(path, options = {}) {
  const response = await fetch("https://discord.com/api/v10" + path, {
    method: options.method || "GET",
    headers: discordHeaders(),
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = { message: raw }; }
  }
  if (!response.ok) {
    const detail = data && data.message ? data.message : "Error de Discord";
    throw new Error("Discord API " + response.status + ": " + detail);
  }
  return data;
}

function userIdOf(interaction) {
  return interaction.member?.user?.id || interaction.user?.id || null;
}

function userCanManageGuild(interaction) {
  const permissions = interaction.member?.permissions;
  if (!permissions) return false;
  try {
    const bits = BigInt(permissions);
    const ADMINISTRATOR = 1n << 3n;
    const MANAGE_GUILD = 1n << 5n;
    return (bits & (ADMINISTRATOR | MANAGE_GUILD)) !== 0n;
  } catch {
    return false;
  }
}

function validateGuild(interaction) {
  if (!interaction.guild_id) throw new Error("Usa RCC Admin dentro de un servidor, no por mensaje privado.");
  if (ALLOWED_GUILD_ID && interaction.guild_id !== ALLOWED_GUILD_ID) {
    throw new Error("RCC Admin no está autorizado para administrar este servidor.");
  }
  if (!userCanManageGuild(interaction)) {
    throw new Error("Necesitas el permiso Gestionar servidor o Administrador para usar RCC Admin.");
  }
  if (!APPLICATION_ID || !BOT_TOKEN || !PUBLIC_KEY) {
    throw new Error("Falta completar la configuración de Discord en las variables del hosting.");
  }
  if (!ALLOWED_GUILD_ID) {
    throw new Error("Falta configurar DISCORD_GUILD_ID para limitar RCC Admin a tu servidor.");
  }
}

async function getGuildChannels(guildId) {
  const channels = await discordApi("/guilds/" + guildId + "/channels");
  return Array.isArray(channels) ? channels : [];
}

function safeChannelName(value) {
  if (typeof value !== "string") throw new Error("El nombre del canal no es válido.");
  const name = value.trim().toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9áéíóúñ_-]/gi, "")
    .replace(/-+/g, "-")
    .slice(0, 90);
  if (!name) throw new Error("El nombre del canal está vacío o no es válido.");
  return name;
}

function findGuildChannel(channels, id) {
  const channel = channels.find((item) => item.id === id);
  if (!channel) throw new Error("No encontré ese canal dentro del servidor autorizado.");
  return channel;
}

const toolDefinitions = [
  {
    type: "function",
    name: "list_channels",
    description: "Muestra los canales y categorías actuales del servidor.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "create_category",
    description: "Crea una categoría nueva en el servidor.",
    strict: true,
    parameters: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "create_text_channel",
    description: "Crea un canal de texto. parent_id debe ser el ID de una categoría existente o null.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        topic: { type: ["string", "null"] },
        parent_id: { type: ["string", "null"] }
      },
      required: ["name", "topic", "parent_id"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "rename_channel",
    description: "Cambia el nombre de un canal existente. Usa el ID de la lista de canales proporcionada.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        channel_id: { type: "string" },
        new_name: { type: "string" }
      },
      required: ["channel_id", "new_name"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "delete_channel",
    description: "Solicita borrar un canal existente. El usuario siempre tendrá que confirmar antes de borrarlo.",
    strict: true,
    parameters: {
      type: "object",
      properties: { channel_id: { type: "string" } },
      required: ["channel_id"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "send_announcement",
    description: "Prepara un anuncio en un canal de texto. Nunca se publica sin la confirmación del usuario.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        channel_id: { type: "string" },
        content: { type: "string" }
      },
      required: ["channel_id", "content"],
      additionalProperties: false
    }
  }
];

const SYSTEM_INSTRUCTIONS = [
  "Eres RCC Admin, un asistente de administración de servidores Discord. Responde en español.",
  "Solo puedes ejecutar las funciones que aparecen en la lista de herramientas. No inventes capacidades ni IDs.",
  "El usuario actual tiene permiso de gestionar el servidor. Aun así, nunca intentes saltarte los límites de Discord.",
  "Usa la lista de canales incluida en cada solicitud para identificar el canal correcto.",
  "No uses menciones @everyone, @here ni menciones de usuarios en anuncios. Las menciones están desactivadas por el servidor.",
  "Borrar canales y publicar anuncios siempre requieren aprobación manual mediante los botones de confirmación.",
  "Si la petición es ambigua, pregunta antes de ejecutar una herramienta. Si una función no está disponible, explícalo sin fingir que la realizaste.",
  "No cambies roles ni expulses o banees miembros: esas funciones aún no están implementadas."
].join(" ");

async function executeAction(guildId, actionName, args) {
  const channels = await getGuildChannels(guildId);

  if (actionName === "list_channels") {
    return channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parent_id: channel.parent_id || null
    }));
  }

  if (actionName === "create_category") {
    const name = safeChannelName(args.name);
    const created = await discordApi("/guilds/" + guildId + "/channels", {
      method: "POST",
      body: { name, type: 4 }
    });
    return "Categoría creada: " + created.name;
  }

  if (actionName === "create_text_channel") {
    const name = safeChannelName(args.name);
    const body = { name, type: 0 };
    if (typeof args.topic === "string" && args.topic.trim()) {
      body.topic = args.topic.trim().slice(0, 1024);
    }
    if (args.parent_id) {
      const parent = findGuildChannel(channels, args.parent_id);
      if (parent.type !== 4) throw new Error("La categoría indicada no es una categoría.");
      body.parent_id = parent.id;
    }
    const created = await discordApi("/guilds/" + guildId + "/channels", {
      method: "POST",
      body
    });
    return "Canal creado: #" + created.name;
  }

  if (actionName === "rename_channel") {
    const channel = findGuildChannel(channels, args.channel_id);
    const newName = safeChannelName(args.new_name);
    const updated = await discordApi("/channels/" + channel.id, {
      method: "PATCH",
      body: { name: newName }
    });
    return "Canal renombrado a #" + updated.name;
  }

  if (actionName === "delete_channel") {
    const channel = findGuildChannel(channels, args.channel_id);
    await discordApi("/channels/" + channel.id, { method: "DELETE" });
    return "Canal eliminado: #" + channel.name;
  }

  if (actionName === "send_announcement") {
    const channel = findGuildChannel(channels, args.channel_id);
    if (channel.type !== 0 && channel.type !== 5) {
      throw new Error("El destino debe ser un canal de texto o de anuncios.");
    }
    const content = typeof args.content === "string" ? args.content.trim() : "";
    if (!content || content.length > 2000) {
      throw new Error("El anuncio debe tener entre 1 y 2000 caracteres.");
    }
    await discordApi("/channels/" + channel.id + "/messages", {
      method: "POST",
      body: {
        content,
        allowed_mentions: { parse: [] }
      }
    });
    return "Anuncio publicado en #" + channel.name;
  }

  throw new Error("La acción solicitada no está permitida.");
}

function actionRequiresApproval(actionName) {
  return actionName === "delete_channel" || actionName === "send_announcement";
}

function actionDescription(actionName, args, channels) {
  if (actionName === "delete_channel") {
    const channel = channels.find((item) => item.id === args.channel_id);
    return "Borrar el canal #" + (channel?.name || args.channel_id);
  }
  if (actionName === "send_announcement") {
    const channel = channels.find((item) => item.id === args.channel_id);
    return "Publicar este anuncio en #" + (channel?.name || args.channel_id) + ":\n" + args.content;
  }
  return "Ejecutar la acción " + actionName;
}

async function askOpenAI(guildId, requestText) {
  if (!OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY. Añade tu clave de OpenAI en las variables del hosting; no la pegues en Discord ni en el código.");
  }

  const channels = await getGuildChannels(guildId);
  const channelContext = channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parent_id: channel.parent_id || null
  }));

  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const response = await client.responses.create({
    model: OPENAI_MODEL,
    instructions: SYSTEM_INSTRUCTIONS,
    input: "Solicitud del administrador:\n" + requestText +
      "\n\nCanales actuales del servidor (usa estos IDs exactos):\n" +
      JSON.stringify(channelContext)
  ,
    tools: toolDefinitions,
    tool_choice: "auto",
    parallel_tool_calls: false
  });

  const functionCall = (response.output || []).find((item) => item.type === "function_call");
  if (!functionCall) {
    return { text: response.output_text || "No pude interpretar la solicitud. Prueba explicándola de otra forma." };
  }

  let args;
  try {
    args = JSON.parse(functionCall.arguments || "{}");
  } catch {
    throw new Error("La IA devolvió una acción con argumentos inválidos; no se hizo ningún cambio.");
  }

  const actionName = functionCall.name;
  if (!toolDefinitions.some((tool) => tool.name === actionName)) {
    throw new Error("La IA solicitó una acción que no está autorizada.");
  }

  if (actionRequiresApproval(actionName)) {
    const description = actionDescription(actionName, args, channels);
    return {
      confirmation: true,
      actionName,
      args,
      description
    };
  }

  const result = await executeAction(guildId, actionName, args);
  return { text: typeof result === "string" ? result : JSON.stringify(result, null, 2) };
}

async function editOriginalResponse(applicationId, token, payload) {
  const response = await fetch(
    "https://discord.com/api/v10/webhooks/" + applicationId + "/" + token + "/messages/@original",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        allowed_mentions: { parse: [] }
      })
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("No pude actualizar la respuesta de Discord: " + response.status + " " + detail);
  }
}

async function processRccCommand(interaction) {
  const option = (interaction.data.options || []).find((item) => item.name === "solicitud");
  const requestText = option?.value;
  if (typeof requestText !== "string" || !requestText.trim()) {
    await editOriginalResponse(APPLICATION_ID, interaction.token, {
      content: "Escribe lo que necesitas después del comando /rcc."
    });
    return;
  }

  try {
    validateGuild(interaction);
    const result = await askOpenAI(interaction.guild_id, requestText.trim());

    if (result.confirmation) {
      const pendingId = crypto.randomUUID();
      pendingActions.set(pendingId, {
        guildId: interaction.guild_id,
        userId: userIdOf(interaction),
        actionName: result.actionName,
        args: result.args,
        expiresAt: Date.now() + 5 * 60 * 1000
      });

      await editOriginalResponse(APPLICATION_ID, interaction.token, {
        content: "Necesito tu aprobación antes de continuar.\n\n" + result.description,
        components: [{
          type: 1,
          components: [
            { type: 2, style: 3, label: "Confirmar", custom_id: "rcc:approve:" + pendingId },
            { type: 2, style: 4, label: "Cancelar", custom_id: "rcc:cancel:" + pendingId }
          ]
        }]
      });
      return;
    }

    await editOriginalResponse(APPLICATION_ID, interaction.token, {
      content: result.text.slice(0, 1900)
    });
  } catch (error) {
    console.error("Error al procesar /rcc:", error);
    await editOriginalResponse(APPLICATION_ID, interaction.token, {
      content: "No pude completar la solicitud: " + String(error.message || error).slice(0, 1500)
    }).catch((editError) => console.error("Error al enviar el mensaje de error:", editError));
  }
}

async function processApproval(interaction, customId) {
  const parts = customId.split(":");
  const decision = parts[1];
  const pendingId = parts[2];
  const pending = pendingActions.get(pendingId);

  if (!pending) {
    await editOriginalResponse(APPLICATION_ID, interaction.token, {
      content: "Esta solicitud ya no está disponible o ha caducado.",
      components: []
    });
    return;
  }

  if (pending.userId !== userIdOf(interaction)) {
    await editOriginalResponse(APPLICATION_ID, interaction.token, {
      content: "Solo la persona que solicitó esta acción puede aprobarla.",
      components: []
    });
    return;
  }

  if (pending.guildId !== interaction.guild_id || (ALLOWED_GUILD_ID && pending.guildId !== ALLOWED_GUILD_ID)) {
    await editOriginalResponse(APPLICATION_ID, interaction.token, {
      content: "El servidor no coincide con la solicitud original.",
      components: []
    });
    pendingActions.delete(pendingId);
    return;
  }

  pendingActions.delete(pendingId);

  if (decision === "cancel") {
    await editOriginalResponse(APPLICATION_ID, interaction.token, {
      content: "Acción cancelada. No se realizó ningún cambio.",
      components: []
    });
    return;
  }

  if (decision !== "approve") {
    await editOriginalResponse(APPLICATION_ID, interaction.token, {
      content: "Decisión no reconocida.",
      components: []
    });
    return;
  }

  try {
    validateGuild(interaction);
    const result = await executeAction(pending.guildId, pending.actionName, pending.args);
    await editOriginalResponse(APPLICATION_ID, interaction.token, {
      content: "Aprobado. " + String(result).slice(0, 1700),
      components: []
    });
  } catch (error) {
    await editOriginalResponse(APPLICATION_ID, interaction.token, {
      content: "No pude ejecutar la acción: " + String(error.message || error).slice(0, 1500),
      components: []
    });
  }
}

async function handleInteraction(interaction, res) {
  if (interaction.type === 1) {
    jsonResponse(res, 200, { type: 1 });
    return;
  }

  if (interaction.type === 2 && interaction.data?.name === "rcc") {
    jsonResponse(res, 200, { type: 5, data: { flags: 64 } });
    void processRccCommand(interaction);
    return;
  }

  if (interaction.type === 3 && typeof interaction.data?.custom_id === "string") {
    const customId = interaction.data.custom_id;
    if (customId.startsWith("rcc:approve:") || customId.startsWith("rcc:cancel:")) {
      jsonResponse(res, 200, { type: 5, data: { flags: 64 } });
      void processApproval(interaction, customId);
      return;
    }
  }

  jsonResponse(res, 200, {
    type: 4,
    data: { content: "No reconozco esa interacción.", flags: 64 }
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    jsonResponse(res, 200, { ok: true, service: "RCC Admin", version: "0.1.0" });
    return;
  }

  if (req.method !== "POST" || req.url !== "/interactions") {
    textResponse(res, 404, "Not found");
    return;
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    textResponse(res, error.statusCode || 400, error.message);
    return;
  }

  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  if (!verifyDiscordSignature(rawBody, signature, timestamp)) {
    textResponse(res, 401, "Invalid request signature");
    return;
  }

  let interaction;
  try {
    interaction = JSON.parse(rawBody.toString("utf8"));
  } catch {
    textResponse(res, 400, "Invalid JSON");
    return;
  }

  await handleInteraction(interaction, res);
});

server.listen(PORT, () => {
  console.log("RCC Admin escuchando en el puerto " + PORT);
  if (process.env.REGISTER_COMMANDS_ON_START === "true") {
    import("../scripts/register-commands.js").catch((error) => {
      console.error("No pude registrar /rcc automáticamente:", error);
    });
  }
});
