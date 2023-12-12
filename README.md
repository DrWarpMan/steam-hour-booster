# steam-hour-booster

This program allows you to **farm your in-game hours on** Steam.\
You can use it to farm hours for **multiple games on multiple accounts at once**.\
Accounts with **Steam Guard** enabled are **supported**.

Uses [node-steam-user](https://github.com/DoctorMcKay/node-steam-user) library for communicating with Steam.

**Note:** *This software is not affiliated with Valve Corporation or Steam.*

## Table of contents
- [Requirements](#requirements)
- [Usage](#usage)
- [Configuration](#configuration)
- [Environment variables](#environment-variables)
- [Docker](#docker)
- [FAQ](#faq)

## Requirements
- [Bun](https://bun.sh/) (or [Docker](https://www.docker.com/))

## Usage

Install dependencies:

```bash
bun install
```

Run:

```bash
bun run index.ts
```

If your accounts have Steam Guard enabled, you will be prompted to enter Steam Guard codes for each account.
This is only needed once, the [refresh tokens](https://github.com/DoctorMcKay/node-steam-user?tab=readme-ov-file#using-refresh-tokens) will be stored in the `TOKEN_STORAGE_DIRECTORY` directory, and will be used to automatically log in to your accounts in the future.

To run the program in the background, I recommend using [Docker](#docker), but you can also use your own solution.\
*Before running the program in the background, make sure to run it once normally to be able to enter your Steam Guard codes (if needed).*

## Configuration

Configuration consists of a JSON file containing a list of accounts to farm hours on.

Copy the default configuration:

```bash
cp config-example.json config.json
```

Edit the configuration file to your liking.

*Example configuration:*

```json
[
    {
        "username": "foo",
        "password": "bar",
        "games": [730]
    }
]
```

You can add as many accounts as you want.

The `games` array contains the IDs of the games you want to farm hours for.\
Game IDs can be found on [SteamDB](https://steamdb.info/).\
I believe the maximum amount of games you can play at once on a single account is **32**.

## Environment variables
If needed, use a `.env` file to configure environment variables.

```bash
cp .env.template .env
```

| Name | Description | Default value |
| --- | --- | --- |
| `CONFIG_PATH` | Path to the config file | `./config.json` |
| `STEAM_DATA_DIRECTORY` | Path to the directory where Steam will store it's data | `./steam-data` |
| `TOKEN_STORAGE_DIRECTORY` | Path to the directory where Steam refresh tokens will be stored, used for remembering sessions | `./tokens` |

## Docker

For Docker usage, see [here](https://hub.docker.com/r/drwarpman/steam-hour-booster).

## FAQ

### Is this safe to use?
People have been using similar programs for years (decades?) without any issues.\
Don't take my word for it though, use at your own risk.