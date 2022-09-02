import accounts from "../credentials/login.js";
import SteamBooster from "./steamBooster.js";

console.log("Starting booster!");

for (const username in accounts) {
	const { password, games } = accounts[username];
	const booster = new SteamBooster(username, password, games);

	try {
		await booster.login();
		booster.updateGames();
	} catch (err) {
		booster.log(`Couldn't start booster for this account, reason: ${err.message}`, true);
	}
}

console.log("All accounts login attempts finished!".toUpperCase());
