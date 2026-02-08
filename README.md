# Moderation_bot

### Moderation_bot is a Discord management system that integrates automated moderation tools with an RPG-based economy system. It utilises AI-driven sentiment analysis for content filtering and includes a dedicated web dashboard for real-time monitoring and administration.

#### note you need to have node.js installed on your system.

*And this is not that good of a code so if you find any issue just make an issue.*
#### **Technical Overview**

The bot is built on the Discord.js framework and utilizes the following technologies:
Engine: Discord.js v14
Database: Better-SQLite3 for persistent data management.
AI Integration: Cerebras API (Llama 3.1) for advanced sentiment and toxicity detection.
Web Dashboard: Express.js backend with a Tailwind CSS frontend.he bot is built on the Discord.js framework and utilizes the following technologies:

#### Core Features

**Moderation System**

AI Content Filtering: Analyzes message sentiment to identify and act on hate speech or prohibited topics using natural language processing.
Word Filtering: A traditional blacklist-based system for immediate removal of prohibited language.
Automated Strike System: Tracks user violations and applies progressive penalties, including temporary timeouts and "jail" statuses.
Ghost Ping Detection: Identifies and logs instances where a user mentions a member and deletes the message.
Staff Protection: Includes a whitelist system and administrative overrides to prevent automated actions against authorised users.


#### Economy and RPG Mechanics

Resource Gathering: Interactive mining and fishing modules for user engagement.
Passive Income: A "Villager" system that allows users to generate currency over time.
Dynamic Events: Automated boss encounters (Wither Boss) that require community participation.
Inventory Management: Systems for purchasing and managing items, including "Armor" to mitigate moderation strikes and "Totems" to bypass penalties.
Marketplace: A peer-to-peer black market for trading items between users.

#### Administrative Dashboard

The bot hosts a local web server (default port 3000) providing:
Real-time event logging and analytics.
Toggle switches for global moderation settings.
Manual vault and currency adjustments.
Remote moderation actions (timeout/untimeout) via the web interface.

#### Installation

**Prerequisites

Node.js (v16.11.0 or higher)
Discord Bot Token
Cerebras API Key

#### Setup

**Clone the repository:

git clone [https://github.com/rishabh2024ad/Discord_Moderation_Bot](https://github.com/rishabh2024ad/Discord_Moderation_Bot)
cd Discord_Moderation_Bot


#### Install dependencies:

`npm install discord.js axios express better-sqlite3`


#### **Configure the bot:**
Open the main script file and update the following constants with your specific environment data:

TOKEN: Discord Bot Token
CEREBRAS_API_KEY: Cerebras API Key
TARGET_GUILD_ID: Your server ID
LOG_CHANNEL_ID: Channel for administrative logs
DROP_CHANNEL_ID: Channel for game interactions
Role IDs for VIP, TUFF, and Timeout roles.


**Execute the application:**
`node bot.js`


**Command Documentation**

/profile: Displays user statistics and inventory.
/leaderboard: Shows top users by currency.
/shop: Interface for purchasing items and ranks.
/black-market: Accesses the player-to-player trading menu.
/warn: Manual warning system for staff use.
/mine / /fish: Economy engagement commands.
and more i am lazy to write, just use and see.



## License 
Nothing here, use it as u wish, make money via it(if u can), or what you do i don't care.
