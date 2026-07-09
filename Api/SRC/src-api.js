import fetch from "node-fetch";

//  Liste les jeux par userId
export const fetchRawJeux = async (srcId) => {
    try {
        const url = `https://www.speedrun.com/api/v1/users/${srcId}/personal-bests`;
        const res = await fetch(url);
        const json = await res.json();
        return json.data || [];
    } catch (err) {
        console.error(`[src-API] FetchRawJeux : ${err.message}`);
        return [];
    }
};

//  Listes des noms et de la famille
export const fetchGameNameFamiliy = async (gameId) => {
    try {
        const [resMain, resD, resR] = await Promise.all([
            fetch(`https://www.speedrun.com/api/v1/games/${gameId}`),
            fetch(`https://www.speedrun.com/api/v1/games/${gameId}/derived-games`),
            fetch(`https://www.speedrun.com/api/v1/games/${gameId}/romhacks`)
        ]);
        const [jsonMain, jsonD, jsonR] = await Promise.all([resMain.json(), resD.json(), resR.json()]);

        const d = jsonMain.data;
        if (!d) return null;

        return {
            name: d.names.international,
            abbreviation: d.abbreviation,
            parentId: d.links.find(l => l.rel === "base-game")?.uri.split('/').pop() || null,
            seriesId: d.links.find(l => l.rel === "series")?.uri.split('/').pop() || null,
            family: [...(jsonD.data || []), ...(jsonR.data || [])],
            rawGameJson: d
        };
        
    } catch (err) {
        console.error(`[src-API] fetchGameNameFamiliy ${gameId} : ${err.message}`);
        return null;
    }
};

//  Récupération des variables
export const fetchRawVariables = async (gameId) => {
    try {
        const res = await fetch(
            `https://www.speedrun.com/api/v1/games/${gameId}?embed=categories.variables`
        );
        const json = await res.json();
        const data = json.data;
        if (!data) return null;

        const categories = data.categories.data.filter(c => c.type === 'per-game');

        return {
            categories: categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                variables: cat.variables.data
            }))
        };

    } catch (err) {
        console.error(`[src-API] FetchRawVariables : `, err.message);
    }
};

//  Scan de leaderboard
export const fetchRawLeaderboard = async (gameId, categoryId, subVars = {}) => {
    try {
        let query = Object.entries(subVars).map(([id, val]) => `var-${id}=${val}`).join('&');
        const url = `https://www.speedrun.com/api/v1/leaderboards/${gameId}/category/${categoryId}?embed=players&${query}`;
        const urlCat = `https://www.speedrun.com/api/v1/categories/${categoryId}`;

        const res = await fetch(url);
        const json = await res.json();

        const resCat = await fetch(urlCat);
        const catJson = await resCat.json();

        return { lb: json.data || null, cat: catJson.data || null };
    } catch (err) {
        return null;
    }
};

//  Historique des pb
export const fetchRawPbHistory = async (srcUserId) => {
    try {
        const allRuns = [];
        let offset = 0;
        const max = 200;

        while (true) {
            const url = `https://www.speedrun.com/api/v1/runs?user=${srcUserId}&orderby=date&direction=desc&max=${max}&offset=${offset}`;
            const res = await fetch(url);
            const json = await res.json();

            if (!json.data || json.data.length === 0) break;

            allRuns.push(...json.data);

            if (json.data.length < max) break;
            offset += max;
            await new Promise(r => setTimeout(r, 600));
        }

        return allRuns;
    } catch (err) {
        console.error(`[src-APIV2] fetchRawPbHistory ${srcUserId} : ${err.message}`);
        return [];
    }
};