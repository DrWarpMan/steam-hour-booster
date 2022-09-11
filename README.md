# steam-hour-booster

Boosts your Steam games playtime

## Information

Steam Hour Booster will log in to your Steam account(s) and make you seem
as if you were playing certain game(s) which results in increasing your Steam playtime for that specific game(s).

> **Note:** This way of boosting hours is not breaking any rules, thus it won't get your account banned.

### Steam Guard

- fully supports boosting accounts with or without Steam Guard (both e-mail & phone app)

### Docker

Docker version can be found here: https://hub.docker.com/r/drwarpman/steam-hour-booster

## Download & Install & Build

Clone the repository:

```bash
git clone https://github.com/DrWarpMan/steam-hour-booster.git
cd steam-hour-booster
```

then install the packages:

```bash
npm install
```

and build:

```bash
npm run build
```

## Configure

Copy the default configuration:

```bash
cp ./accounts.default.json ./config/accounts.json
```

and configure to your needs.

Default accounts.default.json file:

```json
[
	{
		"username": "foo",
		"password": "bar",
		"games": [730]
	}
]
```

You can have multiple accounts with each playing multiple games at once.

## Serve

```bash
npm run serve
```

If you use Steam Guard, you need to run this app attached to it's console first, so that you can input your Steam Guard code,
afterwards it saves the "session" and you don't need to worry about Steam Guard anymore.

You should run this on a 24/7 online server to make this effective.
To run it in the background, use either PM2 or docker version of this app.
