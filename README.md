# steam-hour-booster
> Farm your in-game hours on Steam
- You can farm hours for **multiple games** on **multiple accounts** at once.
- Accounts with **Steam Guard** enabled are **supported**.
- Uses [node-steam-user](https://github.com/DoctorMcKay/node-steam-user) library.

<sub>*This software is not affiliated with Valve Corporation or Steam.*</sub>

![Result of hours farming](./result.png)

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
bun .
```

### Steam Guard
If your accounts have Steam Guard enabled, you will be prompted to enter Steam Guard code for each account.
Once logged in, a [refresh token](https://github.com/DoctorMcKay/node-steam-user?tab=readme-ov-file#using-refresh-tokens) will be stored and used to automatically log in to your accounts in the future.

### Run in the background
To take full advantage of this program, you most likely want to run it on a machine that is always running.\
I recommend using [Docker](#docker) to achieve this, but you are free to use your own solution.

*Before running in the background, make sure to run it once normally to be able to enter your Steam Guard codes (if needed).*

## Configuration

Configuration consists of a JSON file containing a list of accounts to farm hours on.

Copy the default configuration:

```bash
cp config.example.json config.json
```

Edit the configuration file to your liking.

*Example configuration:*

```jsonc
[
    {
        "username": "foo",
        "password": "bar",
        "games": [730]
    }
]
```

You can add as many accounts as you want.

The `games` array contains the IDs of the games you want to farm hours for. Game IDs can be found on [SteamDB](https://steamdb.info/).\
You can play up to **32** games at the same time on a single account.

You can also add `"online": true` to make the account appear online & in-game while farming hours. This is disabled by default.

### Custom Playing Status (Consolidated Display)
You can configure how your active gameplay is displayed to your friends by adding `"CustomStatus"` to your account configuration. Note that `"online": true` **must** be set, otherwise your status will remain Offline/Invisible and friends will see nothing.

* **Option A: Native Display (Default / Omitted)**: If `"CustomStatus"` is omitted or set to `false`, your friends list will show you playing the **first game** in your `"games"` array natively (e.g. `In-Game: Counter-Strike 2` in rich green). This is completely uncensored (no stars) and highlights all your idling games as actively **"Running"** in your local Steam library frontend!
* **Option B: Manual Custom Status (String)**: Set `"CustomStatus": "Farming Hours..."`. This displays exactly your custom text to friends.
* **Option C: Automatic Combined Lookup (`true`)**: Set `"CustomStatus": true`. The bot will automatically query Steam, fetch the official names of the AppIDs in your `"games"` array, concatenate them, and display them all to friends simultaneously (e.g. `Counter-Strike 2 & Rust & Dota 2`).



## Environment variables
You can provide a `.env` file to configure environment variables. You probably won't need to modify these.

Copy the template:
```bash
cp .env.example .env
```

| Name | Description | Default value |
| --- | --- | --- |
| `CONFIG_PATH` | Path to the config file | `./config.json` |
| `STEAM_DATA_DIRECTORY` | Path to the directory where Steam will store it's data | `./steam-data` |
| `TOKEN_STORAGE_DIRECTORY` | Path to the directory where Steam refresh tokens will be stored, used for remembering sessions | `./tokens` |

## Docker

For Docker usage, see [here](https://hub.docker.com/r/drwarpman/steam-hour-booster).

## FAQ

### Can I get banned?
People have been using these kinds of "hour boosters" for years, without issues.\
Don't take my word for it though, use at your own risk.
