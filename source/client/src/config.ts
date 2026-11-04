/* MPL-2.0. Port of BrowserQuest client/js/config.js. */
const host = location.hostname || '127.0.0.1';
const local = { host, port: 8080, dispatcher: false };
const config = { dev: local, local, build: local };
export = config;
