import { expect } from "chai";
import { Fee } from "./Fee.js";
import { DateTime, Duration } from "luxon";
import { ReportGenerator } from "../ReportGenerator.js";
import { ExchangeRates } from "../../DataProvisioning/ExchangeRates/ExchangeRates.js";
import { ConfigLoader } from "../../ConfigLoader.js";
import fs from "fs";
import path from "path";

describe('Reports', function() {
	describe('Fees report', function() {
	
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
			globalThis.Config = new ConfigLoader();
			
			// create the exchange rates object
			globalThis.ExchangeRates = new ExchangeRates(cacheFolder);
		});
		
		after(function() {
			// remove tmp folder
			if (fs.existsSync(tmpFolder)) fs.rmSync(tmpFolder, { recursive: true });
		});
		
		beforeEach(function() {
			reportGenerator = new ReportGenerator(Fee);
			now = DateTime.now();
			
			// create report folder
			reportFolder = path.join(tmpFolder, "reports");
			if (!fs.existsSync(reportFolder)) fs.mkdirSync(reportFolder);
		});
		
		afterEach(function() {
			// remove temporary reports folder
			if (fs.existsSync(reportFolder)) fs.rmSync(reportFolder, { recursive: true });
		});
		
		
		describe('Fee paid in asset', function() {
			it('should generate the fee report entry if value is already known', async function() {
				const reportEntryTimestamp = now.minus(Duration.fromObject({days: 30}));
				reportGenerator.add(reportEntryTimestamp, "BTC", 0.001, 10);
				await reportGenerator.generate(reportFolder);
				expect(reportGenerator.entries.length).to.equal(1);
				expect(await reportGenerator.entries[0].toString()).to.equal(reportEntryTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";0.001;BTC;10");
			});

			it('should lookup the exchange rate if value of fee is not yet known', async function() {
				this.timeout(5000);
				
				const reportEntryTimestamp = DateTime.fromObject({year: 2022, month: 2, day: 20});
				reportGenerator.add(reportEntryTimestamp, "BTC", 0.001);
				await reportGenerator.generate(reportFolder);
				expect(reportGenerator.entries.length).to.equal(1);
				expect(await reportGenerator.entries[0].toString()).to.equal(reportEntryTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";0.001;BTC;35.49953102434018");
			});
		});
		
		describe('Fee paid in fiat', function() {
			it('should generate the fee report entry', async function() {
				const reportEntryTimestamp = now.minus(Duration.fromObject({days: 30}));
				reportGenerator.add(reportEntryTimestamp, undefined, undefined, 50);
				await reportGenerator.generate(reportFolder);
				expect(reportGenerator.entries.length).to.equal(1);
				expect(await reportGenerator.entries[0].toString()).to.equal(reportEntryTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";;;50");
			});
		});
	});
});
