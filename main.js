//everything is cat girl themed

const { Client, GatewayIntentBits, EmbedBuilder, Events, REST, Routes, SlashCommandBuilder, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits, Collection } = require('discord.js');
const axios = require('axios');
const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const TOKEN = 'Your dsocrd token here'; 
const CEREBRAS_API_KEY = 'get your api from https://cloud.cerebras.ai/'; 

const TARGET_GUILD_ID = 'Put your discord servers id here'; 
const LOG_CHANNEL_ID = 'Put your channel id to log all the events happening'; 
const DROP_CHANNEL_ID = 'Put the channel id where the games would happen'; 

const VIP_ROLE_ID = 'Put the role id of a role named VIP'; 
const TUFF_ROLE_ID = 'Put the role id of a role named TUFF';
const GIVEAWAY_TIMEOUT_ROLE_ID = 'Put the role id of a role named Giveaway_Timeout';

const PORT = 3000; //the localhost port for the control panel
const TOTEM_GIF_URL = "https://media.tenor.com/5FZwKh3mFH4AAAAj/totem-of-undying-faked-death.gif";

// Whitelisted User (Immune to automated moderation)
const WHITELISTED_USER_ID = 'Put the discord user id of people whom you want to be immune by the bot';

// ECONOMY CONSTANTS
const TOTEM_COST = 150, ARMOR_COST = 100, VIP_COST = 300, TUFF_COST = 400, UNIQUE_CRATE_COST = 500, ENCHANT_COST = 30, VILLAGER_COST = 150, BUCKET_COST = 50, GOLEM_COST = 120;
const UNIQUE_ITEMS = ['🚫 Barrier Block', '🧱 Bedrock', '🥚 Dragon Egg', '🦋 Elytra', '🔲 Netherite Block', '🌟 Nether Star', '🐲 Dragon Head', '👁️ Eye of Ender'];

// Database Initialization
const db = new Database('moderation.sqlite');

/**
 * DATABASE MIGRATIONS
 */
function runMigrations() {
    db.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, strikes INTEGER DEFAULT 0, racism_strikes INTEGER DEFAULT 0, items INTEGER DEFAULT 0, shields INTEGER DEFAULT 0, xp INTEGER DEFAULT 0, last_daily INTEGER DEFAULT 0)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, item_name TEXT)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS user_armor (unique_id TEXT PRIMARY KEY, user_id TEXT, durability INTEGER DEFAULT 3)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS black_market (id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id TEXT, seller_name TEXT, item_name TEXT, price INTEGER)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS temp_roles (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, role_id TEXT, old_nickname TEXT, expires_at INTEGER)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS server_members (id TEXT PRIMARY KEY, roles TEXT, last_seen DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS message_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, username TEXT, channel_id TEXT, content TEXT, toxicity_score INTEGER DEFAULT 0, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS game_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, username TEXT, game_type TEXT, outcome TEXT, amount INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS invites (id INTEGER PRIMARY KEY AUTOINCREMENT, inviter_id TEXT, invited_id TEXT, invited_username TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();

    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const cols = tableInfo.map(c => c.name);
    
    if (!cols.includes('last_trivia')) db.prepare("ALTER TABLE users ADD COLUMN last_trivia INTEGER DEFAULT 0").run();
    if (!cols.includes('last_mine')) db.prepare("ALTER TABLE users ADD COLUMN last_mine INTEGER DEFAULT 0").run();
    if (!cols.includes('last_fish')) db.prepare("ALTER TABLE users ADD COLUMN last_fish INTEGER DEFAULT 0").run();
    if (!cols.includes('fortune_lvl')) db.prepare("ALTER TABLE users ADD COLUMN fortune_lvl INTEGER DEFAULT 0").run();
    if (!cols.includes('unbreaking_lvl')) db.prepare("ALTER TABLE users ADD COLUMN unbreaking_lvl INTEGER DEFAULT 0").run();
    if (!cols.includes('mending_active')) db.prepare("ALTER TABLE users ADD COLUMN mending_active INTEGER DEFAULT 0").run();
    if (!cols.includes('total_mined')) db.prepare("ALTER TABLE users ADD COLUMN total_mined INTEGER DEFAULT 0").run();
    if (!cols.includes('total_griefed')) db.prepare("ALTER TABLE users ADD COLUMN total_griefed INTEGER DEFAULT 0").run();
    if (!cols.includes('wither_kills')) db.prepare("ALTER TABLE users ADD COLUMN wither_kills INTEGER DEFAULT 0").run();
    if (!cols.includes('villagers')) db.prepare("ALTER TABLE users ADD COLUMN villagers INTEGER DEFAULT 0").run();
    if (!cols.includes('last_claim')) db.prepare("ALTER TABLE users ADD COLUMN last_claim INTEGER DEFAULT 0").run();
    if (!cols.includes('bounty')) db.prepare("ALTER TABLE users ADD COLUMN bounty INTEGER DEFAULT 0").run();
    if (!cols.includes('admin_cooldown_until')) db.prepare("ALTER TABLE users ADD COLUMN admin_cooldown_until INTEGER DEFAULT 0").run();
    
    console.log("Database synchronized");
}

runMigrations();

/**
 * GLOBAL HELPERS
 */
const webLogs = [];
let isModActive = true, isAIActive = true;
let globalBlessingUntil = 0;
let activeBoss = null;
const inviteCache = new Collection(); 

const BANNED_WORDS = [
    'fuck', 'fucker', 'fucking', 'fck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy', 'slut', 'whore', 'retard', 'faggot', 'motherfucker', 'cock', 'porn', 'hentai', 'nudes',
    'سكس', 'طيز', 'شرج', 'لعق', 'لحس', 'مص', 'تمص', 'بيضان', 'ثدي', 'بز', 'بزاز', 'حلمة', 'مفلقسة', 'بظر', 'فرج', 'شهوة', 'شاذ', 'مبادل', 'عاهرة', 'جماع', 'قضيب', 'زب', 'لوطي', 'لوااط', 'سحاق', 'سحاقية', 'اгتاساب', 'خنثي', 'احتлам', 'نيك', 'متناك', 'متناكة', 'شرموطة', 'عرص', 'خول', 'قحبة', 'لبوة',
    'aand', 'balatkar', 'behen chod', 'beti chod', 'bhadva', 'bhootni ke', 'bhosad', 'bhosadi ke', 'chakke', 'chinaal', 'chinki', 'chod', 'chodu', 'chooche', 'choochi', 'choot', 'chootiya', 'gaand', 'gandu', 'harami', 'hijra', 'jhant', 'kamine', 'kanjar', 'kutta', 'kuttiya', 'loda', 'lodu', 'lund', 'maa ki chut', 'madarchod', 'mutthal', 'raand', 'randi', 'saala', 'tatte', 'tatti', 'tharki'
];
const SENSITIVE_TOPICS = ['indian', 'black', 'chinese', 'asian', 'white', 'mexican', 'african', 'nigger', 'negro', 'chink', 'paki', 'beaner', 'monkey', 'curry'];
const RACISM_TIMEOUT_MS = 43200000; 
const STANDARD_TIMEOUT_MS = 3600000; 

function getUser(userId, username = "Unknown") {
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) { db.prepare('INSERT INTO users (id, username, total_mined, total_griefed, wither_kills, villagers, last_claim, bounty) VALUES (?, ?, 0, 0, 0, 0, 0, 0)').run(userId, username); return db.prepare('SELECT * FROM users WHERE id = ?').get(userId); }
    if (username !== "Unknown" && user.username !== username) db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, userId);
    return user;
}

