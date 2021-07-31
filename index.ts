import * as Discord from 'discord.js'
import {GuildMember} from "discord.js";
const client = new Discord.Client()

const serverId = getRequiredEnvironmentVariable('DISCORD_SERVER_ID')
const adminChannelId = getRequiredEnvironmentVariable('DISCORD_ADMIN_CHANNEL_ID')
const botAuthToken = getRequiredEnvironmentVariable('DISCORD_BOT_AUTH_TOKEN')

const startTime = new Date();
let lastJoinTime = startTime

let bufferedJoins: GuildMember[] = []

async function RaidCheck(member: GuildMember) {
	if (member.guild.id !== serverId) return

	const adminChannel = getChannel(serverId, adminChannelId);

	const currentTime = new Date();
	const elapsedTime = currentTime.getTime() - lastJoinTime.getTime()

	console.log(`current time = ` + currentTime.getTime())

	const timeDiff = elapsedTime / 1000;

	// get seconds
	const seconds = Math.round(timeDiff);
	console.log(`elapsed time = ` + seconds + " seconds");
	bufferedJoins.push(member);

	if (seconds < 30) {
		console.log(`I saw a consecutive join`)

		if (bufferedJoins.length > 10) {
			console.log(`Detected more than 10 consecutive joins, banning them.`)

			const users = bufferedJoins.map((member) => "@" + member.user.username + "#" + member.user.discriminator).join(", ");
			console.log(`banning: ` + users);
			try {
				await adminChannel.send("detected 10+ joins in 30 seconds, would ban: " + users);
			} catch (e) {
				console.log("Failed to notify server admins of detected join raid")
				return
			}

			// for (const member of bufferedJoins) {
			// 	console.log(`Banning: ${member.user.username}#${member.user.discriminator} (${member.user.id})`);
			// 	try {
			// 		await member.guild.members.ban(member.user.id, {days: 7, reason: "Join raid."})
			// 	} catch (e) {
			// 		console.log(`Failed to ban: ${member.user.username}#${member.user.discriminator} (${member.user.id}): ${e.toString()}`);
			// 	}
			// }

			bufferedJoins = [];
		}
	} else {
		console.log(`Re-setting join detector`)
		bufferedJoins = [member];
	}

	lastJoinTime = currentTime

	return
}

client.on('ready', async () => {
	// This event will run if the bot starts, and logs in, successfully.
	if (client.user === null) throw new Error(`Client doesn't have a user.`)
	console.log(`Bot has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} servers.`)
	await client.user.setActivity(`banning bots`)
})

client.on('guildCreate', (guild) => {
	// This event triggers when the bot joins a server.
	console.log(`New server joined: ${guild.name} (id: ${guild.id}). This server has ${guild.memberCount} members!`)
})

client.on('guildMemberAdd', async (member) => {
	console.log('Triggered member add')
	await RaidCheck(member)
})

client.login(botAuthToken)

function getChannel(serverId: string, channelId: string) {
	const server = client.guilds.cache.get(serverId)
	if (server === undefined) throw new Error(`Bot not joined to server.`)
	const channel = server.channels.cache.find(channel => channel.id === channelId)
	if (!(channel instanceof Discord.TextChannel)) throw new Error(`Join log channel is not a text channel.`)
	return channel
}

function exit() {
	client.destroy()
	process.exit(0)
}

function getRequiredEnvironmentVariable(name: string) {
	const value = process.env[name]
	if (value === undefined) {
		console.error(`${name} environment variable is required.`)
		process.exit(1)
	}
	return value
}

process.on('SIGTERM', exit)
process.on('SIGINT', exit)
