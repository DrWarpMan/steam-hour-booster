const steamBot = require("./steamBot.js");
const accounts = require("./../login.js");

for (const { accountName, password } of accounts) {
	const bot = new steamBot(accountName, password, [730]);
	bot.logIn();
}
