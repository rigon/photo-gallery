import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import * as querystring from "node:querystring";

const OUT_DIR = "photos/";
const API_URL = "https://pixabay.com/api/";
const API_KEY = process.env.PIXABAY_API_KEY;
const terms = ["Nature", "Architecture", "Animals", "Travel", "People", "Autumn", "The Grand Canyon", "Great Barrier Reef", "Maldives", "Paris", "Iceland",
    "Wallpapers/Moutains", "Wallpapers/Rivers", "Wallpapers/Lanscapes", "Wallpapers/Abstract", "Wallpapers/Gradients", "Wallpapers/Patterns"]


const options = {
    key: API_KEY,
    image_type: "photo",
    per_page: 50,
    safesearch: true,
}

function getPage(link) {
    return new Promise(function (resolve, reject) {
        const req = https.get(link, res => {
            let chunks = [];
            res.on('data', chunk => {
                // Not the most efficient thing
                chunks.push(chunk); //.toString(); //('latin1');
            });
            res.on('end', function () {
                resolve(Buffer.concat(chunks));
            });
        });

        req.on('error', error => {
            reject(error);
        });
    });
}

async function run() {
    for (const term of terms) {
        fs.mkdirSync(path.join(OUT_DIR, term), { recursive: true });

        const query = querystring.encode({
            ...options,
            q: term.replace("/", " "),
        });
        const url = `${API_URL}?${query}`;
        const page = await getPage(url);
        const data = JSON.parse(page.toString());

        let i = 0;
        for (const hit of data.hits) {
            i++;
            const filename = path.join(OUT_DIR, term, i + ".jpg");
            console.log(filename);
            const filedata = await getPage(hit.largeImageURL);
            fs.writeFileSync(filename, filedata, { encoding: 'binary' });
        }
    }
}
run();
