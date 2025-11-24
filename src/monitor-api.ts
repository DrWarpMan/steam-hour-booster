import type { Bot } from "./bot";

const MONITOR_PORT = Bun.env["MONITOR_PORT"] ?? 3000;

export async function startMonitorApi(bots: Bot[]) {
	Bun.serve({
		port: MONITOR_PORT,
		async fetch(req) {
			const url = new URL(req.url);

			if (url.pathname === "/") {
				const summary = await Promise.all(bots.map(bot => bot.getSummary()))
				return Response.json(summary);
			}

			return new Response("Not Found", { status: 404 });
		},
	});
}
