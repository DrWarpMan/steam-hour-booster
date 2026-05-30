import { type ChildProcess, execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CSC_PATH = "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe";
const WORKSPACE_DIR = process.cwd();
const BIN_DIR = path.join(WORKSPACE_DIR, "bin");
const TEMP_DIR = path.join(WORKSPACE_DIR, "temp");

// Common locations to search for steam_api.dll
const DLL_CANDIDATES = [
	"D:\\SteamLibrary\\steamapps\\common\\Spacewar\\steam_api.dll",
	"D:\\SteamLibrary\\steamapps\\common\\Company of Heroes Relaunch\\steam_api.dll",
	"C:\\Program Files (x86)\\Steam\\steamapps\\common\\Spacewar\\steam_api.dll",
	"D:\\steamcmd\\steamapps\\common\\Spacewar\\steam_api.dll",
];

const CS_CODE = `using System;
using System.Runtime.InteropServices;
using System.IO;
using System.Threading;

class Program {
    [DllImport("steam_api.dll", EntryPoint = "SteamAPI_Init", CallingConvention = CallingConvention.Cdecl)]
    public static extern bool SteamAPI_Init();

    [DllImport("steam_api.dll", EntryPoint = "SteamAPI_Shutdown", CallingConvention = CallingConvention.Cdecl)]
    public static extern void SteamAPI_Shutdown();

    static void Main(string[] args) {
        if (args.Length == 0) {
            Console.WriteLine("Error: AppID is required as first argument.");
            return;
        }

        string appId = args[0];
        try {
            File.WriteAllText("steam_appid.txt", appId);
        } catch (Exception ex) {
            Console.WriteLine("Error: Failed to write steam_appid.txt: " + ex.Message);
            return;
        }

        Console.WriteLine("Initializing SteamAPI for AppID " + appId + "...");
        if (!SteamAPI_Init()) {
            Console.WriteLine("Error: SteamAPI_Init failed. Make sure your Steam PC client is running!");
            return;
        }

        Console.WriteLine("SUCCESS: SteamAPI Initialized. Game is now running!");

        // Handle clean shutdown on exit signals
        AppDomain.CurrentDomain.ProcessExit += (s, e) => Shutdown();
        Console.CancelKeyPress += (s, e) => {
            Shutdown();
            Environment.Exit(0);
        };

        // Keep alive
        while (true) {
            Thread.Sleep(1000);
        }
    }

    static void Shutdown() {
        Console.WriteLine("Shutting down SteamAPI...");
        try {
            SteamAPI_Shutdown();
        } catch {}
        try {
            if (File.Exists("steam_appid.txt")) {
                File.Delete("steam_appid.txt");
            }
        } catch {}
    }
}
`;

export class LocalIdlerManager {
	#activeProcesses: Map<number, ChildProcess> = new Map();
	#dllPath: string | null = null;
	#compiledExePath: string | null = null;

	constructor() {
		// Find steam_api.dll
		for (const candidate of DLL_CANDIDATES) {
			if (fs.existsSync(candidate)) {
				this.#dllPath = candidate;
				break;
			}
		}
	}

	initialize(): boolean {
		if (!this.#dllPath) {
			console.warn(
				"[LocalIdler] Warning: steam_api.dll not found in standard paths. Local library status integration is disabled.",
			);
			return false;
		}

		if (!fs.existsSync(CSC_PATH)) {
			console.warn(
				"[LocalIdler] Warning: .NET C# compiler (csc.exe) not found. Local library status integration is disabled.",
			);
			return false;
		}

		try {
			// Ensure bin/ directory exists
			if (!fs.existsSync(BIN_DIR)) {
				fs.mkdirSync(BIN_DIR, { recursive: true });
			}

			const csPath = path.join(BIN_DIR, "idler.cs");
			const exePath = path.join(BIN_DIR, "idler.exe");

			// Write C# code
			fs.writeFileSync(csPath, CS_CODE, "utf8");

			// Compile C# code to 32-bit (platform:x86) to match 32-bit steam_api.dll
			console.info(
				"[LocalIdler] Compiling lightweight local library status idler...",
			);
			execSync(`"${CSC_PATH}" /platform:x86 /out:"${exePath}" "${csPath}"`, {
				stdio: "ignore",
			});

			this.#compiledExePath = exePath;
			console.info(
				"[LocalIdler] Compilation successful. Ready to sync with local library!",
			);
			return true;
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : String(err);
			console.error(
				`[LocalIdler] Failed to compile local idler helper: ${errMsg}`,
			);
			return false;
		}
	}

	startIdling(games: number[]): void {
		if (!this.#compiledExePath || !this.#dllPath) {
			return;
		}

		// Stop any active idling first
		this.stopIdling();

		// Ensure temp directory exists
		if (fs.existsSync(TEMP_DIR)) {
			try {
				fs.rmSync(TEMP_DIR, { recursive: true, force: true });
			} catch {}
		}
		fs.mkdirSync(TEMP_DIR, { recursive: true });

		console.info(
			`[LocalIdler] Synchronizing ${games.length} games to local Steam library...`,
		);

		for (const appid of games) {
			try {
				const appDir = path.join(TEMP_DIR, `idler_${appid}`);
				fs.mkdirSync(appDir, { recursive: true });

				// Copy executable and steam_api.dll
				fs.copyFileSync(this.#compiledExePath, path.join(appDir, "idler.exe"));
				fs.copyFileSync(this.#dllPath, path.join(appDir, "steam_api.dll"));

				// Spawn process
				const proc = spawn(path.join(appDir, "idler.exe"), [appid.toString()], {
					cwd: appDir,
					stdio: "pipe",
				});

				proc.stdout?.on("data", (data) => {
					const msg = data.toString().trim();
					if (msg.includes("SUCCESS")) {
						console.log(
							`[LocalIdler] [AppID ${appid}] Local library status sync active.`,
						);
					} else if (msg.includes("Error")) {
						console.warn(`[LocalIdler] [AppID ${appid}] ${msg}`);
					}
				});

				proc.on("error", (err) => {
					console.error(
						`[LocalIdler] [AppID ${appid}] Process error: ${err.message}`,
					);
				});

				this.#activeProcesses.set(appid, proc);
			} catch (err) {
				const errMsg = err instanceof Error ? err.message : String(err);
				console.error(
					`[LocalIdler] Failed to sync AppID ${appid} to library: ${errMsg}`,
				);
			}
		}
	}

	stopIdling(): void {
		if (this.#activeProcesses.size === 0) {
			return;
		}

		console.info(
			"[LocalIdler] Stopping local Steam library synchronization...",
		);
		for (const [_, proc] of this.#activeProcesses) {
			try {
				proc.kill("SIGTERM");
			} catch {}
		}
		this.#activeProcesses.clear();

		// Cleanup temp files
		try {
			if (fs.existsSync(TEMP_DIR)) {
				fs.rmSync(TEMP_DIR, { recursive: true, force: true });
			}
		} catch {}
	}
}

export function isLocalSteamRunning(): boolean {
	if (process.platform !== "win32") {
		return false;
	}
	try {
		const output = execSync('tasklist /FI "IMAGENAME eq steam.exe" /NH', {
			stdio: "pipe",
		}).toString();
		return output.toLowerCase().includes("steam.exe");
	} catch {
		return false;
	}
}
