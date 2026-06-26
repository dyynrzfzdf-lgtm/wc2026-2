import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, get, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCVb0l_GtlZFONVEZfwEHa2-YKbJ7kfQQM",
  authDomain: "wc2026-d17d3.firebaseapp.com",
  databaseURL: "https://wc2026-d17d3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wc2026-d17d3",
  storageBucket: "wc2026-d17d3.firebasestorage.app",
  messagingSenderId: "858049932300",
  appId: "1:858049932300:web:11d712a4d860cbfffe1229"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const ROOMS_PATH = "wc2026/rooms";
const roomRef = (code: string) => ref(db, `${ROOMS_PATH}/${code}`);

// localStorage keys (scoped per room where relevant)
const LS_ROOM  = "wc2026_room";
const lsName   = (code: string) => `wc2026_name_${code}`;
const lsAdmin  = (code: string) => `wc2026_admin_${code}`;

const CODE_WORDS = [
  "TIGER","EAGLE","SHARK","LION","WOLF","BEAR","HAWK","PUMA","COBRA","FALCON",
  "PANDA","RHINO","BISON","OTTER","MOOSE","LYNX","ORCA","RAVEN","VIPER","GECKO"
];

const genRoomCode = async (): Promise<string> => {
  const snap = await get(ref(db, ROOMS_PATH));
  const existing = (snap.val() as Record<string, unknown>) || {};
  let code = "";
  for (let i = 0; i < 50; i++) {
    const w = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
    const num = String(Math.floor(Math.random() * 100)).padStart(2, "0");
    code = `${w}-${num}`;
    if (!existing[code]) break;
  }
  return code;
};

const TEAM_FLAGS: Record<string, string> = {
  "Albania":"🇦🇱","Argentina":"🇦🇷","Australia":"🇦🇺","Austria":"🇦🇹",
  "Belgium":"🇧🇪","Brazil":"🇧🇷","Cameroon":"🇨🇲","Canada":"🇨🇦",
  "Colombia":"🇨🇴","Costa Rica":"🇨🇷","Croatia":"🇭🇷","Denmark":"🇩🇰",
  "DR Congo":"🇨🇩","Ecuador":"🇪🇨","Egypt":"🇪🇬","England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "France":"🇫🇷","Germany":"🇩🇪","Ghana":"🇬🇭","Honduras":"🇭🇳",
  "Hungary":"🇭🇺","Iran":"🇮🇷","Iraq":"🇮🇶","Italy":"🇮🇹",
  "Ivory Coast":"🇨🇮","Japan":"🇯🇵","Jordan":"🇯🇴","Mexico":"🇲🇽",
  "Morocco":"🇲🇦","Netherlands":"🇳🇱","New Zealand":"🇳🇿","Nigeria":"🇳🇬",
  "Panama":"🇵🇦","Portugal":"🇵🇹","Romania":"🇷🇴","Saudi Arabia":"🇸🇦",
  "Scotland":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","Senegal":"🇸🇳","Serbia":"🇷🇸","Slovakia":"🇸🇰",
  "Slovenia":"🇸🇮","South Africa":"🇿🇦","South Korea":"🇰🇷","Spain":"🇪🇸",
  "Switzerland":"🇨🇭","Turkey":"🇹🇷","Ukraine":"🇺🇦","Uruguay":"🇺🇾",
  "USA":"🇺🇸","Uzbekistan":"🇺🇿","Venezuela":"🇻🇪"
};
const TEAMS = Object.keys(TEAM_FLAGS).sort();

const ROUNDS = [
  { id:"group", label:"Group Stage",   pts:2  },
  { id:"r32",   label:"Round of 32",   pts:5  },
  { id:"r16",   label:"Round of 16",   pts:9  },
  { id:"qf",    label:"Quarter-Final", pts:14 },
  { id:"sf",    label:"Semi-Final",    pts:20 },
  { id:"third", label:"3rd Place 🥉",  pts:24 },
  { id:"winner",label:"Champions 🏆",  pts:30 },
];

