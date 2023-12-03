import { Bot } from "./src/bot";
import { loadConfig } from "./src/config";

const configPath = Bun.env["CONFIG_PATH"];

if(!configPath) {
    throw new Error("Config path not set");
}

const config = await loadConfig(configPath);

for(const entry of config) {
    const bot = new Bot(entry.username, entry.password, entry.games);
    
    await bot.login();
    await bot.start();
}