function updateEmeralds(userId, amount) { db.prepare('UPDATE users SET items = MAX(0, items + ?) WHERE id = ?').run(amount, userId); }
function updateXP(userId, amount) { db.prepare('UPDATE users SET xp = CASE WHEN xp + ? < 0 THEN 0 ELSE xp + ? END WHERE id = ?').run(amount, amount, userId); }
function updateTotems(userId, amount) { db.prepare('UPDATE users SET shields = shields + ? WHERE id = ?').run(amount, userId); }
function addInventoryItem(userId, itemName) { db.prepare('INSERT INTO inventory (user_id, item_name) VALUES (?, ?)').run(userId, itemName); }
function removeInventoryItem(userId, itemName) {
    const row = db.prepare('SELECT id FROM inventory WHERE user_id = ? AND item_name = ? LIMIT 1').get(userId, itemName);
    if (row) db.prepare('DELETE FROM inventory WHERE id = ?').run(row.id);
    return !!row;
}
function hasItemCount(userId, itemName) { return db.prepare('SELECT COUNT(*) as count FROM inventory WHERE user_id = ? AND item_name = ?').get(userId, itemName).count; }
function hasItem(userId, itemName) { return !!db.prepare('SELECT id FROM inventory WHERE user_id = ? AND item_name = ? LIMIT 1').get(userId, itemName); }

function incrementStrikes(userId, username, type = 'standard') {
    getUser(userId, username); 
    const col = type === 'racism' ? 'racism_strikes' : 'strikes';
    db.prepare(`UPDATE users SET ${col} = ${col} + 1 WHERE id = ?`).run(userId);
    return db.prepare(`SELECT ${col} FROM users WHERE id = ?`).get(userId)[col];
}

function resetStrikes(userId, type = 'standard') {
    const col = type === 'racism' ? 'racism_strikes' : 'strikes';
    db.prepare(`UPDATE users SET ${col} = 0 WHERE id = ?`).run(userId);
}

function addWebLog(t, u, d) { webLogs.unshift({ timestamp: new Date().toLocaleTimeString(), type: t, user: u, detail: d }); if (webLogs.length > 20) webLogs.pop(); }

/**
 * SYSTEM HELPERS: LOGS & TOTEMS 
 */
async function sendToLogs(title, description, color = 0x3b82f6) {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (!channel) return;
    const embed = new EmbedBuilder().setTitle(`🐾 Kitty Log: ${title}`).setDescription(description).setColor(color).setTimestamp();
    await channel.send({ embeds: [embed] }).catch(() => {});
}

async function attemptTotemUse(userId, channel) {
    const fresh = db.prepare('SELECT shields FROM users WHERE id = ?').get(userId);
    if (fresh && fresh.shields > 0) {
        db.prepare('UPDATE users SET shields = shields - 1 WHERE id = ?').run(userId);
        try {
            const popMsg = await channel.send({ 
                content: `✨ **SHATTER NYA~!** <@${userId}>'s **Totem of Undying** was triggered! Escape punishment mew!`, 
                files: [TOTEM_GIF_URL] 
            });
            await sendToLogs("Totem Shattered mew!", `<@${userId}> consumed a Totem nya~!`, 0xfacc15);
            setTimeout(() => popMsg.delete().catch(() => {}), 3000);
        } catch (e) {}
        return true;
    }
    return false;
}

/**
 * BOT CLIENT
 */
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildInvites],
    partials: [Partials.Message, Partials.Channel, Partials.User]
});

async function analyzeSentimentAI(content) {
    if (!CEREBRAS_API_KEY || !isAIActive) return { verdict: "NO" };
    try {
        const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
            model: 'llama3.1-8b', 
            messages: [{ role: 'system', content: 'Detect racism. JSON: {"verdict": "YES/NO", "category": "racism/none"}.' }, { role: 'user', content: content }],
            response_format: { type: "json_object" }
        }, { headers: { 'Authorization': `Bearer ${CEREBRAS_API_KEY}` }, timeout: 5000 });
        return JSON.parse(res.data.choices[0].message.content);
    } catch (e) { return { verdict: "NO" }; }
}

async function generateMinecraftTrivia(mode) {
    try {
        const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
            model: 'llama3.1-8b',
            messages: [{ role: 'system', content: 'Minecraft Trivia. JSON: {"q": "Question", "a": "Answer", "o": ["Opt1", "Opt2", "Opt3", "Opt4"]}.' }, { role: 'user', content: `Generate a ${mode} Minecraft question nya~.` }],
            response_format: { type: "json_object" }
        }, { headers: { 'Authorization': `Bearer ${CEREBRAS_API_KEY}` }, timeout: 8000 });
        return JSON.parse(res.data.choices[0].message.content);
    } catch (e) { return { q: "Best tool for wood nya~?", a: "Axe", o: ["Axe", "Sword", "Pickaxe", "Hoe"] }; }
}

async function spawnWither() {
    if (activeBoss) return;
    const channel = await client.channels.fetch(DROP_CHANNEL_ID).catch(() => null);
    if (!channel) return;
    activeBoss = { hp: 500, attackers: {} };
    const embed = new EmbedBuilder().setTitle('💀 THE WITHER HAS SPAWNED NYA!').setDescription('**Health:** [██████████] 500/500').setColor(0x000000);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('boss_attack').setLabel('ATTACK ⚔️ NYA!').setStyle(ButtonStyle.Danger));
    await channel.send({ embeds: [embed], components: [row] });
    await sendToLogs("Boss Event nya~", "The Wither Boss has spawned mew!", 0x000000);
}

async function spawnMysteryBox() {
    const channel = await client.channels.fetch(DROP_CHANNEL_ID).catch(() => null);
    if (!channel) return;
    const embed = new EmbedBuilder().setTitle('📦 A MYSTERY BOX HAS DROPPED NYA!').setDescription('Mew! Be the first to claim it for shiny gems!').setColor(0xFBBF24);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('claim_mystery_box').setLabel('CLAIM 🎁 MEW!').setStyle(ButtonStyle.Success));
    await channel.send({ embeds: [embed], components: [row] });
}

function scheduleNextMysteryBox() {
    const delay = (Math.floor(Math.random() * (30 - 20 + 1)) + 20) * 60 * 1000;
    setTimeout(async () => { await spawnMysteryBox(); scheduleNextMysteryBox(); }, delay);
}

function createGameEmbed() {
    return new EmbedBuilder()
        .setTitle('⛏️ Moderation_Bot Survival: RPG Expansion nya~')
        .setDescription('Mew! Welcome to the kitty guide! Commands work only in the games channel.')
        .setColor(0x2ecc71)
        .addFields(
            { name: '💰 Pasive Income nya~', value: 'Buy **Villagers** (150💎). Earn 5💎 every hour. Use `/claim` mew!' },
            { name: '🕵️ High Stakes Heist nya~', value: 'Rob gems (20% win). Fail = branded **THIEF** + 1h Jail mew!' },
            { name: '🧨 Grief nya~', value: 'Destroy wealth (15% win). Failure = 10m jail sentence nya!' },
            { name: '🛡️ Totems & Buckets mew!', value: 'Totems save from Jail. **Buckets** save from Grief. **Golems** catch thieves!' },
            { name: '👕 Armor System nya!', value: 'Ignores strikes with 40% chance! (3 Durability mew!)' },
            { name: '📜 Bounty List nya~', value: 'See most wanted kitties with `/wanted` mew!' },
            { name: '🛒 Shop uwu', value: 'Buy Ranks, Villagers, Armor, Totems, or Rare Crates nya!' }
        );
}

