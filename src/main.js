import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as path from "path";
import fs from "fs";
import { TransactionProcessor } from "./Transactions/Processor.js";
import { ExchangeRates } from "DataProvisioning/ExchangeRates/ExchangeRates.js";

async function runTaxCalculator(argv) {
	const dataDir = path.normalize(path.join(process.cwd(), argv.dataFolder));

	if (!fs.existsSync(dataDir)) {
		console.error("The path of the tax data folder does not exist:", dataDir);
		process.exit(1);
	}	
	
	console.log("Running tax calculator using tax data from", dataDir);
	
	// load the config.json
	const configFilename = path.join(dataDir, "config.json");
	if (fs.existsSync(configFilename)) {
		globalThis.Config = JSON.parse(fs.readFileSync(configFilename, "utf-8"));
	}
	if (typeof globalThis.Config != "object") globalThis.Config = {};
	globalThis.Config.DataDir = dataDir;

	// create the cache folder
	globalThis.Config.CacheFolder = path.join(globalThis.Config.DataDir, ".cache");
	if (!fs.existsSync(globalThis.Config.CacheFolder)) {
		fs.mkdirSync(globalThis.Config.CacheFolder);
	}

	// create the exchange rates object
	globalThis.ExchangeRates = new ExchangeRates();

	// create the transaction processor	
	const tp = new TransactionProcessor();
	// processing all the transactions returns the report objects
	const reports = tp.process();
	// creating the reports must be done asynchronously because exchange rates must be looked up online
	await reports.generate(path.join(Config.DataDir, "reports"));
}

yargs(hideBin(process.argv))
	.scriptName("crypto-tax-calculator")
	// .require("data-dir", "Specify the path to the directory containing all the data that should be processed")
	.command("$0 <data-folder>", "Run the tax calculator using tax data from <data-folder>", () => {}, runTaxCalculator).argv;
