require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startReminderLoop } = require('./services/reminder');
const deployCommands = require('./deploy-commands');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
  console.log(`Loaded command: /${command.data.name}`);
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  client.on(event.name, (...args) => event.execute(...args, client));
  console.log(`Loaded event: ${event.name}`);
}

// Ready
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guild(s)`);

  // Start reminder loop
  startReminderLoop(client);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  const { stopReminderLoop } = require('./services/reminder');
  stopReminderLoop();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  const { stopReminderLoop } = require('./services/reminder');
  stopReminderLoop();
  client.destroy();
  process.exit(0);
});

// Deploy slash commands then start the bot
deployCommands()
  .then(() => client.login(process.env.DISCORD_TOKEN))
  .catch((err) => {
    console.error('Failed to deploy commands:', err);
    process.exit(1);
  });
