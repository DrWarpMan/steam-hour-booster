# steam-hour-booster-node

## Information

Steam hour booster will increase your in-game playtime (hours) by using official Steam API.
You should run this on a VPS to make it effective.
Does not fully support Steam Guard.

## Download & Installation

Clone the repository:

```bash
git clone https://github.com/DrWarpMan/steam-hour-booster-node.git
cd steam-hour-booster-node
```

then install the packages:

```bash
npm install
```

## Configure

Copy the default config:

```bash
cp login-default.json login.json
```

and edit it to your needs afterwards.

Example login.json file:
```json
{
	"drwarpman": {
		"password": "mypasswordsteam",
		"games": [730]
	}
}
```
730 is a CS:GO app ID.
You can have multiple accounts in the config file.

## Run

```bash
npm start
```
or
```bash
node .
```

I advise you to install PM2 and use it to run this node app in the background, for 24/7 on a machine, like a VPS.
Note: First run the app through bash, via `npm start` or `node .` to input your Steam Guard code from your e-mail, then you can run the app through PM2.
