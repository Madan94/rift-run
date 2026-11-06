import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EIP1193Provider, Hex } from "viem";
import { connectBrowser, createBrowserWriter, createReader, loadWorld, publishOperation, safeError, type Snapshot } from "@riftrun/arkiv-adapter";
import { practiceSession, reconcileWorld, type Trust, type WorldOp } from "@riftrun/world-protocol";

declare global { interface Window { ethereum?: EIP1193Provider } }
export function sessionConfig() {
  const params = new URLSearchParams(location.search);
  const trust: Trust = { worldId: params.get("world") ?? import.meta.env.VITE_RIFTRUN_WORLD_ID ?? "", manifestKey: params.get("manifest") ?? import.meta.env.VITE_RIFTRUN_MANIFEST_ENTITY_KEY ?? "", host: params.get("host") ?? import.meta.env.VITE_RIFTRUN_HOST_ADDRESS ?? "" };
  return { trust, live: Boolean(trust.worldId || trust.manifestKey || trust.host), room: params.get("room") ?? (trust.worldId || "venue-practice") };
}
export function useWorld() {
  const config = useMemo(sessionConfig, []);
  const reader = useMemo(() => config.live ? createReader(import.meta.env.VITE_ARKIV_ACCESS_KEY ?? "") : null, [config.live]);
  const practice = useMemo(practiceSession, []);
  const start = useRef(Date.now()); const ops = useRef<WorldOp[]>([]); const serial = useRef(100);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState(""); const [account, setAccount] = useState<Hex | null>(null);
  const [transaction, setTransaction] = useState<{ key?: string; hash?: string; status: string }>({ status: "" });
  const [busy, setBusy] = useState(false); const [clock, setClock] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 500); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (config.live) return;
    const block = BigInt(Math.min(60, Math.floor((clock - start.current) / 2000)));
    const state = reconcileWorld(practice.manifest, practice.members, ops.current, block, practice.trust);
    setSnapshot({ manifest: practice.manifest, members: practice.members, operations: ops.current, state, readAt: clock });
  }, [clock, config.live, practice]);
  useEffect(() => {
    if (!reader) return;
    let active = true; let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try { const next = await loadWorld(reader, config.trust); if (active) { setSnapshot(next); setError(""); } }
      catch (caught) { if (active) setError(safeError(caught)); }
      if (active) timer = setTimeout(refresh, 2500);
    };
    void refresh(); return () => { active = false; clearTimeout(timer); };
  }, [reader, config.trust]);
  useEffect(() => {
    if (transaction.key && snapshot?.operations.some(op => op.key === transaction.key?.toLowerCase()) && transaction.status === "AWAITING ARKIV READ") setTransaction(t => ({ ...t, status: "CONFIRMED ON ARKIV" }));
  }, [snapshot, transaction.key, transaction.status]);
  const connect = useCallback(async () => {
    if (!window.ethereum) { setError("Open this page in a browser with an Ethereum-compatible wallet to publish on Rabdi."); return; }
    try { const address = await connectBrowser(window.ethereum); setAccount(address); setError(""); } catch (caught) { setError(safeError(caught)); }
  }, []);
  const stale = config.live && (Boolean(error) || !snapshot || clock - snapshot.readAt > 12000);
  const publish = useCallback(async (siteId: string) => {
    if (!snapshot || busy) return;
    const site = snapshot.manifest.map.sites.find(s => s.id === siteId); if (!site) return;
    if (!config.live) {
      const block = BigInt(Math.floor((Date.now() - start.current) / 2000));
      if (block >= 60n) { setError("Practice round finished. Start a new round to try another edit."); return; }
      const member = practice.members[site.kind === "BRIDGE" ? 0 : 2];
      const key = `0x${(++serial.current).toString(16).padStart(64, "0")}`;
      ops.current = [...ops.current, { key, creator: member.player, owner: member.player, createdAt: block, updatedAt: block, expiresAt: block + 15n, readonly: true, permissionlessExtension: false, worldId: practice.manifest.worldId, roundId: practice.manifest.roundId, x: site.x, y: site.y, kind: site.kind, phase: Number(block / 5n) }];
      setClock(Date.now()); setTransaction({ status: "SIMULATED — local practice edit" }); return;
    }
    if (!reader || !window.ethereum) { setError("Connect a funded Rabdi wallet to publish."); return; }
    if (stale) { setError("World is stale/unverified. Wait for a successful Arkiv read before publishing."); return; }
    setBusy(true); setTransaction({ status: "WAITING FOR WALLET" });
    try {
      const address = await connectBrowser(window.ethereum); setAccount(address);
      const result = await publishOperation(createBrowserWriter(window.ethereum, address), reader, snapshot, address, siteId);
      setTransaction({ key: result.entityKey, hash: result.txHash, status: "AWAITING ARKIV READ" });
    } catch (caught) { setTransaction({ status: "FAILED — no confirmed edit" }); setError(safeError(caught)); }
    finally { setBusy(false); }
  }, [snapshot, busy, config.live, reader, stale, practice]);
  const restart = () => { if (!config.live) { start.current = Date.now(); ops.current = []; setError(""); setTransaction({ status: "" }); setClock(Date.now()); } };
  const seconds = snapshot ? Math.max(0, Number(snapshot.manifest.config.endBlock - BigInt(snapshot.state.block)) * 2) : 120;
  const roundOpen = Boolean(snapshot && BigInt(snapshot.state.block) >= snapshot.manifest.config.startBlock && seconds > 0);
  return { config, snapshot, account, connect, publish, restart, error, stale, busy, transaction, seconds, roundOpen, elapsed: clock - start.current };
}
export type WorldSession = ReturnType<typeof useWorld>;
export function crowdLink(session: WorldSession): string {
  const url = new URL(import.meta.env.VITE_CROWD_URL || `${location.protocol}//${location.hostname}:5174`);
  url.searchParams.set("room", session.config.room);
  if (session.config.live) { url.searchParams.set("world", session.config.trust.worldId); url.searchParams.set("manifest", session.config.trust.manifestKey); url.searchParams.set("host", session.config.trust.host); }
  return url.toString();
}
