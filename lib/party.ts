import type { PoolClient } from "pg";
import { pool } from "./db";
import { makeCode } from "./repo";
import { DEFAULT_BOSS, bossById, isBossId } from "./bosses";

const MAX_PLAYERS = 5;
const START_LIVES = 4;
const ROUND_MS = 30_000;

export type RaidModule = { id: string; code: string; name: string; label: string };

/** The curriculum a raid draws from: the first published module holding a full
 *  party's worth of questions. Resolved at run time — the demo module id that used
 *  to be hardcoded here no longer exists. */
export async function raidModule(): Promise<RaidModule | null> {
  const { rows } = await pool.query<{ id: string; code: string; name: string }>(
    `select m.id, m.code, m.name
       from modules m
       join lessons l on l.module_id = m.id and l.status = 'published'
       join blocks b on b.lesson_id = l.id and b.kind = 'mcq'
      group by m.id, m.code, m.name, m.ord
     having count(b.id) >= $1
      order by (m.id like 'ict.%') asc, m.ord, m.id
      limit 1`,
    [MAX_PLAYERS],
  );
  const mod = rows[0];
  return mod ? { ...mod, label: `${mod.code} · ${mod.name}` } : null;
}

export type RaidSource = { id: string; label: string; questions: number };

/** Every curriculum that can fill a party's deck, for the lobby picker. */
export async function raidSources(allowed?: string[]): Promise<RaidSource[]> {
  const { rows } = await pool.query<{ id: string; code: string; name: string; questions: number }>(
    `select m.id, m.code, m.name, count(b.id)::int as questions
       from modules m
       join lessons l on l.module_id = m.id and l.status = 'published'
       join blocks b on b.lesson_id = l.id and b.kind = 'mcq'
      group by m.id, m.code, m.name, m.ord
     having count(b.id) >= $1
      order by (m.id like 'ict.%') asc, m.ord, m.id`,
    [MAX_PLAYERS],
  );
  const visible = allowed ? rows.filter((r) => allowed.includes(r.id)) : rows;
  return visible.map((r) => ({ id: r.id, label: `${r.code} · ${r.name}`, questions: r.questions }));
}

export type PartyQuestion = { q: string; a: string[]; c?: number };

export type PartyView = {
  code: string;
  status: "lobby" | "live" | "done";
  round: number;
  total: number;
  roundEndsAt: string | null;
  serverTime: string;
  question: PartyQuestion | null;
  players: {
    name: string;
    lives: number;
    score: number;
    alive: boolean;
    /** questions this player has faced — their own pace, not the party's */
    progress: number;
    /** true once this player has run out of questions */
    finished: boolean;
    you: boolean;
  }[];
  you: {
    lives: number;
    score: number;
    alive: boolean;
    answered: boolean;
    choice: number | null;
  };
  ended: boolean;
  /** the curriculum this raid draws from, e.g. "P1A · Paper 1 · Section A" */
  moduleLabel: string | null;
  /** which boss this party chose, see lib/bosses.ts */
  boss: string;
  /** true when the signed-in player created this party */
  host: boolean;
  /** the round that settled most recently, so clients can show the answer */
  previous: {
    round: number;
    q: string;
    a: string[];
    c: number;
    choice: number | null;
  } | null;
};

export type PartyFailure = { ok: false; error: string; status: number };
export type PartyResult = { ok: true; view: PartyView } | PartyFailure;
export type LeaveResult = { ok: true } | PartyFailure;

type PartyRow = {
  id: string;
  code: string;
  host_id: string;
  module_id: string | null;
  boss_id: string;
  status: "lobby" | "live" | "done";
  round: number;
  round_started: Date | null;
  question_ids: string[];
  db_now: Date;
};

type PlayerRow = {
  user_id: string;
  lives: number;
  score: number;
  name: string;
  pos: number;
  deck: string[] | null;
};
type AnswerRow = { user_id: string; choice: number; correct: boolean };
type BlockRow = { payload: { prompt?: unknown; options?: unknown; answer?: unknown } };

const fail = (error: string, status: number): PartyFailure => ({ ok: false, error, status });

