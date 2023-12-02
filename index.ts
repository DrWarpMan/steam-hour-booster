import { loadConfig } from "./src/config";

const configPath = Bun.env["CONFIG_PATH"];

if(!configPath) {
    throw new Error("Config path not set");
}

const config = await loadConfig(configPath);

for(const entry of config) {
    console.log(entry);
}