/**
 * READY EVENT
 */
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`System Online: ${readyClient.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    const commands = [
        new SlashCommandBuilder().setName('ping').setDescription('Check speed nya~'),
        new SlashCommandBuilder().setName('help').setDescription('Kitty guide mew!'),
        new SlashCommandBuilder().setName('profile').setDescription('View stats nya~'),
        new SlashCommandBuilder().setName('leaderboard').setDescription('Who is the richest kitty nya?'),
        new SlashCommandBuilder().setName('wanted').setDescription('See kitties with the biggest prices on their heads nya~!'),
        new SlashCommandBuilder().setName('invites').setDescription('See who a kitty has invited to the server nya~!')
            .addUserOption(o => o.setName('user').setDescription('The kitty to check').setRequired(false)),
        new SlashCommandBuilder().setName('warn').setDescription('Warn a kitty and notify them via DM nya~!')
            .addUserOption(o => o.setName('user').setDescription('The kitty to warn').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('The reason for the warning').setRequired(true)),
        new SlashCommandBuilder().setName('shop').setDescription('Buy shiny things uwu')
            .addSubcommand(s => s.setName('menu').setDescription('View the shop buttons nya!'))
            .addSubcommand(s => s.setName('bulk').setDescription('Buy many items nya~!')
                .addStringOption(o => o.setName('item').setDescription('Item choice nya!').setRequired(true).addChoices({name:'Totem',value:'totem'},{name:'Armor',value:'armor'},{name:'Villager',value:'villager'},{name:'Rare Crate',value:'rare'},{name:'Water Bucket',value:'bucket'},{name:'Iron Golem',value:'golem'}))
                .addIntegerOption(o => o.setName('amount').setDescription('How many items nya?').setRequired(true))),
        new SlashCommandBuilder().setName('mine').setDescription('Dig for shiny gems nya!'),
        new SlashCommandBuilder().setName('fish').setDescription('Go fishing for treats mew!'),
        new SlashCommandBuilder().setName('claim').setDescription('Claim passive earnings nya~'),
        new SlashCommandBuilder().setName('heist').setDescription('Rob 50% gems nya!').addUserOption(o => o.setName('user').setDescription('Kitty to rob nya!').setRequired(true)),
        new SlashCommandBuilder().setName('grief').setDescription('Destroy wealth nya!').addUserOption(o => o.setName('user').setDescription('Target kitty nya!').setRequired(true)),
        new SlashCommandBuilder().setName('bounty').setDescription('Place a bounty mew!').addUserOption(o => o.setName('user').setDescription('Target kitty nya!').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Gems to pay nya!').setRequired(true)),
        new SlashCommandBuilder().setName('the-end').setDescription('Enter The End (Needs 12x Eye of Ender) nya~'),
        new SlashCommandBuilder().setName('xp').setDescription('Use 20 XP to heal armor nya~'),
        new SlashCommandBuilder().setName('daily').setDescription('Get treats nya!'),
        new SlashCommandBuilder().setName('pay').setDescription('Give gems to a friend nya!').addUserOption(o => o.setName('user').setDescription('Friend nya!').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Gems nya!').setRequired(true)),
        new SlashCommandBuilder().setName('coinflip').setDescription('Gamble gems mew!').addIntegerOption(o => o.setName('amount').setDescription('Wager nya!').setRequired(true)),
        new SlashCommandBuilder().setName('enchant').setDescription('Upgrade your profile nya~')
            .addStringOption(o => o.setName('type').setDescription('Enchant type nya!').setRequired(true).addChoices({name:'Fortune',value:'fortune'},{name:'Unbreaking',value:'unbreaking'},{name:'Mending',value:'mending'})),
        new SlashCommandBuilder().setName('black-market').setDescription('Trading mew!')
            .addSubcommand(s => s.setName('list').setDescription('Sell item nya~').addStringOption(o => o.setName('item').setDescription('Item choice nya!').setRequired(true).addChoices({name:'Totem',value:'totem'},{name:'Elytra',value:'Elytra'},{name:'Dragon Egg',value:'Dragon Egg'},{name:'50 XP',value:'XP'})).addIntegerOption(o => o.setName('price').setDescription('Sale price nya!').setRequired(true)))
            .addSubcommand(s => s.setName('view').setDescription('View market nya~'))
            .addSubcommand(s => s.setName('buy').setDescription('Buy listing nya!').addIntegerOption(o => o.setName('id').setDescription('Listing ID nya!').setRequired(true)))
            .addSubcommand(s => s.setName('remove').setDescription('Remove listing nya!').addIntegerOption(o => o.setName('id').setDescription('Listing ID nya!').setRequired(true)))
    ].map(c => c.toJSON());

    try { await rest.put(Routes.applicationGuildCommands(readyClient.user.id, TARGET_GUILD_ID), { body: commands }); } catch (error) { console.error(error); }
    
    // Initial Invite Caching nya!
    const guild = client.guilds.cache.get(TARGET_GUILD_ID);
    if (guild) {
        const guildInvites = await guild.invites.fetch().catch(() => new Collection());
        guildInvites.forEach(inv => inviteCache.set(inv.code, inv.uses));
    }

    setInterval(() => spawnWither(), 3600000); 
    scheduleNextMysteryBox();

    // Restoration task
    setInterval(async () => {
        const expired = db.prepare('SELECT * FROM temp_roles WHERE expires_at < ?').all(Date.now());
        const guild = client.guilds.cache.get(TARGET_GUILD_ID);
        if (!guild) return;
        for (const row of expired) {
            try {
                const member = await guild.members.fetch(row.user_id).catch(() => null);
                if (member) {
                    const restoreNick = row.old_nickname === 'null' ? null : row.old_nickname;
                    await member.setNickname(restoreNick).catch(() => {});
                }
            } catch (e) {}
            db.prepare('DELETE FROM temp_roles WHERE id = ?').run(row.id);
        }
    }, 60000);
});

/**
 * INVITE TRACKING LOGIC 
 */
client.on(Events.GuildMemberAdd, async member => {
    if (member.guild.id !== TARGET_GUILD_ID) return;
    const newInvites = await member.guild.invites.fetch().catch(() => new Collection());
    const usedInvite = newInvites.find(inv => inv.uses > inviteCache.get(inv.code));
    if (usedInvite && usedInvite.inviter) {
        db.prepare('INSERT INTO invites (inviter_id, invited_id, invited_username) VALUES (?, ?, ?)').run(usedInvite.inviter.id, member.id, member.user.tag);
        await sendToLogs("New Invite mew!", `Kitty <@${member.id}> joined using invite from <@${usedInvite.inviter.id}> nya~!`, 0x10b981);
    }
    newInvites.forEach(inv => inviteCache.set(inv.code, inv.uses));
});

/**
 * GHOST PING DETECTION 
 */
client.on(Events.MessageDelete, async message => {
    if (!message.guild || message.author?.bot) return;
    if (message.author.id === WHITELISTED_USER_ID) return;
    const hasUserPing = message.mentions.users.filter(u => u.id !== message.author.id).size > 0;
    const hasRolePing = message.mentions.roles.size > 0;
    const hasEveryone = message.mentions.everyone;
    if (hasUserPing || hasRolePing || hasEveryone) {
        const embed = new EmbedBuilder().setTitle('👻 GHOST PING DETECTED NYA!').setDescription(`Mew! <@${message.author.id}> deleted a message containing a ping nya~!`).setColor(0xff0000).addFields({ name: 'Deleted Content mew:', value: message.content || "*Empty or media nya~*" }).setTimestamp();
        await message.channel.send({ embeds: [embed] }).catch(() => {});
        await sendToLogs("Ghost Ping nya~", `<@${message.author.id}> deleted a ping in <#${message.channelId}> mew!\nContent: "${message.content}"`, 0xff0000);
    }
});

/**
 * INTERACTION HANDLER 
 */
