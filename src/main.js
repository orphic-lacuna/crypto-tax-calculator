import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as path from "path";
import fs from "fs";
import { TransactionProcessor } from "./Transactions/Processor.js";

async function runTaxCalculator(argv) {
	globalThis.Config = {
		DataDir: path.normalize(path.join(process.cwd(), argv.dataFolder))
	};
	
	if (!fs.existsSync(Config.DataDir)) {
		console.error("The path of the tax data folder does not exist:", Config.DataDir);
		process.exit(1);
	}	
	
	console.log("Running tax calculator using tax data from", Config.DataDir);
	
	const tp = new TransactionProcessor();
	const reports = tp.process();
	await reports.generate(path.join(Config.DataDir, "reports"));
}

yargs(hideBin(process.argv))
	.scriptName("crypto-tax-calculator")
	// .require("data-dir", "Specify the path to the directory containing all the data that should be processed")
	.command("$0 <data-folder>", "Run the tax calculator using tax data from <data-folder>", () => {}, runTaxCalculator).argv;
