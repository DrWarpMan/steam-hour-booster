import accounts from "../credentials/login.js";
import steamBooster from "./steamBooster.js";

for (const username in accounts) {
	const { password, games } = accounts[username];
	new steamBooster(username, password, games);
}
