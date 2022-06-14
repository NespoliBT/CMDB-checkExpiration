
import axios from 'axios';
import * as fs from 'fs';

const settings = JSON.parse(fs.readFileSync('./settings.json').toString());
let authToken = settings.authToken;
axios.defaults.baseURL = settings.siteUrl;

const today = new Date();
let showAll = false;
let more = 0;

if (process.argv[2] === "--login") {
    const { data } = await axios.post("/session/create", null, {
        params: {
            username: settings.username,
            password: settings.password
        }
    })
    authToken = data.response.sessionId;

    fs.writeFileSync('./settings.json', JSON.stringify(
        {
            ...settings,
            authToken: authToken
        }
    ));
}
if (process.argv[2] === "--show-all") {
    showAll = true;
}
if (process.argv[2] === "--show-more" && process.argv[3] !== undefined) {
    more = parseInt(process.argv[3]) * 1000 * 60 * 60 * 24;
}

for (const table of settings.tablesToCheck) {
    let longestName = 0;

    console.log(`\nChecking table ${table}`);

    const { data } = await axios.get("/management/modcard/getcardlist", {
        headers: {
            "CMDBuild-Authorization": authToken
        },
        params: {
            "className": table
        }
    });
    const cards = data.rows;
    const cardsDigits = cards.length.toString().length;

    cards.sort((a, b) => {
        const date = a.ExpirationDate || a.Expiration || a.ExpireDate;
        const dateArray = date.split('/');
        const expiration = new Date(dateArray[2], dateArray[1] - 1, dateArray[0]);

        const date2 = b.ExpirationDate || b.Expiration || b.ExpireDate;
        const dateArray2 = date2.split('/');
        const expiration2 = new Date(dateArray2[2], dateArray2[1] - 1, dateArray2[0]);

        return expiration2.getTime() - expiration.getTime();
    });

    cards.forEach(card => {
        const date = card.ExpirationDate || card.Expiration || card.ExpireDate;
        const dateArray = date.split('/');
        const expiration = new Date(dateArray[2], dateArray[1] - 1, dateArray[0]);
        const name = card.Description || card.Code;

        if (expiration.getTime() > today.getTime() - more || showAll) {
            longestName = Math.max(longestName, name.length);
        }
    })

    console.log(`ID ${" ".repeat(cardsDigits - 2)}| Name ${" ".repeat(longestName - 4)} | Expiration`);
    cards.forEach((card, i) => {
        const date = card.ExpirationDate || card.Expiration || card.ExpireDate;
        const dateArray = date.split('/');
        const expiration = new Date(dateArray[2], dateArray[1] - 1, dateArray[0]);
        const name = (card.Description || card.Code).replace(/\n/g, " ");

        const indexLenght = (i + 1).toString().length;

        if (expiration.getTime() > today.getTime() - more || showAll) {
            if (expiration.getTime() < today.getTime() + 1000 * 60 * 60 * 24 * 7)
                console.log('\x1b[31m%s\x1b[0m', `${i + 1} ${" ".repeat(cardsDigits - indexLenght)}| ${name} ${" ".repeat(longestName - name.length)} | ${date}`);
            else if (expiration.getTime() < today.getTime() + 1000 * 60 * 60 * 24 * 30)
                console.log('\x1b[33m%s\x1b[0m', `${i + 1} ${" ".repeat(cardsDigits - indexLenght)}| ${name} ${" ".repeat(longestName - name.length)} | ${date}`);
            else
                console.log('\x1b[32m%s\x1b[0m', `${i + 1} ${" ".repeat(cardsDigits - indexLenght)}| ${name} ${" ".repeat(longestName - name.length)} | ${date}`);
        }
    });
}