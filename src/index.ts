import { join } from "node:path";
import { Bot } from "./bot";
import { loadConfig } from "./config";
import { DefaultTokenStorage } from "./token-storage";

console.info("Starting Steam Hour Booster");

const configPath = Bun.env["CONFIG_PATH"] ?? "./config.json";
const tokenStorageDir = Bun.env["TOKEN_STORAGE_DIRECTORY"] ?? "./tokens";
const steamDataDirectory = Bun.env["STEAM_DATA_DIRECTORY"] ?? "./steam-data";

const config = await loadConfig(configPath);
const ts = new DefaultTokenStorage(tokenStorageDir);

for (const entry of config) {
	const accountDataDirectory = join(
		steamDataDirectory,
		entry.username.toLowerCase(),
	);

	const bot = new Bot(
		entry.username,
		entry.password,
		entry.games,
		accountDataDirectory,
		ts,
		entry.online,
	);

	await bot.login();
}
