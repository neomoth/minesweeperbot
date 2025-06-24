const path = require('node:path');
const { readdir } = require("node:fs/promises");
const {RANK} = require('./util');

function handleCommand(client, game, json) {
	console.log(commands);
	let message = json.data.message;
	let args = message.split(" ");
	let cmdName = args.shift().toLowerCase();
	let cmd = commands.get(cmdName);
	if (!cmd) {
		for (let command of commands.values()) {
			if (!command.data.aliases) continue;
			if (command.data.aliases.includes(cmdName)) {
				cmd = command;
				break;
			}
		}
		if(!cmd) return;
	}
	if (json.data.rank < (!!cmd.data.minRank ? cmd.data.minRank : RANK.NONE)) return;
	if (cmd.data.disabled) return;
	cmd.execute(client, game, json, args);
}

const commands = new Map();

async function loadCommands() {
	let cmdPath = path.join(__dirname, "cmd");
	commands.clear();
	const commandFiles = await readdir(cmdPath);
	for (const file of commandFiles) {
		if (file.endsWith(".js")) {
			try {
				const fullPath = path.join(cmdPath, file);
				const fileUrl = `file://${fullPath}?u=${Date.now()}`;

				const commandModule = await import(fileUrl);
				const command = commandModule.default;

				if (command?.data?.name) {
					commands.set(command.data.name.toLowerCase(), command);
					// console.log(`Loaded command: ${command.data.name}`);
				}
			} catch (e) {
				console.error(`Failed to load command: ${file}: `, e);
			}
		}
	}
}

function usageString(command) {
	return `Usage: /${command.data.usage}`;
}

module.exports = {usageString, loadCommands, commands, handleCommand}