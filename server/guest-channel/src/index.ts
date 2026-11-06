import { config } from "dotenv";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { GuestRoom } from "./rooms";
config({ quiet: true });
const allowed = (process.env.GUEST_ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:5174").split(",");
const httpServer = createServer((req, res) => { if (req.url === "/health") { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ status: "ok", kind: "offchain guest votes", rooms: rooms.size })); } else { res.writeHead(404); res.end(); } });
const io = new Server(httpServer, { cors: { origin: allowed }, allowRequest: (req, cb) => cb(null, Boolean(req.headers.origin && allowed.includes(req.headers.origin))), maxHttpBufferSize: 2048 });
const rooms = new Map<string, GuestRoom>(); const ips = new Map<string, number>();
const roomName = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,96}$/.test(value);
io.on("connection", socket => {
  const ip = socket.handshake.address; const count = ips.get(ip) ?? 0;
  if (count >= 30) { socket.disconnect(true); return; } ips.set(ip, count + 1);
  let room: GuestRoom | undefined; let rateStart = Date.now(); let messages = 0;
  const allowedMessage = () => { if (Date.now() - rateStart > 10000) { rateStart = Date.now(); messages = 0; } return ++messages <= 20; };
  const emit = () => { if (room) io.to(room.id).emit("state", room.state()); };
  const enter = (value: unknown) => {
    if (!roomName(value) || (rooms.size >= 100 && !rooms.has(value))) return false;
    if (room?.id !== value) { if (room) { room.leave(socket.id); emit(); socket.leave(room.id); } room = rooms.get(value) ?? new GuestRoom(value); rooms.set(value, room); socket.join(value); }
    return true;
  };
  socket.on("spectate", (payload: unknown) => { if (!allowedMessage() || !payload || typeof payload !== "object") return; if (enter((payload as { room?: unknown }).room)) socket.emit("state", room!.state()); });
  socket.on("join", (payload: unknown) => {
    if (!allowedMessage() || !payload || typeof payload !== "object") return;
    const p = payload as { room?: unknown; team?: unknown }; if (p.team !== "BUILDER" && p.team !== "BREAKER") return;
    if (enter(p.room)) { room!.join(socket.id, p.team); emit(); }
  });
  socket.on("vote", (payload: unknown, reply?: (value: { ok: boolean; message: string }) => void) => {
    const respond = (ok: boolean, message: string) => { if (typeof reply === "function") reply({ ok, message }); };
    if (!allowedMessage()) { respond(false, "Too many actions. Try again shortly."); return; }
    room?.advance();
    const siteId = payload && typeof payload === "object" ? (payload as { siteId?: unknown }).siteId : undefined;
    if (typeof siteId !== "string" || !room?.vote(socket.id, siteId)) { respond(false, "Choose a legal site for your team."); return; }
    emit(); respond(true, "Vote counted for this offchain window. Your latest choice replaces your previous vote.");
  });
  socket.on("disconnect", () => { ips.set(ip, Math.max(0, (ips.get(ip) ?? 1) - 1)); if (!ips.get(ip)) ips.delete(ip); room?.leave(socket.id); emit(); });
});
const interval = setInterval(() => { for (const [id, room] of rooms) { room.advance(); if (!io.sockets.adapter.rooms.get(id)?.size) rooms.delete(id); else io.to(id).emit("state", room.state()); } }, 1000);
const port = Number(process.env.GUEST_PORT ?? 4100);
httpServer.listen(port, "0.0.0.0", () => console.log(`Offchain guest channel: http://localhost:${port}`));
const stop = () => { clearInterval(interval); io.close(); httpServer.close(); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