/** "abc-123" -> "ABC123"; anything that cannot be a code is left to fail the lookup. */
function normaliseCode(raw: string) {
  return (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function lockParty(client: PoolClient, code: string): Promise<PartyRow | null> {
  const { rows } = await client.query<PartyRow>(
    `select id, code, host_id, module_id, boss_id, status, round, round_started, question_ids,
            now() as db_now
       from parties where code = $1 for update`,
    [code],
  );
  return rows[0] ?? null;
}

async function loadPlayers(client: PoolClient, partyId: string): Promise<PlayerRow[]> {
  const { rows } = await client.query<PlayerRow>(
    `select pp.user_id, pp.lives, pp.score, pp.pos, pp.deck, u.name
       from party_players pp join users u on u.id = pp.user_id
      where pp.party_id = $1
      order by pp.joined_at, u.name`,
    [partyId],
  );
  return rows;
}

async function loadAnswers(client: PoolClient, partyId: string, round: number): Promise<AnswerRow[]> {
  const { rows } = await client.query<AnswerRow>(
    `select user_id, choice, correct from party_answers
      where party_id = $1 and round = $2`,
    [partyId, round],
  );
  return rows;
}

async function loadQuestion(client: PoolClient, blockId: string | undefined): Promise<PartyQuestion | null> {
  if (!blockId) return null;
  const { rows } = await client.query<BlockRow>("select payload from blocks where id = $1::uuid", [blockId]);
  const payload = rows[0]?.payload;
  if (!payload) return null;
  const raw = Array.isArray(payload.options) ? payload.options : [];
  const a = raw.map((o) => {
    const row = (typeof o === "object" && o !== null ? o : {}) as { text?: unknown };
    return typeof row.text === "string" ? row.text : "";
  });
  return {
    q: typeof payload.prompt === "string" ? payload.prompt : "",
    a,
    c: Number(payload.answer ?? 0),
  };
}

const PIP_HP = 10;

const shuffle = <T,>(list: T[]): T[] => {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
};

const deckOf = (party: PartyRow, player: PlayerRow) => player.deck ?? party.question_ids;

/** When the question in front of you started: the moment you answered the one
 *  before it, or the moment the host started the raid. */
async function questionStartedAt(
  client: PoolClient,
  party: PartyRow,
  userId: string,
  pos: number,
): Promise<Date | null> {
  if (pos <= 0) return party.round_started;
  const { rows } = await client.query<{ created_at: Date }>(
    `select created_at from party_answers
      where party_id = $1 and user_id = $2 and round = $3`,
    [party.id, userId, pos - 1],
  );
  return rows[0]?.created_at ?? party.round_started;
}

/** True when the clock on this player's current question has run out. */
async function lateFor(
  client: PoolClient,
  party: PartyRow,
  userId: string,
  pos: number,
): Promise<boolean> {
  const started = await questionStartedAt(client, party, userId, pos);
  return started !== null && party.db_now.getTime() - started.getTime() >= ROUND_MS;
}

/**
 * The 30-second clock is real, not decoration: leave a question unanswered for
 * longer than ROUND_MS and the raid takes the life and moves you on. The miss is
 * stored as a party_answers row with choice -1 so a reload cannot resurrect the
 * question and the reveal still has something to show.
 *
 * One miss per request, deliberately: a tab left open for an hour must not burn
 * a whole deck of lives the moment it comes back.
 */
async function settleTimeout(
  client: PoolClient,
  party: PartyRow,
  status: PartyRow["status"],
  me: PlayerRow,
  deck: string[],
): Promise<boolean> {
  if (status !== "live" || me.lives <= 0 || me.pos >= deck.length) return false;
  const started = await questionStartedAt(client, party, me.user_id, me.pos);
  if (!started) return false;
  const elapsed = party.db_now.getTime() - started.getTime();
  if (elapsed < ROUND_MS) return false;

  const { rowCount } = await client.query(
    `insert into party_answers (party_id, round, user_id, choice, correct, ms)
     values ($1, $2, $3, -1, false, $4)
     on conflict do nothing`,
    [party.id, me.pos, me.user_id, Math.min(Math.round(elapsed), ROUND_MS)],
  );
  if (!rowCount) return false;

  await client.query(
    `update party_players
        set pos = pos + 1, lives = greatest(lives - 1, 0)
      where party_id = $1 and user_id = $2`,
    [party.id, me.user_id],
  );
  me.pos += 1;
  me.lives = Math.max(0, me.lives - 1);
  return true;
}

/** The raid ends when the boss is out of pips, or nobody can answer another one. */
function raidOver(party: PartyRow, players: PlayerRow[]): boolean {
  const totalCorrect = players.reduce((n, p) => n + p.score, 0);
  if (totalCorrect >= bossById(party.boss_id).pips) return true;
  if (players.every((p) => p.lives <= 0)) return true;
  return players.every((p) => p.pos >= deckOf(party, p).length);
}

/** Create a party and seat the host. */
export async function createParty(
  userId: string,
  moduleId?: string,
  bossId?: string,
  allowed?: string[],
): Promise<PartyResult> {
  /* a student raids their own classes, so the default comes from those first */
  const first = (await raidSources(allowed))[0]?.id;
  const module = (moduleId ?? "").trim() || first || (await raidModule())?.id;
  if (!module) return fail("No curriculum has enough questions to raid yet.", 400);
  const { rows: mods } = await pool.query<{ id: string }>("select id from modules where id = $1", [module]);
  if (!mods[0]) return fail("That module does not exist.", 400);

  const boss = isBossId(bossId) ? bossId : DEFAULT_BOSS;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeCode(6);
    const { rows } = await pool.query<{ id: string }>(
      `insert into parties (code, host_id, module_id, boss_id) values ($1, $2, $3, $4)
       on conflict (code) do nothing
       returning id`,
      [code, userId, module, boss],
    );
    const id = rows[0]?.id;
    if (!id) continue;
    await pool.query("insert into party_players (party_id, user_id, lives) values ($1, $2, $3)", [
      id,
      userId,
      START_LIVES,
    ]);
    return stateFor(userId, code);
  }

  return fail("Could not create a party. Try again.", 500);
}

/**
 * Host only, lobby only: swap the boss before anybody fights. The choice lives
 * on the party row, so joiners see the new boss on their next poll.
 */
export async function changeBoss(
  userId: string,
  rawCode: string,
  bossId: string,
): Promise<PartyResult> {
  const code = normaliseCode(rawCode);
  if (!/^[A-Z0-9]{6}$/.test(code)) return fail("That code does not exist.", 404);
  if (!isBossId(bossId)) return fail("That boss does not exist.", 400);

  const client = await pool.connect();
  let failure: PartyFailure | null = null;
  try {
    await client.query("begin");
    const party = await lockParty(client, code);
    if (!party) failure = fail("That code does not exist.", 404);
    else if (party.host_id !== userId) failure = fail("Only the host can change the boss.", 403);
    else if (party.status !== "lobby") failure = fail("The raid has already started.", 400);
    else {
      await client.query("update parties set boss_id = $2 where id = $1", [party.id, bossId]);
    }
    await client.query(failure ? "rollback" : "commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (failure) return failure;
  return stateFor(userId, code);
}

/** Host only, lobby only: change which curriculum the raid draws from. */
export async function changeSource(
  userId: string,
  rawCode: string,
  moduleId: string,
  allowed?: string[],
): Promise<PartyResult> {
  if (allowed && !allowed.includes(moduleId))
    return fail("That class is not one of yours.", 403);
  const code = normaliseCode(rawCode);
  if (!/^[A-Z0-9]{6}$/.test(code)) return fail("That code does not exist.", 404);

  const { rows: mods } = await pool.query<{ n: number }>(
    `select count(b.id)::int as n
       from lessons l join blocks b on b.lesson_id = l.id and b.kind = 'mcq'
      where l.module_id = $1 and l.status = 'published'`,
    [moduleId],
  );
  if (!mods[0] || Number(mods[0].n) < MAX_PLAYERS)
    return fail("That curriculum does not have enough questions.", 400);

  const client = await pool.connect();
  let failure: PartyFailure | null = null;
  try {
    await client.query("begin");
    const party = await lockParty(client, code);
    if (!party) failure = fail("That code does not exist.", 404);
    else if (party.host_id !== userId) failure = fail("Only the host can change the class.", 403);
    else if (party.status !== "lobby") failure = fail("The raid has already started.", 400);
    else await client.query("update parties set module_id = $2 where id = $1", [party.id, moduleId]);
    await client.query(failure ? "rollback" : "commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (failure) return failure;
  return stateFor(userId, code);
}

/** Join a lobby by code. Idempotent for players already seated. */
export async function joinParty(userId: string, rawCode: string): Promise<PartyResult> {
  const code = normaliseCode(rawCode);
  if (!/^[A-Z0-9]{6}$/.test(code)) return fail("That code does not exist.", 404);

  const client = await pool.connect();
  let failure: PartyFailure | null = null;
  try {
    await client.query("begin");
    const party = await lockParty(client, code);
    if (!party) {
      failure = fail("That code does not exist.", 404);
    } else {
      const players = await loadPlayers(client, party.id);
      if (players.some((p) => p.user_id === userId)) {
        /* already in: fall through to the current view */
      } else if (party.status !== "lobby") {
        failure = fail("The raid has already started.", 400);
      } else if (players.length >= MAX_PLAYERS) {
        failure = fail("The party is full.", 400);
      } else {
        await client.query("insert into party_players (party_id, user_id) values ($1, $2)", [
          party.id,
          userId,
        ]);
      }
    }
    await client.query(failure ? "rollback" : "commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (failure) return failure;
  return stateFor(userId, code);
}

/** The most recent party this member belongs to, if any. */
export async function partyForUser(userId: string): Promise<PartyView | null> {
  const { rows } = await pool.query<{ code: string }>(
    `select p.code from party_players pp join parties p on p.id = pp.party_id
      where pp.user_id = $1
      order by p.created_at desc
      limit 1`,
    [userId],
  );
  const code = rows[0]?.code;
  if (!code) return null;
  const result = await stateFor(userId, code);
  return result.ok ? result.view : null;
}

/** Everything the poll endpoint needs: settle if due, then read the party. */
export async function stateFor(userId: string, rawCode: string): Promise<PartyResult> {
  const code = normaliseCode(rawCode);
  if (!/^[A-Z0-9]{6}$/.test(code)) return fail("That code does not exist.", 404);

  const client = await pool.connect();
  try {
    await client.query("begin");
    const party = await lockParty(client, code);
    if (!party) {
      await client.query("rollback");
      return fail("That code does not exist.", 404);
    }

    const players = await loadPlayers(client, party.id);
    const me = players.find((p) => p.user_id === userId);
    if (!me) {
      await client.query("rollback");
      return fail("You are not in this party.", 403);
    }

    /* finish the raid the moment the last hit lands, whoever is polling */
    let status = party.status;
    if (status === "live" && raidOver(party, players)) {
      await client.query("update parties set status = 'done' where id = $1", [party.id]);
      status = "done";
    }

    const myDeck = deckOf(party, me);

    /* the question clock runs on the server, so a reload cannot buy time */
    if ((await settleTimeout(client, party, status, me, myDeck)) && raidOver(party, players)) {
      await client.query("update parties set status = 'done' where id = $1", [party.id]);
      status = "done";
    }

    /* your own question, at your own pace: players never share a slot */
    const myQuestion =
      status === "live" && me.lives > 0 && me.pos < myDeck.length
        ? await loadQuestion(client, myDeck[me.pos])
        : null;

    /* how long is left on the question in front of you (null outside a live
       question), so the client can count down against the server's clock */
    const started = myQuestion ? await questionStartedAt(client, party, userId, me.pos) : null;
    const roundEndsAt = started ? new Date(started.getTime() + ROUND_MS).toISOString() : null;

    /* the question you just answered, for the reveal */
    let previous: PartyView["previous"] = null;
    if (me.pos >= 1) {
      const prevIndex = me.pos - 1;
      const { rows: answered } = await client.query<{ choice: number }>(
        "select choice from party_answers where party_id = $1 and user_id = $2 and round = $3",
        [party.id, userId, prevIndex],
      );
      const settled = await loadQuestion(client, myDeck[prevIndex]);
      if (answered[0] && settled) {
        previous = {
          round: prevIndex + 1,
          q: settled.q,
          a: settled.a,
          c: settled.c ?? 0,
          choice: answered[0].choice < 0 ? null : answered[0].choice,
        };
      }
    }

    let moduleLabel: string | null = null;
    if (party.module_id) {
      const { rows: mod } = await client.query<{ code: string; name: string }>(
        "select code, name from modules where id = $1",
        [party.module_id],
      );
      if (mod[0]) moduleLabel = `${mod[0].code} · ${mod[0].name}`;
    }

    const view: PartyView = {
      code: party.code,
      status,
      round: Math.min(me.pos + 1, Math.max(1, myDeck.length)),
      total: myDeck.length,
      roundEndsAt,
      serverTime: party.db_now.toISOString(),
      question: myQuestion ? { q: myQuestion.q, a: myQuestion.a } : null,
      players: players.map((p) => ({
        name: p.name,
        lives: p.lives,
        score: p.score,
        alive: p.lives > 0,
        progress: p.pos,
        finished: p.pos >= deckOf(party, p).length,
        you: p.user_id === userId,
      })),
      you: {
        lives: me.lives,
        score: me.score,
        alive: me.lives > 0,
        answered: false,
        choice: null,
      },
      ended: status === "done",
      moduleLabel: moduleLabel,
      boss: party.boss_id,
      host: party.host_id === userId,
      previous,
    };

    await client.query("commit");
    return { ok: true, view };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Host only: pick a shuffled deck and put the party live on round 1. */
export async function startParty(userId: string, rawCode: string): Promise<PartyResult> {
  const code = normaliseCode(rawCode);
  if (!/^[A-Z0-9]{6}$/.test(code)) return fail("That code does not exist.", 404);

  const client = await pool.connect();
  let failure: PartyFailure | null = null;
  try {
    await client.query("begin");
    const party = await lockParty(client, code);
    if (!party) {
      failure = fail("That code does not exist.", 404);
    } else if (party.host_id !== userId) {
      failure = fail("Only the host can start the raid.", 403);
    } else if (party.status === "live") {
      /* already running: return the current view */
    } else if (party.status === "done") {
      failure = fail("This raid has already finished.", 400);
    } else if (!party.module_id) {
      failure = fail("This party has no module to draw questions from.", 400);
    } else {
      const { rows } = await client.query<{ id: string }>(
        /* distinct on the prompt: two frames can hold the same question, and a
           raid must never show one player the same wording twice */
        `select distinct on (b.payload ->> 'prompt') b.id::text as id
           from blocks b join lessons l on l.id = b.lesson_id
          where l.module_id = $1 and l.status = 'published' and b.kind = 'mcq'
            /* a raid has no room for the data table an exam question can carry,
               so a bare-table item would arrive unanswerable */
            and (b.payload -> 'code') is null
          order by b.payload ->> 'prompt', random()`,
        [party.module_id],
      );
      if (rows.length === 0) {
        failure = fail("This module has no questions to raid yet.", 400);
      } else {
        const deck = rows.map((r) => r.id);
        const players = await loadPlayers(client, party.id);
        /* every player draws from their own shuffle, so two people in the same
           raid are never looking at the same question at the same moment */
        const opened = new Set<string>();
        for (const player of players) {
          let theirs = shuffle(deck);
          for (let guard = 0; opened.has(theirs[0]!) && guard < 12; guard++) theirs = shuffle(deck);
          if (theirs[0]) opened.add(theirs[0]);
          await client.query(
            `update party_players
                set deck = $1, pos = 0, lives = $2, score = 0
              where party_id = $3 and user_id = $4`,
            [theirs, START_LIVES, party.id, player.user_id],
          );
        }
        await client.query(
          `update parties
              set status = 'live', round = 1, round_started = now(), question_ids = $1
            where id = $2`,
          [deck, party.id],
        );
      }
    }
    await client.query(failure ? "rollback" : "commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (failure) return failure;
  return stateFor(userId, code);
}

/**
 * Answer your own question. There is no round to wait for: the reply already
 * carries your next question, and the boss takes damage the moment you are right.
 */
export async function submitAnswer(
  userId: string,
  rawCode: string,
  choice: number,
  round?: number,
): Promise<PartyResult> {
  const code = normaliseCode(rawCode);
  if (!/^[A-Z0-9]{6}$/.test(code)) return fail("That code does not exist.", 404);
  if (!Number.isInteger(choice) || choice < 0) return fail("Pick an answer.", 400);

  const client = await pool.connect();
  let failure: PartyFailure | null = null;
  try {
    await client.query("begin");
    const party = await lockParty(client, code);
    if (!party) {
      failure = fail("That code does not exist.", 404);
    } else if (party.status !== "live") {
      failure = fail("The raid is not running.", 400);
    } else {
      const players = await loadPlayers(client, party.id);
      const me = players.find((p) => p.user_id === userId);
      const myDeck = me ? deckOf(party, me) : [];
      if (!me) {
        failure = fail("You are not in this party.", 403);
      } else if (me.lives <= 0) {
        failure = fail("You are down — spectating now.", 403);
      } else if (me.pos >= myDeck.length) {
        failure = fail("You have answered every question in this raid.", 400);
      } else if (round !== undefined && round !== me.pos + 1) {
        failure = fail("That question has already been answered.", 400);
      } else {
        const question = await loadQuestion(client, myDeck[me.pos]);
        if (!question) {
          failure = fail("There is no question for you right now.", 400);
        } else if (choice >= question.a.length) {
          failure = fail("Pick one of the answers.", 400);
        } else if (await lateFor(client, party, userId, me.pos)) {
          /* the clock beat the tap (a backgrounded tab polls slowly): settle the
             question as a miss instead of banking an answer from a stale screen */
          await settleTimeout(client, party, party.status, me, myDeck);
          if (raidOver(party, players)) {
            await client.query("update parties set status = 'done' where id = $1", [party.id]);
          }
        } else {
          const correct = choice === question.c;
          const { rowCount } = await client.query(
            `insert into party_answers (party_id, round, user_id, choice, correct, ms)
             values ($1, $2, $3, $4, $5, 0)
             on conflict do nothing`,
            [party.id, me.pos, userId, choice, correct],
          );
          if (!rowCount) {
            failure = fail("You already answered this question.", 400);
          } else {
            await client.query(
              `update party_players
                  set pos    = pos + 1,
                      score  = score + $1,
                      lives  = case when $1 = 1 then lives else greatest(lives - 1, 0) end
                where party_id = $2 and user_id = $3`,
              [correct ? 1 : 0, party.id, userId],
            );
            const after = players.map((p) =>
              p.user_id === userId
                ? { ...p, pos: p.pos + 1, score: p.score + (correct ? 1 : 0), lives: correct ? p.lives : Math.max(0, p.lives - 1) }
                : p,
            );
            if (raidOver(party, after)) {
              await client.query("update parties set status = 'done' where id = $1", [party.id]);
            }
          }
        }
      }
    }
    await client.query(failure ? "rollback" : "commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (failure) return failure;
  return stateFor(userId, code);
}

/** Leave the party; the host's seat passes to the earliest remaining player. */
export async function leaveParty(userId: string, rawCode: string): Promise<LeaveResult> {
  const code = normaliseCode(rawCode);
  if (!/^[A-Z0-9]{6}$/.test(code)) return fail("That code does not exist.", 404);

  const client = await pool.connect();
  let failure: PartyFailure | null = null;
  try {
    await client.query("begin");
    const party = await lockParty(client, code);
    if (!party) {
      failure = fail("That code does not exist.", 404);
    } else {
      const players = await loadPlayers(client, party.id);
      if (!players.some((p) => p.user_id === userId)) {
        failure = fail("You are not in this party.", 403);
      } else {
        await client.query("delete from party_players where party_id = $1 and user_id = $2", [
          party.id,
          userId,
        ]);
        const { rows } = await client.query<{ user_id: string }>(
          `select user_id from party_players where party_id = $1 order by joined_at limit 1`,
          [party.id],
        );
        const next = rows[0]?.user_id;
        if (!next) {
          await client.query("delete from parties where id = $1", [party.id]);
        } else if (party.host_id === userId) {
          await client.query("update parties set host_id = $1 where id = $2", [next, party.id]);
        }
      }
    }
    await client.query(failure ? "rollback" : "commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (failure) return failure;
  return { ok: true };
}
