import { expect } from "chai";
import { Spending } from "./Spending.js";
import { DateTime, Duration } from "luxon";
import { ReportGenerator } from "../ReportGenerator.js";
import { ExchangeRates } from "../../DataProvisioning/ExchangeRates/ExchangeRates.js";
import fs from "fs";
import path from "path";

describe('Reports', function() {
	describe('Spendings report', function() {
	
		let reportGenerator;
		let now;
		let tmpFolder;
		let reportFolder;
		let cacheFolder;
		
		before(function() {
			// create tmp folder
			tmpFolder = path.join(process.cwd(), ".tmp");
			if (!fs.existsSync(tmpFolder)) fs.mkdirSync(tmpFolder);
			
			// create cache folder
			cacheFolder = path.join(tmpFolder, "cache");
			if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder);
			
			// create global config
			globalThis.Config = {
				BaseCurrency: "EUR",
				CacheFolder: cacheFolder
			};
			
			// create the exchange rates object
			globalThis.ExchangeRates = new ExchangeRates();
		});
		
		after(function() {
			// remove tmp folder
			if (fs.existsSync(tmpFolder)) fs.rmSync(tmpFolder, { recursive: true });
		});
		
		beforeEach(function() {
			reportGenerator = new ReportGenerator(Spending);
			now = DateTime.now();
			
			// create report folder
			reportFolder = path.join(tmpFolder, "reports");
			if (!fs.existsSync(reportFolder)) fs.mkdirSync(reportFolder);
		});
		
		afterEach(function() {
			// remove temporary reports folder
			if (fs.existsSync(reportFolder)) fs.rmSync(reportFolder, { recursive: true });
		});
		
		it('should generate the spending report entry if value is already known', async function() {
			const reportEntryTimestamp = now.minus(Duration.fromObject({days: 30}));
			reportGenerator.add(reportEntryTimestamp, "BTC", 0.005, 47);
			await reportGenerator.generate(reportFolder);
			expect(reportGenerator.entries.length).to.equal(1);
			expect(await reportGenerator.entries[0].toString()).to.equal(reportEntryTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";0.005;BTC;47");
		});

		it('should lookup the exchange rate if fiat value of spending is not yet known', async function() {
			const reportEntryTimestamp = DateTime.fromObject({year: 2022, month: 2, day: 20});
			reportGenerator.add(reportEntryTimestamp, "STORJ", 35);
			await reportGenerator.generate(reportFolder);
			expect(reportGenerator.entries.length).to.equal(1);
			expect(await reportGenerator.entries[0].toString()).to.equal(reportEntryTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";35;STORJ;31.919223651432173");
		});
	});
});
