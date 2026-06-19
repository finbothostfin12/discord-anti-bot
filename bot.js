const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// Track image spam per user: { userId: { channelId: count } }
const imageTracker = new Map();

// Config
const IMAGE_THRESHOLD = 3;   // more than 3 images
const CHANNEL_THRESHOLD = 2; // in more than 2 channels
const TRACK_WINDOW_MS = 60 * 1000; // 1 minute rolling window

// Clean up old tracker entries after the window expires
function scheduleCleanup(userId) {
  setTimeout(() => {
    imageTracker.delete(userId);
  }, TRACK_WINDOW_MS);
}

client.once('ready', () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // Ignore bots and DMs
  if (message.author.bot) return;
  if (!message.guild) return;

  const member = message.member;
  if (!member) return;

  // Skip admins and users with Administrator permission
  if (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ManageGuild)
  ) {
    return;
  }

  // Check if message contains images/attachments
  const hasImages = message.attachments.some((att) => {
    const contentType = att.contentType || '';
    return contentType.startsWith('image/');
  });

  // Also detect image embeds (linked images)
  const hasImageEmbeds = message.embeds.some(
    (embed) => embed.image || embed.thumbnail
  );

  if (!hasImages && !hasImageEmbeds) return;

  const userId = message.author.id;
  const channelId = message.channel.id;

  // Initialize tracker for this user if not exists
  if (!imageTracker.has(userId)) {
    imageTracker.set(userId, new Map());
    scheduleCleanup(userId);
  }

  const userChannels = imageTracker.get(userId);

  // Count images in this channel
  const currentCount = userChannels.get(channelId) || 0;
  userChannels.set(channelId, currentCount + 1);

  // Count how many channels this user has sent images in
  const channelsWithImages = [...userChannels.entries()].filter(
    ([, count]) => count >= IMAGE_THRESHOLD
  );

  console.log(
    `📊 [${message.author.tag}] Channel ${channelId}: ${currentCount + 1} images | Channels over threshold: ${channelsWithImages.length}`
  );

  // Check if threshold is breached
  if (channelsWithImages.length > CHANNEL_THRESHOLD) {
    console.log(
      `🚨 Botted account detected: ${message.author.tag} (${userId})`
    );

    try {
      // Notify the channel before kicking
      await message.channel.send(
        `🚨 **Anti-Bot Action:** <@${userId}> has been automatically kicked for suspected bot behavior (mass image spamming across multiple channels).`
      );

      // Kick the user
      await member.kick('Auto-kick: Suspected bot — mass image spam across multiple channels.');

      console.log(`✅ Kicked user: ${message.author.tag}`);

      // Clean up tracker entry immediately
      imageTracker.delete(userId);
    } catch (err) {
      console.error(`❌ Failed to kick ${message.author.tag}:`, err.message);

      if (err.code === 50013) {
        await message.channel.send(
          `⚠️ I detected a suspected bot (<@${userId}>) but I don't have permission to kick them. Please check my role hierarchy.`
        );
      }
    }
  }
});

// Login with your bot token
const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ Missing DISCORD_BOT_TOKEN environment variable.');
  process.exit(1);
}

client.login(TOKEN);