const PC = [
  { bg:"bg-blue-600",   light:"bg-blue-50",   text:"text-blue-700",   border:"border-blue-200"   },
  { bg:"bg-emerald-600",light:"bg-emerald-50", text:"text-emerald-700",border:"border-emerald-200"},
  { bg:"bg-violet-600", light:"bg-violet-50",  text:"text-violet-700", border:"border-violet-200" },
  { bg:"bg-orange-500", light:"bg-orange-50",  text:"text-orange-700", border:"border-orange-200" },
  { bg:"bg-rose-600",   light:"bg-rose-50",    text:"text-rose-700",   border:"border-rose-200"   },
  { bg:"bg-cyan-500",   light:"bg-cyan-50",    text:"text-cyan-700",   border:"border-cyan-200"   },
  { bg:"bg-amber-500",  light:"bg-amber-50",   text:"text-amber-700",  border:"border-amber-200"  },
  { bg:"bg-pink-600",   light:"bg-pink-50",    text:"text-pink-700",   border:"border-pink-200"   },
];

const snake = (players: string[], n: number) => {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const row = i % 2 === 0 ? [...players] : [...players].reverse();
    out.push(...row);
  }
  return out;
};

const calcScores = (players: string[], picks: Record<string, string[]>, results: Record<string, string>) =>
  players.map(p => {
    const myPicks = picks[p] || [];
    let total = 0;
    const breakdown = myPicks.map(team => {
      const r = ROUNDS.find(x => x.id === results[team]);
      if (r) { total += r.pts; return { team, label: r.label, pts: r.pts }; }
      return { team, label: "TBD", pts: 0 };
    });
    return { player: p, total, breakdown };
  }).sort((a, b) => b.total - a.total);

