import fs from "fs";
import path from "path";
import { BitstampParser } from "./TransactionData/Exchanges/Bitstamp.js";
import { BinanceParser } from "./TransactionData/Exchanges/Binance.js";
import { Depot } from "../Depot.js";

function getParserFromExchangeName(name) {
	switch(name) {
		case "Bitstamp":
			return BitstampParser;
		case "Binance":
			return BinanceParser;
	}
}

export class DataLoader {
	constructor(transactionProcessor) {
		this.transactionProcessor = transactionProcessor;
	}
	
	load(dataDir) {
		this.dataDir = dataDir;
		
		// check if we have an exchanges folder
		const exchangesFolder = path.join(dataDir, "exchanges");
		if (fs.existsSync(exchangesFolder)) {
			// parse the transaction data from the exchanges
			// loop over the content of the exchanges folder
			names = fs.readdirSync(exchangesFolder, { withFileTypes: true });
			for (let dirent of names) {
				// check if it is a directory
				if (dirent.isDirectory()) {
					// check if the name of the directory is a exchange from which we can parse CSV transaction data
					const parserClass = getParserFromExchangeName(dirent.name);
					if (parserClass) {
						// if so, create the parser
						const parser = new parserClass(this.transactionProcessor, new Depot(dirent.name));
						// load all csv files in that directory
						const csvFiles = fs.readdirSync(path.join(exchangesFolder, dirent.name), { withFileTypes: true });
						for (let csvFile of csvFiles) {
							// check that it is a file with the csv extension
							if (csvFile.isFile() && (path.extname(csvFile.name).toLowerCase() == ".csv")) {
								// load the file data
								const fileData = fs.readFileSync(path.join(exchangesFolder, dirent.name, csvFile.name), { encoding: "utf8" });
								// and finally parse it
								parser.parse(fileData);
							}
						}
					}
				}
			}
		}
	}	
}