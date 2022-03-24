import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as path from "path";
import fs from "fs";
import { TransactionProcessor } from "./Transactions/Processor.js";
import { ExchangeRates } from "DataProvisioning/ExchangeRates/ExchangeRates.js";
import { ConfigLoader } from "./ConfigLoader.js";

async function runTaxCalculator(argv) {
	const dataDir = path.normalize(path.join(process.cwd(), argv.dataFolder));

	if (!fs.existsSync(dataDir)) {
		console.error("The path of the tax data folder does not exist:", dataDir);
		process.exit(1);
	}	
	
	console.log("Running tax calculator using tax data from", dataDir);
	
	// load the config.json
	globalThis.Config = new ConfigLoader(path.join(dataDir, "config.json"));

	// create the cache folder
	const cacheFolder = path.join(dataDir, ".cache");
	if (!fs.existsSync(cacheFolder)) {
		fs.mkdirSync(cacheFolder);
	}

	// create the exchange rates object
	globalThis.ExchangeRates = new ExchangeRates(cacheFolder);

	// create the transaction processor	
	const tp = new TransactionProcessor();
	// processing all the transactions returns the report objects
	const reports = tp.process();
	// creating the reports must be done asynchronously because exchange rates must be looked up online
	await reports.generate(path.join(dataDir, "reports"));
}

yargs(hideBin(process.argv))
	.scriptName("crypto-tax-calculator")
	// .require("data-dir", "Specify the path to the directory containing all the data that should be processed")
	.command("$0 <data-folder>", "Run the tax calculator using tax data from <data-folder>", () => {}, runTaxCalculator).argv;
