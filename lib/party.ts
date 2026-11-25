import type { PoolClient } from "pg";
import { pool } from "./db";
import { makeCode } from "./repo";

const DEFAULT_MODULE = "ict.e2c";
const MAX_PLAYERS = 5;
const START_LIVES = 4;
const ROUND_MS = 30_000;

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
    answered: boolean;
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
  status: "lobby" | "live" | "done";
  round: number;
  round_started: Date | null;
  question_ids: string[];
  db_now: Date;
};

type PlayerRow = { user_id: string; lives: number; score: number; name: string };
type AnswerRow = { user_id: string; choice: number; correct: boolean };
type BlockRow = { payload: { prompt?: unknown; options?: unknown; answer?: unknown } };

const fail = (error: string, status: number): PartyFailure => ({ ok: false, error, status });

/** "abc-123" -> "ABC123"; anything that cannot be a code is left to fail the lookup. */
function normaliseCode(raw: string) {
  return (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function lockParty(client: PoolClient, code: string): Promise<PartyRow | null> {
  const { rows } = await client.query<PartyRow>(
    `select id, code, host_id, module_id, status, round, round_started, question_ids, now() as db_now
       from parties where code = $1 for update`,
    [code],
  );
  return rows[0] ?? null;
}

async function loadPlayers(client: PoolClient, partyId: string): Promise<PlayerRow[]> {
  const { rows } = await client.query<PlayerRow>(
    `select pp.user_id, pp.lives, pp.score, u.name
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

type Settlement = {
  status: "lobby" | "live" | "done";
  round: number;
  started: Date | null;
};

/**
 * Advance the raid at most one round. Runs inside the caller's transaction while
 * the parties row is locked, so two polls cannot settle the same round twice.
 */
async function settle(
  client: PoolClient,
  party: PartyRow,
  players: PlayerRow[],
): Promise<Settlement> {
  const total = party.question_ids.length;
  let status = party.status;
  let round = party.round;

  if (status !== "live") return { status, round, started: party.round_started };

  if (total === 0) {
    await client.query("update parties set status = 'done' where id = $1", [party.id]);
    return { status: "done", round, started: null };
  }

  const alive = players.filter((p) => p.lives > 0);
  if (alive.length === 0) {
    await client.query("update parties set status = 'done' where id = $1", [party.id]);
    return { status: "done", round, started: null };
  }

  const answers = await loadAnswers(client, party.id, round);
  const byUser = new Map(answers.map((a) => [a.user_id, a]));
  const allAnswered = alive.every((p) => byUser.has(p.user_id));
  const started = party.round_started;
  const expired = !!started && party.db_now.getTime() - started.getTime() >= ROUND_MS;
  if (!allAnswered && !expired) return { status, round, started };

  for (const player of alive) {
    const good = byUser.get(player.user_id)?.correct === true;
    const lives = good ? player.lives : Math.max(0, player.lives - 1);
    const score = good ? player.score + 1 : player.score;
    if (lives === player.lives && score === player.score) continue;
    await client.query(
      "update party_players set lives = $1, score = $2 where party_id = $3 and user_id = $4",
      [lives, score, party.id, player.user_id],
    );
    player.lives = lives;
    player.score = score;
  }

  round += 1;
  const down = players.every((p) => p.lives <= 0);
  const done = down || round > total;
  const { rows } = await client.query<{ round_started: Date }>(
    `update parties
        set round = $1, round_started = now(), status = $2
      where id = $3
      returning round_started`,
    [round, done ? "done" : "live", party.id],
  );
  if (done) return { status: "done", round, started: null };
  status = "live";
  return { status, round, started: rows[0]?.round_started ?? null };
}

/** Create a party and seat the host. */
export async function createParty(userId: string, moduleId?: string): Promise<PartyResult> {
  const module = (moduleId ?? "").trim() || DEFAULT_MODULE;
  const { rows: mods } = await pool.query<{ id: string }>("select id from modules where id = $1", [module]);
  if (!mods[0]) return fail("That module does not exist.", 400);

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeCode(6);
    const { rows } = await pool.query<{ id: string }>(
      `insert into parties (code, host_id, module_id) values ($1, $2, $3)
       on conflict (code) do nothing
       returning id`,
      [code, userId, module],
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
    if (!players.some((p) => p.user_id === userId)) {
      await client.query("rollback");
      return fail("You are not in this party.", 403);
    }

    const { status, round, started } = await settle(client, party, players);
    const total = party.question_ids.length;
    const live = status === "live";

    const currentRound = live && round >= 1 && round <= total ? round : 0;
    const question = currentRound ? await loadQuestion(client, party.question_ids[currentRound - 1]) : null;

    const currentAnswers = currentRound ? await loadAnswers(client, party.id, currentRound) : [];
    const currentByUser = new Map(currentAnswers.map((a) => [a.user_id, a]));

    /* The round that just settled carries the correct answer for the reveal. */
    const prevRound = Math.max(0, round - 1);
    let previous: PartyView["previous"] = null;
    if (prevRound >= 1 && prevRound <= total) {
      const settled = await loadQuestion(client, party.question_ids[prevRound - 1]);
      if (settled) {
        const answers = await loadAnswers(client, party.id, prevRound);
        const mine = answers.find((a) => a.user_id === userId);
        previous = {
          round: prevRound,
          q: settled.q,
          a: settled.a,
          c: settled.c ?? 0,
          choice: mine ? mine.choice : null,
        };
      }
    }

    const me = players.find((p) => p.user_id === userId);
    if (!me) {
      await client.query("rollback");
      return fail("You are not in this party.", 403);
    }

    const view: PartyView = {
      code: party.code,
      status,
      round: status === "lobby" ? 0 : status === "done" ? Math.max(1, round - 1) : round,
      total,
      roundEndsAt:
        live && started ? new Date(started.getTime() + ROUND_MS).toISOString() : null,
      serverTime: party.db_now.toISOString(),
      question: currentRound && question ? { q: question.q, a: question.a } : null,
      players: players.map((p) => ({
        name: p.name,
        lives: p.lives,
        score: p.score,
        alive: p.lives > 0,
        answered: currentByUser.has(p.user_id),
        you: p.user_id === userId,
      })),
      you: {
        lives: me.lives,
        score: me.score,
        alive: me.lives > 0,
        answered: currentByUser.has(userId),
        choice: currentByUser.get(userId)?.choice ?? null,
      },
      ended: status === "done",
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
        `select b.id::text as id
           from blocks b join lessons l on l.id = b.lesson_id
          where l.module_id = $1 and l.status = 'published' and b.kind = 'mcq'
          order by random()`,
        [party.module_id],
      );
      if (rows.length === 0) {
        failure = fail("This module has no questions to raid yet.", 400);
      } else {
        await client.query(
          `update parties
              set status = 'live', round = 1, round_started = now(), question_ids = $1
            where id = $2`,
          [rows.map((r) => r.id), party.id],
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

/** Lock in one answer for the current round. Lives are applied when the round settles. */
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
    } else if (round !== undefined && round !== party.round) {
      failure = fail("That round has already been settled.", 400);
    } else if (!party.round_started) {
      failure = fail("The raid is not running.", 400);
    } else {
      const players = await loadPlayers(client, party.id);
      const me = players.find((p) => p.user_id === userId);
      if (!me) {
        failure = fail("You are not in this party.", 403);
      } else if (me.lives <= 0) {
        failure = fail("You are down — spectating now.", 403);
      } else if (party.db_now.getTime() - party.round_started.getTime() >= ROUND_MS) {
        failure = fail("Time is up for this round.", 400);
      } else {
        const question = await loadQuestion(client, party.question_ids[party.round - 1]);
        if (!question) {
          failure = fail("There is no question for this round.", 400);
        } else if (choice >= question.a.length) {
          failure = fail("Pick one of the answers.", 400);
        } else {
          const { rowCount } = await client.query(
            `insert into party_answers (party_id, round, user_id, choice, correct, ms)
             values ($1, $2, $3, $4, $5, $6)
             on conflict do nothing`,
            [
              party.id,
              party.round,
              userId,
              choice,
              choice === question.c,
              Math.min(ROUND_MS, Math.max(0, party.db_now.getTime() - party.round_started.getTime())),
            ],
          );
          if (!rowCount) failure = fail("You already answered this round.", 400);
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
