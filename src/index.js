import { readFileSync } from "fs";
import steamBotBuilder from "./steamBotBuilder.js";

const accountsFilePath = new URL("./../login.json", import.meta.url);
const accounts = JSON.parse(readFileSync(accountsFilePath));
const steamBot = steamBotBuilder(accounts, accountsFilePath);

Object.keys(accounts).forEach(accountName => {
	const { password, games, loginKey } = accounts[accountName];
	new steamBot(accountName, password, games, loginKey || "");
});