client.on(Events.InteractionCreate, async i => {
    if (i.isButton()) {
        try {
            if (i.deferred || i.replied) return;
            await i.deferUpdate().catch(() => {});
            if (!i.deferred && !i.replied) return;

            if (i.customId === 'claim_mystery_box') {
                const roll = Math.random();
                if (roll < 0.15) {
                    const it = UNIQUE_ITEMS[Math.floor(Math.random() * UNIQUE_ITEMS.length)];
                    addInventoryItem(i.user.id, it);
                    return i.editReply({ content: `🎉 Nya~! <@${i.user.id}> found a rare **${it}**!`, embeds: [], components: [] });
                } else {
                    const amt = Math.floor(Math.random() * 15) + 5;
                    updateEmeralds(i.user.id, amt);
                    return i.editReply({ content: `📦 Mew! <@${i.user.id}> found **${amt} Emeralds**!`, embeds: [], components: [] });
                }
            }
            if (i.customId === 'boss_attack') {
                if (!activeBoss) return i.followUp({ content: "Boss defeated nya~!" });
                const dmg = Math.floor(Math.random() * 10) + 5;
                activeBoss.hp -= dmg;
                activeBoss.attackers[i.user.id] = (activeBoss.attackers[i.user.id] || 0) + dmg;
                if (activeBoss.hp <= 0) {
                    const winId = Object.keys(activeBoss.attackers).reduce((a, b) => activeBoss.attackers[a] > activeBoss.attackers[b] ? a : b);
                    updateEmeralds(winId, 50); addInventoryItem(winId, '🌟 Nether Star'); 
                    db.prepare('UPDATE users SET wither_kills = wither_kills + 1 WHERE id = ?').run(winId);
                    activeBoss = null;
                    await sendToLogs("Boss Slain mew!", `<@${winId}> deal most damage nya~!`, 0x10b981);
                    return i.editReply({ content: `🏆 **VICTORY NYA!** <@${winId}> deal most damage mew!`, embeds: [], components: [] });
                }
                return i.editReply({ embeds: [new EmbedBuilder().setTitle('💀 SCRATCH WITHER!').setDescription(`**Health:** ${activeBoss.hp}/500`).setColor(0)] });
            }
            if (i.customId.startsWith('buy_')) {
                const type = i.customId.replace('buy_', '');
                const u = getUser(i.user.id);
                let cost = type === 'villager' ? VILLAGER_COST : (type === 'rare' ? UNIQUE_CRATE_COST : (type === 'armor' ? ARMOR_COST : (type === 'vip' ? VIP_COST : (type === 'tuff' ? TUFF_COST : (type === 'bucket' ? BUCKET_COST : (type === 'golem' ? GOLEM_COST : TOTEM_COST))))));
                if (u.items < cost) return i.followUp({ content: "Mew... no enough gems nya~" });
                updateEmeralds(i.user.id, -cost);
                if (type === 'villager') {
                    if (u.villagers >= 3) { updateEmeralds(i.user.id, cost); return i.followUp({ content: "Max 3 helpers nya!" }); }
                    db.prepare('UPDATE users SET villagers = villagers + 1, last_claim = ? WHERE id = ?').run(Date.now(), i.user.id);
                    return i.editReply({ content: "👨‍🌾 You bought a Farmer Villager mew!", components: [] });
                } else if (type === 'rare') {
                    const it = UNIQUE_ITEMS[Math.floor(Math.random() * UNIQUE_ITEMS.length)];
                    addInventoryItem(i.user.id, it);
                    return i.editReply({ content: `🎁 Found a **${it}** nya!`, components: [] });
                } else if (type === 'armor') {
                    db.prepare('INSERT INTO user_armor (unique_id, user_id, durability) VALUES (?, ?, 3)').run(`ARM-${crypto.randomBytes(2).toString('hex').toUpperCase()}`, i.user.id);
                    return i.editReply({ content: `✅ Purchased Armor mew! 3 Durability nya~!`, components: [] });
                } else if (type === 'totem') {
                    updateTotems(i.user.id, 1);
                    return i.editReply({ content: `🛡️ Mew! **Totem of Undying** bought nya~!`, components: [] });
                } else if (type === 'bucket') {
                    addInventoryItem(i.user.id, '🪣 Water Bucket');
                    return i.editReply({ content: `🪣 Mew! **Water Bucket** bought! Stop a grief attempt nya~!`, components: [] });
                } else if (type === 'golem') {
                    addInventoryItem(i.user.id, '🗿 Iron Golem');
                    return i.editReply({ content: `🗿 Mew! **Iron Golem** bought! I'll catch any thief nya~!`, components: [] });
                } else {
                    const roleId = type === 'vip' ? VIP_ROLE_ID : TUFF_ROLE_ID;
                    const emoji = type === 'vip' ? "👑" : "🗿";
                    const targetMember = await i.guild.members.fetch(i.user.id);
                    await targetMember.roles.add(roleId).catch(() => {});
                    const nameToUse = targetMember.nickname || i.user.username;
                    await targetMember.setNickname(`${emoji} ${nameToUse}`.substring(0, 32)).catch(() => {});
                    return i.editReply({ content: `✅ Rank ${type.toUpperCase()} applied nya!`, components: [] });
                }
            }
            if (i.customId.startsWith('mine_')) {
                if (i.customId.split('_')[3] === '1') { updateEmeralds(i.user.id, -5); return i.editReply({ content: `<@${i.user.id}> 💥 hit a Creeper nya! Lost 5 gems mew...`, components: [] }); }
                db.prepare('UPDATE users SET total_mined = total_mined + 1 WHERE id = ?').run(i.user.id);
                updateEmeralds(i.user.id, 2); return i.editReply({ content: `<@${i.user.id}> ⛏️ found 2 gems nya!`, components: [] });
            }
        } catch (err) { console.error(err); }
        return; 
    }

    if (!i.isChatInputCommand()) return;
    await i.deferReply().catch(() => {});

    try {
        if (i.channelId !== DROP_CHANNEL_ID && !['ping', 'help', 'warn', 'invites'].includes(i.commandName)) {
            return i.editReply({ content: `❌ Use game commands in <#${DROP_CHANNEL_ID}> nya~` });
        }

        const isProtected = i.member.permissions.has(PermissionFlagsBits.Administrator) || i.user.id === WHITELISTED_USER_ID;

        switch (i.commandName) {
            case 'help': return i.editReply({ embeds: [createGameEmbed()] });
            case 'ping': return i.editReply(`Mew! Latency: ${client.ws.ping}ms nya~`);
            case 'invites':
                const iUser = i.options.getUser('user') || i.user;
                const iData = db.prepare('SELECT invited_username FROM invites WHERE inviter_id = ?').all(iUser.id);
                const iList = iData.map((x, idx) => `${idx + 1}. **${x.invited_username}**`).join('\n') || "No kittens invited yet nya~";
                return i.editReply({ embeds: [new EmbedBuilder().setTitle(`💌 Invite List: ${iUser.username}`).setDescription(`Mew! This kitty brought **${iData.length} kittens** nya~!\n\n${iList}`).setColor(0x3498db)] });
            case 'leaderboard':
                const richTop = db.prepare('SELECT username, items FROM users WHERE items > 0 ORDER BY items DESC LIMIT 5').all();
                return i.editReply({ embeds: [new EmbedBuilder().setTitle('🏆 Rich Kitties nya!').setDescription(richTop.map((x,idx)=>`${idx+1}. **${x.username}**: ${x.items}💎`).join('\n') || "Empty nya~").setColor(0xFBBF24)] });
            case 'wanted':
                const wantedTop = db.prepare('SELECT username, bounty FROM users WHERE bounty > 0 ORDER BY bounty DESC LIMIT 10').all();
                return i.editReply({ embeds: [new EmbedBuilder().setTitle('🎯 MOST WANTED KITTIES NYA!').setDescription(wantedTop.map((x,idx)=>`${idx+1}. **${x.username}**: 💰 **${x.bounty} Gems**`).join('\n') || "Safe server mew!").setColor(0xff4444)] });
            case 'warn':
                const wUser = i.options.getUser('user');
                const wReason = i.options.getString('reason');
                if (!i.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return i.editReply("Mew... you don't have permission to warn kitties!");
                try {
                    const warnEmbed = new EmbedBuilder().setTitle('⚠️ Warning Received nya~').setDescription(`You have been issued a formal warning in **${i.guild.name}** mew.`).addFields({ name: 'Reason mew:', value: wReason }).setColor(0xffa500).setTimestamp();
                    await wUser.send({ embeds: [warnEmbed] });
                    await sendToLogs("Manual Warning nya~", `Kitty <@${wUser.id}> was warned by <@${i.user.id}> mew!\nReason: ${wReason}`, 0xffa500);
                    return i.editReply(`Successfully warned <@${wUser.id}> nya!`);
                } catch (e) {
                    await sendToLogs("Warning Failed (DMs Closed)", `Staff <@${i.user.id}> tried to warn <@${wUser.id}> but their DMs are closed nya~!\nReason: ${wReason}`, 0xff0000);
                    return i.editReply(`Tried to warn <@${wUser.id}>, but their DMs are closed mew. Action logged!`);
                }
            case 'shop':
                const shopSub = i.options.getSubcommand();
                if (shopSub === 'bulk') {
                    const item = i.options.getString('item');
                    const qty = i.options.getInteger('amount');
                    if (qty <= 0) return i.editReply("Mew? Pwease buy at least one thing nya~!");
                    const curU = getUser(i.user.id);
                    let unitPrice = item === 'totem' ? TOTEM_COST : item === 'armor' ? ARMOR_COST : item === 'villager' ? VILLAGER_COST : item === 'bucket' ? BUCKET_COST : item === 'golem' ? GOLEM_COST : UNIQUE_CRATE_COST;
                    const totalCost = unitPrice * qty;
                    if (curU.items < totalCost) return i.editReply(`Mew! You need **${totalCost} gems** nya!`);
                    if (item === 'villager') {
                        if (curU.villagers + qty > 3) return i.editReply(`Mew! Only 3 helpers max nya~!`);
                        db.prepare('UPDATE users SET villagers = villagers + ?, last_claim = ? WHERE id = ?').run(qty, Date.now(), i.user.id);
                    } else if (item === 'totem') updateTotems(i.user.id, qty);
                    else if (item === 'armor') { for(let k=0; k<qty; k++) db.prepare('INSERT INTO user_armor (unique_id, user_id, durability) VALUES (?, ?, 3)').run(`ARM-${crypto.randomBytes(2).toString('hex').toUpperCase()}`, i.user.id); }
                    else if (item === 'rare') { for(let k=0; k<qty; k++) addInventoryItem(i.user.id, UNIQUE_ITEMS[Math.floor(Math.random()*UNIQUE_ITEMS.length)]); }
                    else if (item === 'bucket') { for(let k=0; k<qty; k++) addInventoryItem(i.user.id, '🪣 Water Bucket'); }
                    else if (item === 'golem') { for(let k=0; k<qty; k++) addInventoryItem(i.user.id, '🗿 Iron Golem'); }
                    updateEmeralds(i.user.id, -totalCost);
                    return i.editReply(`🛍️ Mew! Successfully bought **${qty}x ${item}** for **${totalCost} gems** nya~!`);
                } else {
                    const row1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('buy_vip').setLabel(`👑 VIP (${VIP_COST})`).setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('buy_tuff').setLabel(`🗿 TUFF (${TUFF_COST})`).setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('buy_rare').setLabel(`🎁 Crate (${UNIQUE_CRATE_COST})`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_villager').setLabel(`👨‍🌾 Villager (${VILLAGER_COST})`).setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('buy_armor').setLabel(`👕 Armor (${ARMOR_COST})`).setStyle(ButtonStyle.Danger)
                    );
                    const row2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('buy_totem').setLabel(`🛡️ Totem (${TOTEM_COST})`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_bucket').setLabel(`🪣 Bucket (${BUCKET_COST})`).setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('buy_golem').setLabel(`🗿 Golem (${GOLEM_COST})`).setStyle(ButtonStyle.Danger)
                    );
                    return i.editReply({ content: '🛒 **Kitty Shop nya~**', components: [row1, row2] });
                }
            case 'heist':
                const target = i.options.getUser('user');
                if (target.id === i.user.id) return i.editReply("Don't steal from yourself nya!");
                const robber = getUser(i.user.id);
                const victim = getUser(target.id);

                // ADMIN & WHITELIST COOLDOWN CHECK
                if (isProtected) {
                    if (Date.now() < (robber.admin_cooldown_until || 0)) {
                        const rem = Math.ceil((robber.admin_cooldown_until - Date.now()) / 60000);
                        return i.editReply(`Mew! You are on a failure cooldown nya~! Wait **${rem} more minutes** mew!`);
                    }
                }

                if (Math.random() < 0.20) {
                    if (hasItem(target.id, '🗿 Iron Golem')) {
                        removeInventoryItem(target.id, '🗿 Iron Golem');
                        await sendToLogs("Golem Triggered mew!", `<@${target.id}>'s Iron Golem caught <@${i.user.id}> nya~!`, 0x3b82f6);
                        if (await attemptTotemUse(i.user.id, i.channel)) return i.editReply(`🗿 **CLANG NYA!** <@${target.id}>'s **Iron Golem** caught you! Your Totem saved you from jail mew!`);
                        
                        if (isProtected) {
                            db.prepare('UPDATE users SET admin_cooldown_until = ? WHERE id = ?').run(Date.now() + 3600000, i.user.id);
                        }

                        const oldNick = i.member.nickname || 'null'; await i.member.setNickname("THIEF").catch(() => {});
                        if (i.member.moderatable && !isProtected) await i.member.timeout(3600000, "Caught by Iron Golem nya!").catch(() => {});
                        db.prepare('INSERT INTO temp_roles (user_id, old_nickname, expires_at) VALUES (?, ?, ?)').run(i.user.id, oldNick, Date.now() + 3600000);
                        return i.editReply(`🗿 **CLANG NYA!** <@${target.id}>'s **Iron Golem** caught you and threw you in the dungeon mew!`);
                    }
                    const loot = Math.floor(victim.items * 0.5);
                    updateEmeralds(target.id, -loot); updateEmeralds(i.user.id, loot);
                    await sendToLogs("Crime Success mew!", `<@${i.user.id}> robbed <@${target.id}> of ${loot} gems nya~!`, 0x10b981);
                    return i.editReply(`💰 **SUCCESS NYA!** You stole **${loot} 💎** from <@${target.id}> mew!`);
                } else {
                    if (await attemptTotemUse(i.user.id, i.channel)) return i.editReply("🛡️ Totem saved you from jail nya~!"); 

                    if (isProtected) {
                        db.prepare('UPDATE users SET admin_cooldown_until = ? WHERE id = ?').run(Date.now() + 3600000, i.user.id);
                    }

                    const oldNick = i.member.nickname || 'null'; await i.member.setNickname("THIEF").catch(() => {});
                    if (i.member.moderatable && !isProtected) await i.member.timeout(3600000, "Theft failure nya!").catch(() => {});
                    db.prepare('INSERT INTO temp_roles (user_id, old_nickname, expires_at) VALUES (?, ?, ?)').run(i.user.id, oldNick, Date.now() + 3600000);
                    await sendToLogs("Theft Failure nya~", `<@${i.user.id}> failed robbery and got jailed mew!`, 0xef4444);
                    return i.editReply("🚔 **CAUGHT!** 1h Jail + Branded THIEF nya!");
                }
            case 'grief':
                const gTarget = i.options.getUser('user');
                const gVictim = getUser(gTarget.id);
                const gAttacker = getUser(i.user.id);

                if (isProtected) {
                    if (Date.now() < (gAttacker.admin_cooldown_until || 0)) {
                        const rem = Math.ceil((gAttacker.admin_cooldown_until - Date.now()) / 60000);
                        return i.editReply(`Mew! You are on a failure cooldown nya~! Wait **${rem} more minutes** mew!`);
                    }
                }

                if (Math.random() < 0.15) {
                    if (hasItem(gTarget.id, '🪣 Water Bucket')) {
                        removeInventoryItem(gTarget.id, '🪣 Water Bucket');
                        await sendToLogs("Bucket Used mew!", `<@${gTarget.id}> used a Water Bucket to stop <@${i.user.id}> nya~!`, 0x3b82f6);
                        return i.editReply(`🪣 Mew! <@${gTarget.id}> used a **Water Bucket** to stop the grief nya~! No gems lost mew!`);
                    }
                    const loss = Math.floor(gVictim.items * 0.7);
                    updateEmeralds(gTarget.id, -loss);
                    if (gVictim.bounty > 0) { updateEmeralds(i.user.id, gVictim.bounty); db.prepare('UPDATE users SET bounty = 0 WHERE id = ?').run(gTarget.id); }
                    return i.editReply(`🧨 **BOOM NYA!** <@${gTarget.id}> lost **${loss} 💎**! Naughty kitty mew!`);
                } else {
                    if (await attemptTotemUse(i.user.id, i.channel)) return i.editReply("🛡️ Totem saved you from the blast nya~!"); 

                    if (isProtected) {
                        db.prepare('UPDATE users SET admin_cooldown_until = ? WHERE id = ?').run(Date.now() + 3600000, i.user.id);
                    }

                    if (i.member.moderatable && !isProtected) {
                        await i.member.timeout(600000, "Grief fail nya!").catch(() => {});
                        await sendToLogs("Grief Failure nya!", `<@${i.user.id}> failed grief and got 10m jail mew!`, 0xef4444);
                        return i.editReply("💨 TNT dud nya... 10m Jail mew!");
                    }
                    return i.editReply("💨 TNT dud nya!");
                }
            case 'claim':
                const cu = getUser(i.user.id);
                if (cu.villagers <= 0) return i.editReply("No villagers nya!");
                const earnings = Math.floor((Date.now() - (cu.last_claim || Date.now())) / 3600000) * cu.villagers * 5;
                if (earnings <= 0) return i.editReply("🕒 Still working nya~. Wait an hour mew!");
                updateEmeralds(i.user.id, earnings);
                db.prepare('UPDATE users SET last_claim = ? WHERE id = ?').run(Date.now(), i.user.id);
                return i.editReply(`👨‍🌾 Claimed **${earnings} 💎** from villagers nya!`);
            case 'enchant':
                const enchantType = i.options.getString('type');
                const eUser = getUser(i.user.id);
                if (eUser.items < ENCHANT_COST) return i.editReply("Mew... enchanting costs 30 gems nya~!");
                updateEmeralds(i.user.id, -ENCHANT_COST);
                if (enchantType === 'fortune') db.prepare('UPDATE users SET fortune_lvl = fortune_lvl + 1 WHERE id = ?').run(i.user.id);
                else if (enchantType === 'unbreaking') db.prepare('UPDATE users SET unbreaking_lvl = unbreaking_lvl + 1 WHERE id = ?').run(i.user.id);
                else db.prepare('UPDATE users SET mending_active = 1 WHERE id = ?').run(i.user.id);
                return i.editReply(`✨ Mew! Successfully enchanted with **${enchantType}** nya!`);
            case 'profile':
                const pu = getUser(i.user.id, i.user.tag);
                const grouped = db.prepare('SELECT item_name, COUNT(*) as count FROM inventory WHERE user_id = ? GROUP BY item_name').all(i.user.id);
                const armCount = db.prepare('SELECT COUNT(*) as count FROM user_armor WHERE user_id = ?').get(i.user.id).count;
                return i.editReply({ embeds: [new EmbedBuilder().setTitle(`⛏️ Kitty Profile: ${i.user.username}`).setColor(0x2ecc71).addFields({ name: '💎 Gems nya~', value: `${pu.items}`, inline: true }, { name: '✨ XP mew!', value: `${pu.xp}`, inline: true }, { name: '👨‍🌾 Villagers', value: `${pu.villagers}/3 nya!`, inline: true }, { name: '🛡️ Totems', value: `${pu.shields} uwu`, inline: true }, { name: '👕 Armor sets', value: `${armCount} mew!`, inline: true }, { name: '🎒 Looties nya~', value: grouped.map(x => `**${x.count}x ${x.item_name}**`).join(', ') || 'No looties nya~' })] });
            case 'daily':
                const du = getUser(i.user.id, i.user.tag);
                if (Date.now() - (du.last_daily || 0) < 86400000) return i.editReply(`🕒 No treats yet nya~!`);
                updateEmeralds(i.user.id, 5); db.prepare('UPDATE users SET last_daily = ? WHERE id = ?').run(Date.now(), i.user.id);
                return i.editReply(`🎁 Nya~! You got **5💎**! Enjoy mew!`);
            case 'fish':
                const fUser = getUser(i.user.id);
                if (Date.now() - (fUser.last_fish || 0) < 300000) return i.editReply("🕒 Wait 5m nya~!");
                db.prepare('UPDATE users SET last_fish = ? WHERE id = ?').run(Date.now(), i.user.id);
                const r = Math.random();
                if (r < 0.08) { addInventoryItem(i.user.id, '👁️ Eye of Ender'); return i.editReply("🎣 **WOW NYA!** Caught **👁️ Eye of Ender** mew!"); }
                if (r < 0.25) { updateXP(i.user.id, 20); return i.editReply("🎣 Caught yummy fishy! (+20 XP nya~)"); }
                return i.editReply("🎣 Just a standard fishy nya. Mew.");
            case 'black-market':
                const bmSub = i.options.getSubcommand();
                const bmUser = getUser(i.user.id);
                if (bmSub === 'list') {
                    const item = i.options.getString('item'); const p = i.options.getInteger('price');
                    let has = (item === 'totem' && bmUser.shields > 0) ? (updateTotems(i.user.id, -1), true) : (item === 'XP' && bmUser.xp >= 50) ? (updateXP(i.user.id, -50), true) : removeInventoryItem(i.user.id, item);
                    if (!has) return i.editReply(`❌ No ${item} nya!`);
                    db.prepare('INSERT INTO black_market (seller_id, seller_name, item_name, price) VALUES (?, ?, ?, ?)').run(i.user.id, i.user.tag, item, p);
                    return i.editReply(`💀 Listed **${item}** for **${p} 💎** nya~`);
                }
                if (bmSub === 'view') { return i.editReply(`💀 **Market listings nya:**\n${db.prepare('SELECT * FROM black_market').all().map(l=>`ID: \`#${l.id}\` | **${l.item_name}** for **${l.price} 💎** (Seller: ${l.seller_name})`).join('\n') || "Empty nya~"}`); }
                if (bmSub === 'buy') {
                    const id = i.options.getInteger('id'); const l = db.prepare('SELECT * FROM black_market WHERE id = ?').get(id);
                    if (!l || bmUser.items < l.price) return i.editReply("Purchase failed nya!");
                    updateEmeralds(i.user.id, -l.price); updateEmeralds(l.seller_id, l.price);
                    if (l.item_name === 'totem') updateTotems(i.user.id, 1); else if (l.item_name === '50 XP') updateXP(i.user.id, 50); else addInventoryItem(i.user.id, l.item_name);
                    db.prepare('DELETE FROM black_market WHERE id = ?').run(id);
                    return i.editReply(`✅ Bought **${l.item_name}** mew!`);
                }
                if (bmSub === 'remove') {
                    const id = i.options.getInteger('id'); const l = db.prepare('SELECT * FROM black_market WHERE id = ?').get(id);
                    if (!l || l.seller_id !== i.user.id) return i.editReply("❌ Not your listing nya!");
                    if (l.item_name === 'totem') updateTotems(i.user.id, 1); else if (l.item_name === '50 XP') updateXP(i.user.id, 50); else addInventoryItem(i.user.id, l.item_name);
                    db.prepare('DELETE FROM black_market WHERE id = ?').run(id);
                    return i.editReply(`💀 Listing removed mew!`);
                }
            case 'bounty':
                const bTarget = i.options.getUser('user'); const bAmt = i.options.getInteger('amount');
                if (getUser(i.user.id).items < bAmt || bAmt <= 0) return i.editReply("Mew... you need gems for that!");
                updateEmeralds(i.user.id, -bAmt); db.prepare('UPDATE users SET bounty = bounty + ? WHERE id = ?').run(bAmt, bTarget.id);
                return i.editReply(`🎯 Bounty of **${bAmt} 💎** placed on <@${bTarget.id}> nya!`);
            case 'pay':
                const pTarget = i.options.getUser('user'); const pAmt = i.options.getInteger('amount');
                if (getUser(i.user.id).items < pAmt || pAmt <= 0) return i.editReply("Mew... no gems!");
                updateEmeralds(i.user.id, -pAmt); updateEmeralds(pTarget.id, pAmt);
                return i.editReply(`💸 Sent **${pAmt} 💎** to friend <@${pTarget.id}> nya!`);
            case 'coinflip':
                const cAmt = i.options.getInteger('amount');
                if (getUser(i.user.id).items < cAmt || cAmt <= 0) return i.editReply("Mew... no gems!");
                const win = Math.random() > 0.5; updateEmeralds(i.user.id, win ? cAmt : -cAmt);
                return i.editReply(win ? `🪙 Mew! You won **${cAmt} 💎**!` : `🪙 Oh no nya! Lost **${cAmt} 💎** mew...`);
            case 'mine':
                const mu = getUser(i.user.id);
                if (Date.now() - (mu.last_mine || 0) < 1800000) return i.editReply("🕒 Wait 30m nya~!");
                db.prepare('UPDATE users SET last_mine = ? WHERE id = ?').run(Date.now(), i.user.id);
                const mRows = [];
                for(let y=0; y<3; y++) {
                    const r = new ActionRowBuilder();
                    for(let x=0; x<5; x++) r.addComponents(new ButtonBuilder().setCustomId(`mine_${x}_${y}_${Math.random()<0.2?1:0}`).setLabel('🪨').setStyle(ButtonStyle.Secondary));
                    mRows.push(r);
                }
                return i.editReply({ content: "⛏️ Mew! Dig for gems nya~!", components: mRows });
        }
    } catch (err) { console.error(err); return i.editReply("Execution error nya... Mew!"); }
});

/**
 * MODERATION LOGIC
 */
async function applyAction(m, reason, type = "Word Filter", content = "Unknown") {
    if (m.author.id === WHITELISTED_USER_ID) return;
    if (m.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await m.delete().catch(() => {});
        await m.author.send(`Nya~! staff kitties shouldn't say bad wordy mew: "${content}". Warning Logged!`).catch(() => {});
        await sendToLogs("Staff Violation mew!", `<@${m.author.id}> said: "${content}"\nReason: ${reason} nya~!`, 0x3b82f6);
        return;
    }
    const armor = db.prepare('SELECT * FROM user_armor WHERE user_id = ? LIMIT 1').get(m.author.id);
    if (armor && Math.random() < 0.40) {
        db.prepare('UPDATE user_armor SET durability = durability - 1 WHERE unique_id = ?').run(armor.unique_id);
        if (armor.durability <= 1) db.prepare('DELETE FROM user_armor WHERE unique_id = ?').run(armor.unique_id);
        await m.delete().catch(()=>{});
        await m.channel.send(`🛡️ Mew! <@${m.author.id}>'s armor absorbed the strike nya!`).catch(()=>{});
        await sendToLogs("Armor Save nya!", `<@${m.author.id}> avoided strike with armor! Content: "${content}" mew!`, 0x10b981);
        return;
    }
    if (await attemptTotemUse(m.author.id, m.channel)) { await m.delete().catch(()=>{}); return; }
    await m.delete().catch(()=>{});
    const strikeType = type === "AI_RACISM" ? 'racism' : 'standard';
    const count = incrementStrikes(m.author.id, m.author.tag, strikeType);
    if (strikeType === 'racism') {
        if (m.member?.moderatable) {
            if (await attemptTotemUse(m.author.id, m.channel)) return;
            await m.member.timeout(RACISM_TIMEOUT_MS).catch(()=>{});
            await m.member.roles.add(GIVEAWAY_TIMEOUT_ROLE_ID).catch(()=>{});
            await m.channel.send(`🚨 **OH NO NYA!** <@${m.author.id}> 12h Jail mew!`);
            await sendToLogs("Hate Speech Sentence nya!", `<@${m.author.id}> said: "${content}"\nResult: 12h mew!`, 0xef4444);
        }
    } else {
        await sendToLogs("Strike nya~", `<@${m.author.id}> strike (${count}/3) for: "${content}" mew!`, 0xf97316);
        if (count >= 3) {
            if (await attemptTotemUse(m.author.id, m.channel)) { resetStrikes(m.author.id, 'standard'); return; }
            if (m.member?.moderatable) await m.member.timeout(STANDARD_TIMEOUT_MS).catch(()=>{});
            await m.channel.send(`⚠️ <@${m.author.id}> 1h Jail mew!`);
            resetStrikes(m.author.id, 'standard');
        } else await m.channel.send(`⚠️ <@${m.author.id}>, bad wordy nya! (${count}/3 mew!)`);
    }
}

client.on(Events.MessageCreate, async m => {
    if (!m.guild || m.author.bot || m.guild.id !== TARGET_GUILD_ID) return;
    db.prepare('UPDATE users SET xp = xp + 1 WHERE id = ?').run(m.author.id);
    const u = getUser(m.author.id);
    if (u.mending_active && u.xp % 100 === 0) db.prepare('UPDATE user_armor SET durability = MIN(durability + 1, 3) WHERE user_id = ?').run(m.author.id);
    if (m.author.id === WHITELISTED_USER_ID) return;
    if (SENSITIVE_TOPICS.some(t => m.content.toLowerCase().includes(t)) && isAIActive) {
        const an = await analyzeSentimentAI(m.content);
        if (an.verdict === "YES" && an.category === "racism") return applyAction(m, "Hate Speech", "AI_RACISM", m.content);
    }
    if (BANNED_WORDS.some(w => m.content.toLowerCase().includes(w))) return applyAction(m, "Language", "Filter", m.content);
});

/**
 * DASHBOARD
 */
const app = express(); app.use(express.json());
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>Moderation_Bot Kitty Panel</title><script src="https://cdn.tailwindcss.com"></script><style>body { background: #0c0f14; color: #e2e8f0; font-family: sans-serif; }.tab { cursor: pointer; padding: 12px 24px; border-radius: 12px; }.active { background: #3b82f6; }</style></head>
    <body class="p-10 text-white"><div class="max-w-6xl mx-auto space-y-10">
    <header class="flex justify-between items-center bg-slate-900 p-8 rounded-3xl border border-slate-800">
        <div><h1 class="text-3xl font-black text-emerald-500">Moderation_Bot Kitty Console nya~</h1><p class="text-slate-500">Control the meows uwu</p></div>
        <div class="flex gap-4"><button onclick="toggle('mod')" class="bg-blue-600 px-6 py-2 rounded-xl font-bold uppercase text-xs">Kitty Filter</button><button onclick="toggle('ai')" class="bg-purple-600 px-6 py-2 rounded-xl font-bold uppercase text-xs">AI Mew</button></div>
    </header>
    <div class="grid grid-cols-4 gap-6">
        <div class="bg-slate-900 p-6 rounded-3xl text-center"><p class="text-[10px] text-slate-500 uppercase">Shiny Gems nya~</p><div id="total-e" class="text-2xl font-black">...</div></div>
        <div class="bg-slate-900 p-6 rounded-3xl text-center"><p class="text-[10px] text-slate-500 uppercase">Friend Kitties</p><div id="total-m" class="text-2xl font-black">...</div></div>
        <div class="bg-slate-900 p-6 rounded-3xl text-center"><p class="text-[10px] text-slate-500 uppercase">Blessing uwu</p><div id="bless" class="text-xs font-bold text-yellow-500 uppercase">Inactive nya~</div></div>
        <div class="bg-slate-900 p-6 rounded-3xl text-center"><p class="text-[10px] text-slate-500 uppercase">Wither Status</p><div id="boss-st" class="text-xs font-bold text-red-500 uppercase">Sleepy mew</div></div>
    </div>
    <div class="flex gap-4 border-b border-slate-800 pb-4"><div onclick="st('st')" class="tab active" id="tab-st">Kitty Analytics</div><div onclick="st('tm')" class="tab" id="tab-tm">Kitty Terminal</div><div onclick="st('vt')" class="tab" id="tab-vt">Kitty Vault</div><div onclick="st('ct')" class="tab" id="tab-ct">Kitty Controls</div></div>
    <div id="st" class="content block"><div class="grid grid-cols-2 gap-10 mt-10"><div class="bg-slate-900 p-8 rounded-3xl border border-slate-800"><h2 class="font-bold mb-4">Rich Kitties nya~</h2><div id="u-table"></div></div><div class="bg-slate-900 p-8 rounded-3xl border border-slate-800"><h2 class="font-bold mb-4">Kitty Log Feed nya!</h2><div id="m-feed"></div></div></div></div>
    <div id="tm" class="content hidden mt-10"><input id="c-ch" placeholder="Channel ID nya~" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 outline-none text-white mb-4"><textarea id="c-msg" placeholder="Meow something cute..." class="w-full bg-slate-800 p-4 rounded-xl h-32 border border-slate-700 outline-none text-white mb-4"></textarea><button onclick="sc()" class="bg-blue-600 px-10 py-3 rounded-xl font-bold w-full">MEW BROADCAST NYA~</button></div>
    <div id="vt" class="content hidden mt-10"><input id="v-uid" placeholder="Kitty User ID nya~" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 outline-none text-white mb-4"><input id="v-amt" type="number" placeholder="Gem amount nya~" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 outline-none text-white mb-4"><button onclick="gv()" class="bg-emerald-600 px-10 py-3 rounded-xl font-bold w-full">CHANGE GEMS NYA~</button></div>
    <div id="ct" class="content hidden mt-10 space-y-8">
        <div class="grid grid-cols-2 gap-4"><button onclick="bless()" class="bg-yellow-600 p-6 rounded-3xl font-bold">KITTY BLESSING ✨ NYA~</button><button onclick="sw()" class="bg-red-600 p-6 rounded-3xl font-bold">SPAWN BIG WITHER 💀 MEW!</button></div>
        <div class="bg-slate-900 p-8 rounded-3xl border border-slate-800 space-y-4">
            <h2 class="font-black text-xl text-blue-500">Kitty Moderation Console 🛠️</h2>
            <div class="flex gap-4">
                <input id="mod-uid" placeholder="Kitty User ID mew~" class="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700 outline-none text-white">
                <input id="mod-dur" type="number" placeholder="Minutes nya~" class="w-32 bg-slate-800 p-4 rounded-xl border border-slate-700 outline-none text-white">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <button onclick="webMod('timeout')" class="bg-orange-600 p-4 rounded-xl font-bold">TIMEOUT KITTY 🚔</button>
                <button onclick="webMod('untimeout')" class="bg-emerald-600 p-4 rounded-xl font-bold">UNTIMEOUT KITTY ✅</button>
            </div>
        </div>
    </div>
    </div><script>
        function st(t){document.querySelectorAll('.tab').forEach(e=>e.classList.remove('active'));document.querySelectorAll('.content').forEach(e=>e.classList.add('hidden'));document.getElementById('tab-'+t).classList.add('active');document.getElementById(t).classList.remove('hidden');}
        async function toggle(t){await fetch('/api/toggle',{method:'POST',body:JSON.stringify({type:t}),headers:{'Content-Type':'application/json'}}); alert('Setting Toggled nya~!'); }
        async function sc(){await fetch('/api/chat',{method:'POST',body:JSON.stringify({ch:document.getElementById('c-ch').value,msg:document.getElementById('c-msg').value}),headers:{'Content-Type':'application/json'}});alert('Mew! Sent nya~');}
        async function gv(){await fetch('/api/vault',{method:'POST',body:JSON.stringify({id:document.getElementById('v-uid').value,amt:document.getElementById('v-amt').value}),headers:{'Content-Type':'application/json'}});alert('Vault Updated nya~!');}
        async function bless(){await fetch('/api/bless',{method:'POST'});alert('Server Blessed nya~!');}
        async function sw(){const r=await fetch('/api/spawn-wither',{method:'POST'});if(r.ok)alert('Wither Spawned nya!');else alert('Boss is already scary nya!');}
        async function webMod(a){
            const id = document.getElementById('mod-uid').value; const dur = document.getElementById('mod-dur').value;
            const r = await fetch('/api/'+a, { method:'POST', body:JSON.stringify({id, dur}), headers:{'Content-Type':'application/json'}});
            if(r.ok) alert('Kitty '+a+'ed successfully nya~!'); else alert('Failed to '+a+' kitty mew...');
        }
        async function refresh(){
            const res = await fetch('/api/stats'); const d = await res.json();
            document.getElementById('total-e').innerText = d.emeralds + ' 💎 nya~';
            document.getElementById('total-m').innerText = d.members;
            document.getElementById('bless').innerText = d.blessing ? 'ACTIVE NYA~' : 'INACTIVE uwu';
            document.getElementById('boss-st').innerText = d.boss ? 'ACTIVE 💀' : 'NONE mew';
            document.getElementById('u-table').innerHTML = d.users.map(u => \`<div class="flex justify-between p-3 bg-slate-800 rounded-xl text-sm mb-2"><span>\${u.username}</span><span class="font-bold">\${u.items} 💎 nya!</span></div>\`).join('');
            document.getElementById('m-feed').innerHTML = d.logs.map(l => \`<div class="p-3 bg-slate-800 rounded-xl text-[10px] border-l-4 border-red-500 mb-2"><b>\${l.timestamp}</b> | \${l.user}: \${l.detail} nya~</div>\`).join('');
        }
        setInterval(refresh,5000); refresh();
    </script></body></html>`);
});

app.get('/api/stats', (req, res) => {
    res.json({ emeralds: db.prepare('SELECT SUM(items) as e FROM users').get().e||0, members: client.guilds.cache.get(TARGET_GUILD_ID)?.memberCount||0, blessing: Date.now() < globalBlessingUntil, boss: !!activeBoss, users: db.prepare('SELECT username, items FROM users ORDER BY items DESC LIMIT 5').all(), logs: webLogs });
});

app.post('/api/toggle', (req, res) => { const { type } = req.body; if (type === 'mod') isModActive = !isModActive; if (type === 'ai') isAIActive = !isAIActive; res.sendStatus(200); });
app.post('/api/chat', async (req, res) => { try { const ch = await client.channels.fetch(req.body.ch); if (ch) await ch.send(req.body.msg); res.sendStatus(200); } catch (e) { res.status(500).send(e.message); } });
app.post('/api/vault', (req, res) => { try { updateEmeralds(req.body.id, parseInt(req.body.amt)); res.sendStatus(200); } catch (e) { res.status(500).send(e.message); } });
app.post('/api/bless', (req, res) => { globalBlessingUntil = Date.now() + 3600000; res.sendStatus(200); });
app.post('/api/spawn-wither', async (req, res) => { if (activeBoss) return res.status(400).send("Active"); await spawnWither(); res.sendStatus(200); });

app.post('/api/timeout', async (req, res) => {
    try {
        const guild = await client.guilds.fetch(TARGET_GUILD_ID);
        const member = await guild.members.fetch(req.body.id);
        const ms = parseInt(req.body.dur) * 60000;
        await member.timeout(ms, "Remote Web Timeout nya~!");
        await sendToLogs("Web Timeout nya~", `Staff applied a ${req.body.dur}m timeout to <@${member.id}> via Dashboard mew!`, 0xffa500);
        res.sendStatus(200);
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/untimeout', async (req, res) => {
    try {
        const guild = await client.guilds.fetch(TARGET_GUILD_ID);
        const member = await guild.members.fetch(req.body.id);
        await member.timeout(null, "Remote Web Release nya~!");
        await sendToLogs("Web Release mew!", `Staff released <@${member.id}> from timeout via Dashboard nya~!`, 0x10b981);
        res.sendStatus(200);
    } catch (e) { res.status(500).send(e.message); }
});

app.listen(PORT, () => console.log(`Dashboard: http://localhost:${PORT}`));
client.login(TOKEN);
