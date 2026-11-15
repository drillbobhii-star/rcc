import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const required = ['DISCORD_BOT_TOKEN', 'DISCORD_APPLICATION_ID', 'DISCORD_GUILD_ID'];
const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length) {
  console.error('Faltan variables de entorno: ' + missing.join(', '));
  process.exit(1);
}

const command = new SlashCommandBuilder()
  .setName('rcc')
  .setDescription('Herramientas de administración y comunidad de RCC.')
  .addSubcommand((subcommand) => subcommand
    .setName('instruccion')
    .setDescription('Pídele a RCC Admin que gestione este servidor.')
    .addStringOption((option) => option
      .setName('texto')
      .setDescription('Qué quieres que haga RCC Admin.')
      .setRequired(true)
      .setMaxLength(1200)))
  .addSubcommand((subcommand) => subcommand
    .setName('anuncio')
    .setDescription('Genera un anuncio con los últimos commits y pide tu aprobación.'));

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

try {
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.DISCORD_APPLICATION_ID,
      process.env.DISCORD_GUILD_ID,
    ),
    { body: [command.toJSON()] },
  );
  console.log('Comando /rcc registrado correctamente en el servidor configurado.');
} catch (error) {
  console.error('No se pudo registrar /rcc. Revisa token, Application ID y Server ID.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
