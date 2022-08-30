# steam-hour-booster

## Information

Steam Hour Booster will increase your in-game playtime by using official Steam Client API.
You should run this on a 24/7 online server to make this effective.
(Supports only accounts without Steam Guard or with E-Mail Steam Guard)

(Docker version here: https://hub.docker.com/r/drwarpman/steam-hour-booster)

## Download & Installation

Clone the repository:

```bash
git clone https://github.com/DrWarpMan/steam-hour-booster.git
cd steam-hour-booster
```

then install the packages:

```bash
npm install
```

## Configure

Copy the default configuration:

```bash
cp ./login.default.js ./credentials/login.js
```

and configure to your needs!

Example login.js file:

```js
const accounts = {
	drwarpman: {
		password: "SteamHourBooster123",
		games: [730], // CS:GO
	},
};

export default accounts;
```

You can have multiple accounts with each playing multiple games at once.

## Run

```bash
npm start
```

If you use Steam Guard, you need to run the app attached to it's console first, so that you can input your Steam Guard code,
afterwards it saves the session and you don't need to worry about Steam Guard anymore.
