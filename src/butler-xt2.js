const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");
const padStart = require("lodash/padStart");

async function parseCuelistHtml(html) {
  const $ = cheerio.load(html);
  const cuelistRows = $("tr").slice(2);

  const cuelists = [];
  cuelistRows.each((i, el) => {
    const columns = $(el).children();
    const isGrandmaster = i === 0;
    const cuelist = isGrandmaster
      ? {
          name: "grandmaster",
          level: Number(columns[5].firstChild.attribs.value)
        }
      : {
          index: i - 1,
          name: columns[0].firstChild.data
            .split(" ")
            .slice(1)
            .join(" "),
          state: columns[1].firstChild.data.trim(),
          level: Number(columns[5].firstChild.attribs.value),
          fadeTime: Number(columns[6].firstChild.data),
          onPlay: columns[7].firstChild.data.trim(),
          mutexGroup: Number(columns[8].firstChild.data),
          versatileMaster: Number(columns[9].firstChild.data)
        };
    cuelist.playing = cuelist.state === "PLAY";
    cuelists.push(cuelist);
  });
  return cuelists;
}

async function parseSettings(html) {
  const $ = cheerio.load(html);

  function parseIpAddress(row) {
    const octets = [];
    const cell = row.firstChild.nextSibling;
    octets.push(cell.children[0].attribs.value);
    octets.push(cell.children[2].attribs.value);
    octets.push(cell.children[4].attribs.value);
    octets.push(cell.children[6].attribs.value);
    return octets.map(Number).join(".");
  }

  function parseTime(row) {
    const cell = row.firstChild.nextSibling;
    const day = Number(cell.children[2].attribs.value);
    const month = Number(cell.children[4].attribs.value);
    const year = Number(cell.children[6].attribs.value);
    const hour = Number(cell.children[8].attribs.value);
    const minute = Number(cell.children[10].attribs.value);
    const time = new Date(year, month, day, hour, minute);
    return time;
  }

  const rows = $("tr");
  const settings = {
    deviceName: rows[1].firstChild.nextSibling.firstChild.attribs.value,
    ipAddress: parseIpAddress(rows[2]),
    subnetMask: parseIpAddress(rows[3]),
    gateway: parseIpAddress(rows[4]),
    macAddress: rows[5].firstChild.nextSibling.firstChild.data.trim(),
    baseTime: parseTime(rows[6]),
    dstTime: parseTime(rows[7]),
    uPnpEnabled:
      rows[11].firstChild.nextSibling.firstChild.attribs.value === "1",
    hardwareVersion: rows[13].firstChild.nextSibling.firstChild.data.trim(),
    firmwareVersion: rows[14].firstChild.nextSibling.firstChild.data.trim(),
    bootloaderVersion: rows[15].firstChild.nextSibling.firstChild.data.trim(),
    clusterId: rows[17].firstChild.nextSibling.firstChild.data.trim(),
    clusterSize: Number(rows[18].firstChild.nextSibling.firstChild.data),
    deviceMode: rows[19].firstChild.nextSibling.firstChild.data.trim(),
    lockSettings:
      rows[21].firstChild.nextSibling.firstChild.attribs.value === "1",
    dmxBreakLength: Number(
      rows[22].firstChild.nextSibling.firstChild.attribs.value
    ),
    dmxMabLength: Number(
      rows[23].firstChild.nextSibling.firstChild.attribs.value
    ),
    rdmBreakLength: Number(
      rows[24].firstChild.nextSibling.firstChild.attribs.value
    ),
    rdmMabLength: Number(
      rows[25].firstChild.nextSibling.firstChild.attribs.value
    ),
    rdmDelay: Number(rows[26].firstChild.nextSibling.firstChild.attribs.value)
  };
  return settings;
}

function ButlerXT2({ host = "192.168.123.1", password = "ecue" }) {
  this.host = host;
  this.password = password;
  this.settings = {};
  this.cuelists = [];
  this.fetchCuelistData();
}

ButlerXT2.prototype.fetchCuelistData = async function fetchCuelistData() {
  return await axios
    .get(`http://${this.host}/cldir.htm`)
    .then(response => parseCuelistHtml(response.data))
    .then(cuelists => (this.cuelists = cuelists));
};

ButlerXT2.prototype.fetchSettings = async function fetchCuelistData() {
  await axios
    .post(
      `http://${this.host}/setup.htm`,
      qs.stringify({ T30: "ecue", BENTER: "ENTER" }),
      {
        headers: {
          Referer: `http://${this.host}/setup.htm`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    )
    .then(response => {
      this.settings = parseSettings(response.data);
    })
    .catch(err => {
      throw err;
    });
  return this.settings;
};

ButlerXT2.prototype.playCuelist = async function playCuelist(cuelist) {
  const cuelistId = `B_P${padStart(cuelist, 2, 0)}`;
  const queryString = qs.stringify({ [cuelistId]: "Play" });
  await axios
    .post(`http://${this.host}/cldir.htm`, queryString, {
      headers: {
        Referer: `http://${this.host}/cldir.htm`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })
    .then(response => {
      this.fetchSettings();
    })
    .catch(err => {
      console.log(err.message);
    });
};

ButlerXT2.prototype.setCuelistLevel = async function setCuelistLevel(
  cuelist,
  level
) {
  const cuelistId = `I_S${padStart(cuelist, 2, 0)}`;
  const queryString = qs.stringify({ [cuelistId]: level });
  await axios
    .post(`http://${this.host}/cldir.htm`, queryString, {
      headers: {
        Referer: `http://${this.host}/cldir.htm`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })
    .then(response => {
      this.fetchSettings();
    })
    .catch(err => {
      console.log(err.message);
    });
};

// const butler = new ButlerXT2({ host: '192.168.123.2' })
// butler.setCuelistLevel(4, 50)
// butler.fetchSettings().then(settings => {
//     console.log(settings)
// }).catch(err => console.error(err.message))

// let ms = 0;
// setInterval(() => {
//     const level = Math.round((Math.sin(ms / 1000) * 50) + 50);
//     console.log(level)
//     butler.setCuelistLevel(8, level)

//     ms += 150;
// }, 150)

module.exports = ButlerXT2;
