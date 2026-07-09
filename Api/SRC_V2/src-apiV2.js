import { MultiBar } from "cli-progress";
import fetch from "node-fetch";


//  Wr
export const fetchRawWrHistory = async (uid) => {
    try {

        //  Création de l'url
        const uidVarsPart = uid.split('-').slice(2).join('-');
        const uidVars = JSON.parse(uidVarsPart);

        const parts = uid.split('-');
        const gameId = parts[0];
        const catId = parts[1];

            //arrengement des variables
        const payload = {
            params: {
                gameId: gameId,
                categoryId: catId,
                emulator: 0,
                obsolete: 0,
                verified: 1,
                timer: 0,
                video: 0,
                platformIds: [],
                regionIds: [],
                values: Object.entries(uidVars).map(([variableId, valueId]) => ({
                    variableId,
                    valueIds: [valueId]
                }))
            },
            page: 1,
            vary: Date.now()
        };

            //formatisation
        const encode = btoa(JSON.stringify(payload))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        //  Fetch classique
        const url = `https://www.speedrun.com/api/v2/GetGameRecordHistory?_r=${encode}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!json) console.error(`[Debug] ${uid} -> pas de data : ${JSON.stringify(json).slice(0, 100)}\n`);
        return { uid, data: json } || null;

    } catch (err) {
        console.error(`[src-APIV2] fetchRawHistory ${uid} : ${err.message}`);
        return null;
    }
};