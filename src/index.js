import accounts from "../credentials/login.js";
import steamBooster from "./steamBooster.js";

console.log("Starting booster!");

for (const username in accounts) {
	const { password, games } = accounts[username];
	const booster = new steamBooster(username, password, games);

	try {
		await booster.login();
		booster.boost();
	} catch (err) {
		booster.log(`Couldn't start booster for this account, reason: ${err.message}`, true);
	}
}

console.log("All accounts login attempts finished!".toUpperCase());
