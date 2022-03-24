import { expect } from "chai";
import { Interest as InterestReportEntry } from "./Interest.js";
import { Interest as InterestTransaction } from "../../Transactions/Types/Interest.js";
import { DateTime, Duration } from "luxon";
import { ReportGenerator } from "../ReportGenerator.js";
import { ExchangeRates } from "../../DataProvisioning/ExchangeRates/ExchangeRates.js";
import { ConfigLoader } from "../../ConfigLoader.js";
import fs from "fs";
import path from "path";

describe('Reports', function() {
	describe('Interest report', function() {
	
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
			globalThis.Config.TaxRules.Interest.TaxedTypes = ["Mining", "Staking", "Lending", "Referral"];
			
			// create the exchange rates object
			globalThis.ExchangeRates = new ExchangeRates(cacheFolder);
		});
		
		after(function() {
			// remove tmp folder
			if (fs.existsSync(tmpFolder)) fs.rmSync(tmpFolder, { recursive: true });
		});
		
		beforeEach(function() {
			reportGenerator = new ReportGenerator(InterestReportEntry);
			now = DateTime.now();
			
			// create report folder
			reportFolder = path.join(tmpFolder, "reports");
			if (!fs.existsSync(reportFolder)) fs.mkdirSync(reportFolder);
		});
		
		afterEach(function() {
			// remove temporary reports folder
			if (fs.existsSync(reportFolder)) fs.rmSync(reportFolder, { recursive: true });
		});
		
		
		it('should generate the interest report entry if value is already known', async function() {
			const reportEntryTimestamp = now.minus(Duration.fromObject({days: 30}));
			reportGenerator.add(reportEntryTimestamp, "BTC", 0.005, InterestTransaction.Source.Staking, 47);
			await reportGenerator.generate(reportFolder);
			expect(reportGenerator.entries.length).to.equal(1);
			expect(await reportGenerator.entries[0].toString()).to.equal(reportEntryTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";0.005;BTC;47;Staking");
		});

		it('should lookup the exchange rate if fiat value of interest is not yet known', async function() {
			const reportEntryTimestamp = DateTime.fromObject({year: 2022, month: 2, day: 20});
			reportGenerator.add(reportEntryTimestamp, "STORJ", 35, InterestTransaction.Source.Mining);
			await reportGenerator.generate(reportFolder);
			expect(reportGenerator.entries.length).to.equal(1);
			expect(await reportGenerator.entries[0].toString()).to.equal(reportEntryTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";35;STORJ;31.919223651432173;Mining");
		});
		
		it('should generate report entries only for types that underly taxation', async function() {
			const timestamps = [];
			const amounts = [];
			const values = [];
			const sources = [];
			
			let timestamp = now.minus(Duration.fromObject({days: 30}));
			let amount = 0.03;
			let value = 400;
			for (let source of Object.values(InterestTransaction.Source)) {
				if (globalThis.Config.TaxRules.Interest.TaxedTypes.includes(source.description)) {
					timestamps.push(timestamp);
					amounts.push(amount);
					values.push(value);
					sources.push(source);
				}
				
				reportGenerator.add(timestamp, "BTC", amount, source, value);
				
				timestamp = timestamp.plus(Duration.fromObject({days: 1}));
				amount += 1.63;
				value += 150;
			}

			await reportGenerator.generate(reportFolder);
			expect(reportGenerator.entries.length).to.equal(globalThis.Config.TaxRules.Interest.TaxedTypes.length);

			for (let i = 0; i < timestamps.length; i++) {
				expect(await reportGenerator.entries[i].toString()).to.equal(timestamps[i].toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";" + amounts[i].toString() + ";BTC;" + values[i].toString() + ";" + sources[i].description);				
			}
		});
	});
});
