import { dbViral, dbBigData } from './loader.js';

export const initDb = () => {
    dbViral.exec(`

        -- Users --
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT NOT NULL
        );

        -- Commandes --
        CREATE TABLE IF NOT EXISTS commandes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            pattern TEXT,
            response TEXT,
            total_count INTEGER DEFAULT 0,
            category TEXT DEFAULT 'Général',
            type TEXT DEFAULT 'Static',
            on_off INTEGER NOT NULL DEFAULT 0,

            CONSTRAINT check_on_off CHECK (on_off IN (0, 1))
        );

        -- Settings --
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        -- Jeux --
        CREATE TABLE IF NOT EXISTS jeux (
            game_id TEXT PRIMARY KEY,
            name TEXT,
            parent_id TEXT,
            enfants_id TEXT,
            series_id TEXT,
            game_json TEXT
        );

    `);

    dbBigData.exec(`

        -- Entité unique --
        CREATE TABLE IF NOT EXISTS src_entities (
            uid TEXT PRIMARY KEY,
            game_id TEXT NOT NULL,
            parent_id TEXT,
            enfants_id TEXT,
            variables_json TEXT,
            cat_pop INTEGER,
            lead_json TEXT,
            cat_json TEXT,
            last_update INTEGER
        );

        -- Table Pb --
        CREATE TABLE IF NOT EXISTS current_records (
            runner_id TEXT,
            uid TEXT,
            pb_manual_time REAL,
            pb_src_time REAL,
            pb_date TEXT NOT NULL,
            pb_rank INTEGER,
            predicted_rank INTEGER,
            pb_video TEXT,
            last_update INTEGER,
            locked_time INTEGER,

            PRIMARY KEY (runner_id, uid),
            FOREIGN KEY (uid) REFERENCES src_entities(uid),

            CONSTRAINT time_required
                CHECK (pb_manual_time IS NOT NULL OR pb_src_time IS NOT NULL)
        );

        -- Wr --
        CREATE TABLE IF NOT EXISTS world_records (
            uid TEXT PRIMARY KEY,
            wr_time REAL,
            wr_runner_id TEXT,
            wr_runner TEXT,
            wr_date TEXT,
            wr_video TEXT,
            last_update INTEGER,

            FOREIGN KEY (uid) REFERENCES src_entities(uid)
        );

        -- Historique --
        CREATE TABLE IF NOT EXISTS run_history (
            uid TEXT NOT NULL,
            runner_id TEXT NOT NULL,
            runner_name TEXT,
            h_date TEXT NOT NULL,
            h_time REAL NOT NULL,
            h_video TEXT,
            is_pb INTEGER DEFAULT 0,

            PRIMARY KEY (uid, runner_id, h_time),
            FOREIGN KEY(uid) REFERENCES src_entities(uid)
        );

    `);
};