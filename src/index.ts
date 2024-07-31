import { Bot } from "./bot";
import { loadConfig } from "./config";
import { DefaultTokenStorage } from "./token-storage";

const configPath = Bun.env["CONFIG_PATH"] ?? "./config.json";

const config = await loadConfig(configPath);

export const TOKEN_STORAGE_DIRECTORY =
	Bun.env["TOKEN_STORAGE_DIRECTORY"] ?? "./tokens";

const ts = new DefaultTokenStorage(TOKEN_STORAGE_DIRECTORY);

for (const entry of config) {
	const bot = new Bot(
		entry.username,
		entry.password,
		entry.games,
		ts,
		entry.online,
	);

	await bot.login();
}
