import steamBot from "./steamBot.js";
import accounts from "./../login.js";

for (const { accountName, password } of accounts) {
	const bot = new steamBot(accountName, password, [730]);
	bot.logIn();
}
