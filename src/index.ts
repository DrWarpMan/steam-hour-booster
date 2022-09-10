import JSONManager from "./JSONManager.js";
import SteamBooster from "./steamBooster.js";

console.log("Loading accounts configuration..");
const accountsManager = new JSONManager("./config/accounts.json");
const accounts: account[] = accountsManager.read();
console.log("Accounts loaded!");

const isAccountValid = ({ username, password, games }: account) => {
	return (
		typeof username === "string" &&
		typeof password === "string" &&
		Array.isArray(games) &&
		games.every(i => Number.isInteger(i)) &&
		games.length <= 32
	);
};

console.log("Validating accounts configuration..");
if (!accounts.every(account => isAccountValid(account))) {
	throw new Error("Accounts configuration invalid.");
}
console.log("Accounts are valid.");

console.log("Starting booster!");
for (const account of accounts) {
	console.log(`Booster initializing on account: ${account.username}`);
	const booster = new SteamBooster(account);

	try {
		await booster.login();
		booster.updateGames();
	} catch (err: any) {
		booster.log(`Couldn't start booster for this account, reason: ${err.message}`, true);
	}
}
console.log("Booster setup finished.");
