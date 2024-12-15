const path = require("path");
const readline = require("readline");
const express = require("express");
const app = express();
require("dotenv").config({
  path: path.resolve(__dirname, "credentialsDontPost/.env"),
});
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.zllq7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const databaseAndCollection = { db: "CMSC335DB", collection: "NBA_App" };
const { MongoClient, ServerApiVersion } = require("mongodb");
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
const { BalldontlieAPI } = require("@balldontlie/sdk");
const api = new BalldontlieAPI({ apiKey: process.env.BALDONTLIE_API_KEY });

app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/images", express.static(path.join(__dirname, "images")));

// if (process.argv.length !== 3) {
//   console.log("Usage summerCampServer.js portNumber");
//   process.exit(1);
// }

const portNumber = 5000;

app.set("views", path.join(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/search", (req, res) => {
  res.render("search", { teams: null, conference: "", division: "" });
});

app.post("/search", async (req, res) => {
  const { division, conference } = req.body;

  try {
    const queryParams = {};
    if (division) queryParams.division = division;
    if (conference) queryParams.conference = conference;

    const searchEntry = {
      conference: conference || null,
      division: division || null,
      timestamp: new Date(),
    };

    await client.connect();
    const result = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .insertOne(searchEntry);

    const teams = await api.nba.getTeams(queryParams);
    res.render("search", { teams, conference, division });
  } catch (error) {
    console.error(error);
    res.render("search", { teams: null, conference, division });
  } finally {
    await client.close();
  }
});

app.get("/history", async (req, res) => {
  try {
    await client.connect();
    const cursor = client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .find({});

    const history = await cursor.toArray();
    const historyData = history || [];

    res.render("history", { history: historyData });
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
});

app.get("/clear", (req, res) => {
  res.render("clear");
});

app.post("/clear", async (req, res) => {
  const client = new MongoClient(uri);
  try {
    await client.connect();

    const result = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .deleteMany({});

    res.render("clear", { deletedCount: result.deletedCount });
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
});

app.listen(portNumber);
console.log(
  `Web server started and running at: http://localhost:${portNumber}`
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "Stop to shutdown the server: ",
});

rl.prompt();

rl.on("line", (line) => {
  const command = line.trim().toLowerCase();
  if (command === "stop") {
    console.log("Shutting down the server");
    process.exit(0);
  } else {
    console.log(`Invalid command: ${command}`);
  }
  rl.prompt();
});