export default function App() {
  // -- Room / device state --
  const [roomCode,  setRoomCode]  = useState<string | null>(null);
  const [screen,    setScreen]    = useState<"home" | "create" | "join">("home");
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [myName,    setMyName]    = useState<string | null>(null);

  // -- Game state (synced from the room) --
  const [phase,        setPhase]        = useState("lobby");
  const [players,      setPlayers]      = useState<string[]>([]);
  const [joined,       setJoined]       = useState<Record<string, boolean>>({});
  const [newName,      setNewName]      = useState("");
  const [n,            setN]            = useState(2);
  const [picks,        setPicks]        = useState<Record<string, string[]>>({});
  const [order,        setOrder]        = useState<string[]>([]);
  const [step,         setStep]         = useState(0);
  const [results,      setResults]      = useState<Record<string, string>>({});
  const [tab,          setTab]          = useState("leaderboard");
  const [search,       setSearch]       = useState("");
  const [admin,        setAdmin]        = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast,        setToast]        = useState("");
  const [loading,      setLoading]      = useState(true);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  // On mount: restore room from URL (?room=CODE) or localStorage
  useEffect(() => {
    let saved: string | null = null;
    try {
      const fromUrl = new URL(window.location.href).searchParams.get("room");
      saved = fromUrl ? fromUrl.toUpperCase() : localStorage.getItem(LS_ROOM);
    } catch { saved = null; }
    if (saved) {
      setRoomCode(saved);
      try {
        setMyName(localStorage.getItem(lsName(saved)));
        setAdmin(localStorage.getItem(lsAdmin(saved)) === "1");
      } catch { /* ignore */ }
    } else {
      setLoading(false);
    }
  }, []);

  // Real-time listener — re-subscribes whenever the room changes
  useEffect(() => {
    if (!roomCode) { setLoading(false); return; }
    setLoading(true);
    const r = roomRef(roomCode);
    const unsubscribe = onValue(r, (snapshot) => {
      const d = snapshot.val();
      if (d) {
        setPhase(d.phase ?? "lobby");
        setPlayers(d.players ?? []);
        setN(d.n ?? 2);
        setPicks(d.picks ?? {});
        setOrder(d.order ?? []);
        setStep(d.step ?? 0);
        setResults(d.results ?? {});
        setJoined(d.joined ?? {});
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [roomCode]);

  const persist = (patch: Record<string, unknown> = {}) => {
    if (!roomCode) return;
    update(roomRef(roomCode), patch)
      .then(() => showToast("Saved ✓"))
      .catch(() => showToast("Save failed"));
  };

  // -- Room handlers --
  const createRoom = async () => {
    if (players.length < 2) return;
    setLoading(true);
    const code = await genRoomCode();
    const room = {
      phase: "lobby", players, n, picks: {}, order: [], step: 0, results: {},
      joined: {}, meta: { created: Date.now() }
    };
    await set(roomRef(code), room);
    try {
      localStorage.setItem(LS_ROOM, code);
      localStorage.setItem(lsAdmin(code), "1");
    } catch { /* ignore */ }
    setAdmin(true);
    setRoomCode(code);
    setScreen("home");
  };

  const joinRoom = async () => {
    const code = joinInput.trim().toUpperCase();
    if (!code) return;
    const snap = await get(roomRef(code));
    if (!snap.exists()) { setJoinError("No room with that code"); return; }
    try {
      localStorage.setItem(LS_ROOM, code);
      setMyName(localStorage.getItem(lsName(code)));
      setAdmin(localStorage.getItem(lsAdmin(code)) === "1");
    } catch { /* ignore */ }
    setJoinError(""); setJoinInput("");
    setRoomCode(code);
    setScreen("home");
  };

  const claimName = (name: string) => {
    if (!roomCode) return;
    setMyName(name);
    try { localStorage.setItem(lsName(roomCode), name); } catch { /* ignore */ }
    persist({ [`joined/${name}`]: true });
  };

  const leaveRoom = () => {
    try { if (roomCode) localStorage.removeItem(LS_ROOM); } catch { /* ignore */ }
    setRoomCode(null); setMyName(null); setAdmin(false); setConfirmReset(false);
    setScreen("home");
  };

  const copyCode = async () => {
    if (!roomCode) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    try { await navigator.clipboard.writeText(shareUrl); showToast("Invite link copied ✓"); }
    catch { showToast(roomCode); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-5xl mb-3">⚽</div>
        <p className="text-gray-400">Connecting...</p>
      </div>
    </div>
  );

  // ========== NO ROOM: HOME / CREATE / JOIN ==========
  if (!roomCode) {
    // -- HOME --
    if (screen === "home") return (
      <div className="min-h-screen bg-gray-950 text-white p-4">
        <div className="max-w-md mx-auto pt-16 pb-12">
          <div className="text-center mb-10">
            <div className="text-6xl mb-3">⚽</div>
            <h1 className="text-4xl font-black tracking-tight">WC 2026</h1>
            <p className="text-gray-400 mt-1 text-sm">Draft Predictor · Snake Format</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => setScreen("create")}
              className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-2xl font-black text-lg transition-all shadow-lg"
            >
              ➕ Create a Room
            </button>
            <button
              onClick={() => setScreen("join")}
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl font-black text-lg transition-all"
            >
              🔑 Join with a Code
            </button>
          </div>
          <p className="text-center text-gray-600 text-xs mt-8">
            Create a room, share the code, everyone drafts from their own phone.
          </p>
        </div>
      </div>
    );

    // -- JOIN --
    if (screen === "join") return (
      <div className="min-h-screen bg-gray-950 text-white p-4">
        <div className="max-w-md mx-auto pt-12 pb-12">
          <button onClick={() => { setScreen("home"); setJoinError(""); }} className="text-gray-500 hover:text-white text-sm mb-6">← Back</button>
          <h1 className="text-2xl font-black mb-1">Join a Room</h1>
          <p className="text-gray-400 text-sm mb-6">Enter the code the host shared with you.</p>
          <input
            value={joinInput}
            onChange={e => { setJoinInput(e.target.value.toUpperCase()); setJoinError(""); }}
            onKeyDown={e => e.key === "Enter" && joinRoom()}
            placeholder="e.g. TIGER-42"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-center text-xl font-black tracking-widest placeholder-gray-700 outline-none mb-2 focus:ring-2 focus:ring-green-500"
          />
          {joinError && <p className="text-red-400 text-sm mb-2 text-center">{joinError}</p>}
          <button
            onClick={joinRoom}
            disabled={!joinInput.trim()}
            className="w-full py-3.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-2xl font-black text-lg transition-all mt-2"
          >
            Join Room
          </button>
        </div>
      </div>
    );

    // -- CREATE (setup) --
    const addPlayer = () => {
      const name = newName.trim();
      if (!name || players.includes(name)) return;
      setPlayers(p => [...p, name]);
      setNewName("");
    };
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4">
        <div className="max-w-md mx-auto pt-6 pb-12">
          <button onClick={() => setScreen("home")} className="text-gray-500 hover:text-white text-sm mb-4">← Back</button>
          <div className="text-center mb-8">
            <div className="text-5xl mb-2">⚽</div>
            <h1 className="text-3xl font-black tracking-tight">New Room</h1>
            <p className="text-gray-400 mt-1 text-sm">Add the players, then create your room</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-5 mb-4 border border-gray-800">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Players</p>
            <div className="flex gap-2 mb-3">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addPlayer()}
                placeholder="Enter name..."
                className="flex-1 bg-gray-800 rounded-xl px-4 py-2.5 outline-none text-white placeholder-gray-600 focus:ring-2 focus:ring-green-500"
              />
              <button onClick={addPlayer} className="bg-green-600 hover:bg-green-500 px-4 rounded-xl font-black text-xl transition-colors">+</button>
            </div>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={p} className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${PC[i%PC.length].light} border ${PC[i%PC.length].border}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full ${PC[i%PC.length].bg} text-white text-xs flex items-center justify-center font-bold`}>{i+1}</span>
                    <span className={`font-semibold ${PC[i%PC.length].text}`}>{p}</span>
                  </div>
                  <button onClick={() => setPlayers(pl => pl.filter(x => x !== p))} className="text-gray-400 hover:text-red-400 text-xl font-light leading-none">×</button>
                </div>
              ))}
              {players.length === 0 && <p className="text-center text-gray-600 text-sm py-2">Add at least 2 players to start</p>}
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-5 mb-4 border border-gray-800">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Picks per player</p>
            <div className="flex gap-2">
              {[1,2,3].map(v => (
                <button
                  key={v}
                  onClick={() => setN(v)}
                  className={`flex-1 py-3 rounded-xl font-black text-2xl transition-all ${n === v ? "bg-green-600 text-white shadow-lg" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                >{v}</button>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-2 text-center">
              Snake draft · {players.length}p × {n} = {players.length * n} total picks
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-5 mb-6 border border-gray-800">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Points System (2026 Format)</p>
            <div className="grid grid-cols-2 gap-2">
              {ROUNDS.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2">
                  <span className="text-xs text-gray-300">{r.label}</span>
                  <span className="font-black text-green-400">{r.pts}pt</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={createRoom}
            disabled={players.length < 2}
            className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed rounded-2xl font-black text-xl transition-all shadow-lg"
          >
            ➕ Create Room
          </button>
        </div>
      </div>
    );
  }

  // ========== IN A ROOM ==========
  // -- Computed --
  const allPicked   = Object.values(picks).flat();
  const available   = TEAMS.filter(t => !allPicked.includes(t) && t.toLowerCase().includes(search.toLowerCase()));
  const scores      = calcScores(players, picks, results);
  const curPlayer   = step < order.length ? order[step] : null;
  const curIdx      = curPlayer ? players.indexOf(curPlayer) : -1;
  const cc          = curIdx >= 0 ? PC[curIdx % PC.length] : null;
  const medals      = ["🥇","🥈","🥉"];
  const pickedTeams = Object.values(picks).flat();
  const isMyTurn    = !!curPlayer && myName === curPlayer;
  const canPick     = isMyTurn || admin;

  // -- Handlers --
  const startDraft = () => {
    const ord = snake(players, n);
    const initPicks = Object.fromEntries(players.map(p => [p, []]));
    persist({ order: ord, step: 0, picks: initPicks, phase: "draft" });
  };

  const makePick = (team: string) => {
    if (step >= order.length) return;
    if (!canPick) return;
    const player = order[step];
    const newPicks = { ...picks, [player]: [...(picks[player] || []), team] };
    const ns = step + 1;
    const np = ns >= order.length ? "live" : "draft";
    persist({ picks: newPicks, step: ns, phase: np });
  };

  const undoPick = () => {
    if (step === 0 || !admin) return;
    const ps = step - 1;
    const pp = order[ps];
    const newPicks = { ...picks, [pp]: (picks[pp] || []).slice(0, -1) };
    persist({ picks: newPicks, step: ps, phase: "draft" });
  };

  const setResult = (team: string, rid: string) => {
    let nr: Record<string, string>;
    if (rid) {
      nr = { ...results, [team]: rid };
    } else {
      nr = { ...results };
      delete nr[team];
    }
    persist({ results: nr });
  };

  const resetGame = () => {
    persist({ phase: "lobby", picks: {}, order: [], step: 0, results: {} });
    setConfirmReset(false); setAdmin(admin); setTab("leaderboard");
  };

  // Small shared header bar for in-room screens
  const RoomBar = () => (
    <div className="flex items-center justify-between mb-4">
      <button onClick={copyCode} className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-green-700 rounded-full px-3 py-1.5 transition-colors">
        <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">Room</span>
        <span className="text-sm font-black tracking-widest text-green-400">{roomCode}</span>
        <span className="text-xs text-gray-600">📋</span>
      </button>
      <button onClick={leaveRoom} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Leave ↩</button>
    </div>
  );

  // ========== LOBBY ==========
  if (phase === "lobby") return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-md mx-auto pt-4 pb-12">
        <RoomBar />

        <div className="text-center mb-6">
          <div className="text-5xl mb-2">⚽</div>
          <h1 className="text-2xl font-black tracking-tight">Lobby</h1>
          <p className="text-gray-400 text-sm mt-1">Tap your name below to claim it on this phone.</p>
        </div>

        <div className="bg-green-950 border border-green-800 rounded-2xl p-4 mb-4 text-center">
          <p className="text-xs text-green-500 font-bold uppercase tracking-widest mb-1">Share this code</p>
          <p className="text-3xl font-black tracking-widest text-green-400">{roomCode}</p>
          <button onClick={copyCode} className="mt-2 text-xs bg-green-800 hover:bg-green-700 text-green-100 px-3 py-1.5 rounded-full font-bold transition-colors">📋 Copy invite link</button>
        </div>

        <div className="bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-800">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Who's in</p>
          <div className="space-y-2">
            {players.map((p, i) => {
              const c = PC[i % PC.length];
              const isMe = myName === p;
              const hasJoined = !!joined[p];
              return (
                <button
                  key={p}
                  onClick={() => claimName(p)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${isMe ? c.bg + " border-transparent text-white" : c.light + " " + c.border}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full ${isMe ? "bg-white/25" : c.bg} text-white text-xs flex items-center justify-center font-bold`}>{i+1}</span>
                    <span className={`font-bold ${isMe ? "text-white" : c.text}`}>{p}</span>
                  </div>
                  <span className={`text-xs font-bold ${isMe ? "text-white" : hasJoined ? "text-green-600" : "text-gray-400"}`}>
                    {isMe ? "This is me ✓" : hasJoined ? "Joined ✓" : "Tap to claim"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {admin ? (
          <button
            onClick={startDraft}
            disabled={players.length < 2}
            className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-2xl font-black text-xl transition-all shadow-lg"
          >
            🚀 Start Draft
          </button>
        ) : (
          <p className="text-center text-gray-500 text-sm py-3">Waiting for the host to start the draft…</p>
        )}
      </div>
    </div>
  );

  // ========== DRAFT ==========
  if (phase === "draft") {
    const prog = step / order.length * 100;
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4 pb-8">
        <div className="max-w-md mx-auto">
          <RoomBar />
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-black text-xl">⚽ Snake Draft</h1>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">{step}/{order.length}</span>
              {admin && step > 0 && (
                <button onClick={undoPick} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                  ↩ Undo
                </button>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-full h-1 mb-5">
            <div className="bg-green-500 h-1 rounded-full transition-all duration-300" style={{width:`${prog}%`}} />
          </div>

          {curPlayer && cc && (
            <div className={`rounded-2xl p-4 mb-4 ${isMyTurn ? cc.bg + " text-white" : cc.light + " border " + cc.border}`}>
              <p className={`text-xs font-bold uppercase tracking-wide ${isMyTurn ? "text-white/80" : "text-gray-500"}`}>
                {isMyTurn ? "Your turn" : "Now picking"}
              </p>
              <p className={`text-2xl font-black ${isMyTurn ? "text-white" : cc.text}`}>
                {curPlayer}{isMyTurn ? " (you)" : ""}
              </p>
              <p className={`text-xs mt-0.5 ${isMyTurn ? "text-white/80" : "text-gray-400"}`}>
                Pick {(picks[curPlayer]||[]).length + 1} of {n}
              </p>
            </div>
          )}

          <div className="bg-gray-900 rounded-2xl p-3 mb-4 border border-gray-800">
            {players.map((p, i) => {
              const c = PC[i%PC.length];
              const myPicks = picks[p] || [];
              return (
                <div key={p} className="flex items-center gap-2 py-1.5 border-b border-gray-800 last:border-0">
                  <span className={`text-xs font-bold w-16 truncate ${c.text}`}>{p}</span>
                  <div className="flex gap-1 flex-wrap flex-1">
                    {myPicks.map(t => (
                      <span key={t} className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.light} ${c.text}`}>
                        {TEAM_FLAGS[t]} {t}
                      </span>
                    ))}
                    {Array.from({length: n - myPicks.length}).map((_, j) => (
                      <span key={j} className="text-xs px-3 py-0.5 rounded-full bg-gray-800 text-gray-700">—</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-900 rounded-2xl p-3 mb-4 border border-gray-800">
            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Up Next</p>
            <div className="flex gap-1.5 flex-wrap">
              {order.slice(step, step + 8).map((p, i) => {
                const pi = players.indexOf(p);
                const c = PC[pi%PC.length];
                return (
                  <span key={i} className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${i === 0 ? c.bg+" text-white" : c.light+" "+c.text}`}>
                    {p}
                  </span>
                );
              })}
            </div>
          </div>

          {canPick ? (
            <>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Search countries..."
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 outline-none mb-3 focus:ring-2 focus:ring-green-500"
              />
              {admin && !isMyTurn && (
                <p className="text-amber-400 text-xs mb-2 text-center">Admin override — picking for {curPlayer}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {available.map(team => (
                  <button
                    key={team}
                    onClick={() => makePick(team)}
                    className="bg-gray-900 hover:bg-gray-800 active:scale-95 border border-gray-800 hover:border-green-700 rounded-xl px-3 py-3 text-left transition-all flex items-center gap-2 group"
                  >
                    <span className="text-2xl">{TEAM_FLAGS[team]}</span>
                    <span className="text-sm font-semibold text-gray-200 group-hover:text-white">{team}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3 animate-pulse">⏳</div>
              <p className="text-gray-300 font-bold">Waiting for {curPlayer} to pick…</p>
              <p className="text-gray-600 text-xs mt-1">
                {myName ? `You're playing as ${myName}. Your turn will light up here.` : "Tip: go back to the lobby and claim your name."}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== LIVE ==========
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="sticky top-0 z-20 bg-gray-950 border-b border-gray-800">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={copyCode} className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-500 font-bold uppercase tracking-wide">Room</span>
              <span className="font-black tracking-widest text-green-400">{roomCode}</span>
            </button>
            <button onClick={leaveRoom} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Leave ↩</button>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚽</span>
              <h1 className="font-black">WC 2026 Predictor</h1>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            </div>
            <button
              onClick={() => { setAdmin(!admin); setConfirmReset(false); }}
              className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${admin ? "bg-amber-400 text-gray-900" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
            >
              {admin ? "🔓 Admin" : "🔒 View"}
            </button>
          </div>
          <div className="flex gap-1">
            {[["leaderboard","🏆"],["picks","🎯"],["results","📊"]].map(([t, icon]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-colors ${tab === t ? "bg-green-600 text-white" : "bg-gray-900 text-gray-500 hover:bg-gray-800"}`}
              >
                {icon} {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 pb-12">

        {tab === "leaderboard" && (
          <div className="space-y-3">
            {scores.map((s, i) => {
              const pi = players.indexOf(s.player);
              const c = PC[pi%PC.length];
              return (
                <div key={s.player} className={`rounded-2xl p-4 border ${c.border} ${c.light}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{medals[i] || `#${i+1}`}</span>
                      <span className={`font-black text-xl ${c.text}`}>{s.player}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-4xl font-black ${c.text}`}>{s.total}</span>
                      <span className="text-gray-400 text-sm font-medium">pt</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {s.breakdown.map(b => (
                      <div key={b.team} className="flex items-center justify-between bg-white bg-opacity-60 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{TEAM_FLAGS[b.team]}</span>
                          <span className={`text-sm font-bold ${c.text}`}>{b.team}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{b.label}</span>
                          <span className={`font-black text-sm ${c.text}`}>{b.pts > 0 ? `+${b.pts}` : "–"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-center text-gray-700 text-xs pt-2">Scores update live for all players</p>
          </div>
        )}

        {tab === "picks" && (
          <div className="space-y-6">
            {players.map((player, i) => {
              const c = PC[i%PC.length];
              const myPicks = picks[player] || [];
              return (
                <div key={player}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-1 h-6 rounded-full ${c.bg}`} />
                    <h3 className={`font-black text-lg ${c.text}`}>{player}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {myPicks.map(team => {
                      const r = ROUNDS.find(x => x.id === results[team]);
                      return (
                        <div key={team} className={`rounded-2xl p-4 border ${c.border} ${c.light}`}>
                          <div className="text-4xl mb-2">{TEAM_FLAGS[team]}</div>
                          <div className={`font-black text-sm ${c.text}`}>{team}</div>
                          {r
                            ? <div className="mt-1"><p className="text-xs text-gray-500">{r.label}</p><p className={`font-black text-xl ${c.text}`}>+{r.pts}</p></div>
                            : <p className="text-xs text-gray-400 mt-1">Still playing...</p>
                          }
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "results" && (
          <div>
            {!admin && (
              <div className="bg-amber-950 border border-amber-800 rounded-xl p-3 mb-4 text-amber-300 text-sm flex items-center gap-2">
                <span>🔒</span>
                <span>Tap <strong>Admin</strong> top right to update results</span>
              </div>
            )}
            <p className="text-xs text-gray-600 font-bold uppercase tracking-widest mb-3">Picked Teams</p>
            <div className="space-y-2 mb-6">
              {TEAMS.filter(t => pickedTeams.includes(t)).map(team => {
                const rid   = results[team];
                const owner = players.find(p => (picks[p]||[]).includes(team));
                const oi    = owner ? players.indexOf(owner) : 0;
                const c     = PC[oi%PC.length];
                return (
                  <div key={team} className={`rounded-xl px-4 py-3 flex items-center gap-3 border ${c.border} ${c.light}`}>
                    <span className="text-2xl">{TEAM_FLAGS[team]}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${c.text}`}>{team}</p>
                      <p className="text-xs text-gray-400">{owner}</p>
                    </div>
                    <select
                      value={rid || ""}
                      onChange={e => admin && setResult(team, e.target.value)}
                      disabled={!admin}
                      className="bg-white text-gray-800 text-xs rounded-lg px-2 py-1.5 outline-none disabled:opacity-40 border border-gray-200 focus:ring-2 focus:ring-green-500 cursor-pointer"
                    >
                      <option value="">TBD</option>
                      {ROUNDS.map(r => <option key={r.id} value={r.id}>{r.label} · {r.pts}pt</option>)}
                    </select>
                  </div>
                );
              })}
            </div>

            {admin && (
              <div className="border-t border-gray-800 pt-4">
                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="w-full py-3 border border-red-900 text-red-500 hover:bg-red-950 rounded-xl text-sm font-bold transition-colors"
                  >
                    🗑️ Reset Draft (this room)
                  </button>
                ) : (
                  <div>
                    <p className="text-center text-sm text-gray-400 mb-3">Sure? This clears picks &amp; results for everyone in {roomCode} and returns to the lobby.</p>
                    <div className="flex gap-2">
                      <button onClick={resetGame} className="flex-1 py-3 bg-red-700 hover:bg-red-600 rounded-xl text-sm font-bold transition-colors">Yes, reset</button>
                      <button onClick={() => setConfirmReset(false)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-bold transition-colors">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 text-white text-sm px-4 py-2 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
