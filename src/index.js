const fs = require("fs");
const steamBotBuilder = require("./steamBotBuilder.js");

const accountsFilePath = "./credentials/login.json";
const accounts = JSON.parse(fs.readFileSync(accountsFilePath));
const steamBot = steamBotBuilder(accounts, accountsFilePath);

Object.keys(accounts).forEach(accountName => {
	const { password, games, loginKey } = accounts[accountName];
	new steamBot(accountName, password, games, loginKey || "");
});
