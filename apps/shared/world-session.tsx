import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatEther, type EIP1193Provider, type Hex } from "viem";
import {
  connectBrowser,
  createBrowserWriter,
  createReader,
  loadLobbySession,
  publishOperation,
  registerParticipant,
  safeError,
  startRound,
  type LobbySnapshot,
  type Reader,
  type Snapshot,
} from "@riftrun/arkiv-adapter";
import {
  practiceSession,
  reconcileWorld,
  type Role,
  type Trust,
} from "@riftrun/world-protocol";
import { addPracticeEdit, readPractice, startPractice } from "./practice";
export type WalletProvider = EIP1193Provider & {
  on?: (event: string, callback: () => void) => void;
  removeListener?: (event: string, callback: () => void) => void;
};
declare global {
  interface Window {
    ethereum?: WalletProvider;
  }
}
export function sessionConfig() {
  const params = new URLSearchParams(location.search);
  const explicitInvite = ["world", "lobby", "host", "manifest"].some((name) =>
    params.has(name),
  );
  const field = (name: string, fallback: string | undefined) =>
    explicitInvite ? (params.get(name) ?? "") : (fallback ?? "");
  const trust: Trust = {
    worldId: field("world", import.meta.env.VITE_RIFTRUN_WORLD_ID),
    lobbyKey: field("lobby", import.meta.env.VITE_RIFTRUN_LOBBY_ENTITY_KEY),
    manifestKey: field(
      "manifest",
      import.meta.env.VITE_RIFTRUN_MANIFEST_ENTITY_KEY,
    ),
    host: field("host", import.meta.env.VITE_RIFTRUN_HOST_ADDRESS),
  };
  return {
    trust,
    live:
      params.get("mode") !== "practice" &&
      Boolean(
        trust.worldId || trust.lobbyKey || trust.manifestKey || trust.host,
      ),
  };
}
export function sessionLink(path: string, trust?: Trust): string {
  const url = new URL(path, location.origin);
  if (trust) {
    url.searchParams.set("world", trust.worldId);
    url.searchParams.set("host", trust.host);
    if (trust.lobbyKey) url.searchParams.set("lobby", trust.lobbyKey);
    if (trust.manifestKey) url.searchParams.set("manifest", trust.manifestKey);
  } else url.searchParams.set("mode", "practice");
  return url.toString();
}
type Receipt = {
  kind: "operation" | "registration" | "round";
  key: string;
  hash: string;
  expiresAt: bigint;
  seen: boolean;
};
export function useWorld() {
  const config = useMemo(sessionConfig, []);
  const practice = useMemo(practiceSession, []);
  const reader = useMemo<Reader | null>(
    () =>
      config.live
        ? createReader(import.meta.env.VITE_ARKIV_ACCESS_KEY ?? "")
        : null,
    [config.live],
  );
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [lobbySession, setLobbySession] = useState<LobbySnapshot | null>(null);
  const [readError, setReadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [account, setAccount] = useState<Hex | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [practiceId, setPracticeId] = useState("idle");
  const [practiceRunning, setPracticeRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [actionStatus, setActionStatus] = useState("");
  const lastGood = useRef(0);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (config.live) return;
    const state = readPractice();
    const block =
      state.startedAt === null
        ? 0n
        : BigInt(
            Math.max(
              0,
              Math.min(60, Math.floor((clock - state.startedAt) / 2000)),
            ),
          );
    setPracticeId(state.id);
    setPracticeRunning(state.startedAt !== null && block < 60n);
    setSnapshot({
      manifest: practice.manifest,
      members: practice.members,
      operations: state.operations,
      state: reconcileWorld(
        practice.manifest,
        practice.members,
        state.operations,
        block,
        practice.trust,
      ),
      readAt: clock,
    });
  }, [clock, config.live, practice]);
  useEffect(() => {
    if (!reader) return;
    let active = true;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const result = await loadLobbySession(reader, config.trust);
        if (active) {
          setLobbySession(result);
          setSnapshot(result.snapshot);
          lastGood.current = Date.now();
          setReadError("");
          failures = 0;
        }
      } catch (error) {
        if (active) {
          setReadError(safeError(error));
          failures++;
        }
      }
      if (active)
        timer = setTimeout(refresh, Math.min(10000, 2500 + failures * 1000));
    };
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [reader, config.trust]);
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;
    const changed = () => {
      setAccount(null);
      setBalance(null);
      setReceipt(null);
      setActionStatus("Wallet changed. Reconnect before the next action.");
    };
    provider.on("accountsChanged", changed);
    provider.on("chainChanged", changed);
    return () => {
      provider.removeListener?.("accountsChanged", changed);
      provider.removeListener?.("chainChanged", changed);
    };
  }, []);
  useEffect(() => {
    if (!reader || !account) return;
    let active = true;
    const refreshBalance = async () => {
      try {
        const value = await reader.getBalance({ address: account });
        if (active) setBalance(value);
      } catch {
        if (active) setBalance(null);
      }
    };
    void refreshBalance();
    const timer = setInterval(refreshBalance, 12000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [reader, account]);
  useEffect(() => {
    if (!receipt || receipt.seen) return;
    const seen =
      receipt.kind === "registration"
        ? lobbySession?.registrations.some(
            (r) => r.key === receipt.key.toLowerCase(),
          )
        : receipt.kind === "round"
          ? snapshot?.manifest.key === receipt.key.toLowerCase()
          : snapshot?.operations.some(
              (op) => op.key === receipt.key.toLowerCase(),
            );
    if (seen) setReceipt((r) => (r ? { ...r, seen: true } : null));
  }, [receipt, snapshot, lobbySession]);
  const stale =
    config.live &&
    (Boolean(readError) || !lobbySession || clock - lastGood.current > 15000);
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setActionError(
        "Open this HTTPS page in an Ethereum-compatible wallet browser, or install a wallet extension on desktop.",
      );
      return;
    }
    try {
      const address = await connectBrowser(window.ethereum);
      setAccount(address);
      setActionError("");
      if (reader) setBalance(await reader.getBalance({ address }));
    } catch (error) {
      setActionError(safeError(error));
    }
  }, [reader]);
  const perform = useCallback(
    async (
      kind: Receipt["kind"],
      action: (
        actor: Hex,
      ) => Promise<{ entityKey: Hex; txHash: Hex; expiresAt: bigint }>,
    ) => {
      if (!reader || !window.ethereum || busy) {
        setActionError("Connect a funded Rabdi wallet first.");
        return;
      }
      if (stale) {
        setActionError(
          "World is stale/unverified. Wait for a fresh read before writing.",
        );
        return;
      }
      setBusy(true);
      setActionError("");
      setReceipt(null);
      setActionStatus("WAITING FOR WALLET");
      try {
        const actor = await connectBrowser(window.ethereum);
        setAccount(actor);
        const funds = await reader.getBalance({ address: actor });
        setBalance(funds);
        if (funds === 0n)
          throw new Error(
            "This wallet needs test tGLM. Use the official Rabdi faucet, then try again.",
          );
        const result = await action(actor);
        setReceipt({
          kind,
          key: result.entityKey,
          hash: result.txHash,
          expiresAt: result.expiresAt,
          seen: false,
        });
        setActionStatus("TRANSACTION INCLUDED — AWAITING ARKIV READ");
      } catch (error) {
        setActionStatus("FAILED — no confirmed change");
        setActionError(safeError(error));
      } finally {
        setBusy(false);
      }
    },
    [reader, busy, stale],
  );
  const register = (role: Role) =>
    perform("registration", (actor) =>
      registerParticipant(
        createBrowserWriter(window.ethereum!, actor),
        reader!,
        config.trust,
        actor,
        role,
      ),
    );
  const lockRound = () =>
    perform("round", (actor) =>
      startRound(
        createBrowserWriter(window.ethereum!, actor),
        reader!,
        config.trust,
        actor,
      ),
    );
  const publish = async (siteId: string) => {
    if (!config.live) {
      try {
        addPracticeEdit(siteId);
        setActionError("");
        setActionStatus(
          "SIMULATED — practice edit shared between tabs in this browser",
        );
        setClock(Date.now());
      } catch (error) {
        setActionError(safeError(error));
      }
      return;
    }
    if (!snapshot) {
      setActionError("Wait for the host to start this round.");
      return;
    }
    return perform("operation", (actor) =>
      publishOperation(
        createBrowserWriter(window.ethereum!, actor),
        reader!,
        snapshot,
        actor,
        siteId,
      ),
    );
  };
  let status = actionStatus;
  if (receipt) {
    if (receipt.kind === "operation") {
      const rejection = snapshot?.state.rejected.find(
        (r) => r.key === receipt.key.toLowerCase(),
      );
      const expired =
        lobbySession &&
        (lobbySession.block >= receipt.expiresAt ||
          (snapshot &&
            lobbySession.block >= snapshot.manifest.config.endBlock));
      status = expired
        ? receipt.seen
          ? "EXPIRED"
          : "EXPIRED BEFORE INDEXED READ"
        : rejection
          ? `CONFIRMED READ / NOT APPLIED: ${rejection.reason}`
          : snapshot?.state.accepted.includes(receipt.key.toLowerCase())
            ? "ACTIVE — CONFIRMED ON ARKIV"
            : receipt.seen
              ? "CONFIRMED READ — awaiting reconciliation"
              : actionStatus;
    } else if (receipt.seen)
      status =
        receipt.kind === "registration"
          ? "REGISTRATION CONFIRMED ON ARKIV"
          : "ROUND CONFIRMED ON ARKIV";
  }
  const seconds = snapshot
    ? Math.min(
        120,
        Math.max(
          0,
          Number(
            snapshot.manifest.config.endBlock - BigInt(snapshot.state.block),
          ) * 2,
        ),
      )
    : 120;
  const startsIn = snapshot
    ? Math.max(
        0,
        Number(
          snapshot.manifest.config.startBlock - BigInt(snapshot.state.block),
        ) * 2,
      )
    : 0;
  const roundOpen = Boolean(
    snapshot &&
      startsIn === 0 &&
      seconds > 0 &&
      (config.live || practiceRunning),
  );
  const member = snapshot?.members.find(
    (m) => m.player.toLowerCase() === account?.toLowerCase(),
  );
  const registration = lobbySession?.roster.find(
    (m) => m.player.toLowerCase() === account?.toLowerCase(),
  );
  return {
    config,
    snapshot,
    lobbySession,
    account,
    balance,
    balanceLabel:
      balance === null
        ? "Checking balance"
        : `${Number(formatEther(balance)).toFixed(4)} tGLM`,
    connect,
    register,
    lockRound,
    publish,
    restart: () => {
      if (!config.live) {
        startPractice();
        setClock(Date.now());
        setActionError("");
        setActionStatus("");
      }
    },
    practiceId,
    practiceRunning,
    stale,
    busy,
    error: actionError || readError,
    readError,
    transaction: { key: receipt?.key, hash: receipt?.hash, status },
    seconds,
    startsIn,
    roundOpen,
    member,
    registration,
    isHost: Boolean(
      account && account.toLowerCase() === config.trust.host.toLowerCase(),
    ),
  };
}
export type WorldSession = ReturnType<typeof useWorld>;
export function crowdLink(session: WorldSession): string {
  return sessionLink(
    "/crowd",
    session.config.live ? session.config.trust : undefined,
  );
}
