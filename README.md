# steam-hour-booster

Increase the hours played on your Steam games

## Information

Steam Hour Booster will log in to your Steam account(s) and make you seem
as if you were playing certain game(s) which results in increasing your Steam playtime for that specific game(s).
(This way of boosting hours is not breaking any rules, thus it won't get your account banned.)

- fully supports boosting accounts without Steam Guard
- partial support for E-Mail Steam Guard
- no support for Mobile Steam Guard

Docker version can be found here: https://hub.docker.com/r/drwarpman/steam-hour-booster

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
		games: [730, 10], // CS:GO, CS 1.6
	},
};

export default accounts;
```

You can have multiple accounts with each playing multiple games at once.

## Run

```bash
npm start
```

If you use E-Mail Steam Guard, you need to run this app with console first, so that you can input your Steam Guard code,
afterwards it saves the "session" and you don't need to worry about Steam Guard anymore. Steam Guard via Mobile is not supported!

You should run this on a 24/7 online server to make this effective.
To run it in the background, use either PM2 or docker version of this app.
