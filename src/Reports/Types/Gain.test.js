import { expect } from "chai";
import { Gain } from "./Gain.js";
import { Depot } from "../../Depot.js";
import { Deposit } from "../../Transactions/Types/Deposit.js";
import { Interest } from "../../Transactions/Types/Interest.js";
import { Withdrawal } from "../../Transactions/Types/Withdrawal.js";
import { Buy } from "../../Transactions/Types/Buy.js";
import { Sell } from "../../Transactions/Types/Sell.js";
import { DateTime, Duration } from "luxon";
import { ExchangeRates } from "../../DataProvisioning/ExchangeRates/ExchangeRates.js";
import { TransactionProcessor } from "../../Transactions/Processor.js";
import { ConfigLoader } from "../../ConfigLoader.js";
import fs from "fs";
import path from "path";

describe('Reports', function() {
	describe('Gain report', function() {
	
		let now;
		let tmpFolder;
		let reportFolder;
		let cacheFolder;
		let transactionProcessor;
		let mainDepot;
		let sideDepot;
		
		before(function() {
			// create tmp folder
			tmpFolder = path.join(process.cwd(), ".tmp");
			if (!fs.existsSync(tmpFolder)) fs.mkdirSync(tmpFolder);
			
			// create cache folder
			cacheFolder = path.join(tmpFolder, "cache");
			if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder);
			
			// create the exchange rates object
			globalThis.ExchangeRates = new ExchangeRates(cacheFolder);
		});
		
		after(function() {
			// remove tmp folder
			if (fs.existsSync(tmpFolder)) fs.rmSync(tmpFolder, { recursive: true });
		});
		
		beforeEach(function() {
			transactionProcessor = new TransactionProcessor();
			mainDepot = new Depot("Main Depot");
			sideDepot = new Depot("Side Depot");
			now = DateTime.now();
			
			// create global config
			globalThis.Config = new ConfigLoader();

			// create report folder
			reportFolder = path.join(tmpFolder, "reports");
			if (!fs.existsSync(reportFolder)) fs.mkdirSync(reportFolder);
		});
		
		afterEach(function() {
			// remove temporary reports folder
			if (fs.existsSync(reportFolder)) fs.rmSync(reportFolder, { recursive: true });
		});
		
		it('should calculate gain correctly if buy and sell values are known in advance', async function() {
			// create the buy transaction
			const buyTimestamp = now.minus(Duration.fromObject({years: 0.5}));
			const buy = new Buy(mainDepot, buyTimestamp, "BTC", 0.5, 300);
			transactionProcessor.addTransaction(buy);
			
			// create the sell transaction
			const sellTimestamp = now;
			const sell = new Sell(mainDepot, sellTimestamp, "BTC", 0.5, 1200);
			transactionProcessor.addTransaction(sell);
			
			// process the transaction
			let reports = transactionProcessor.process();
			
			// generate the reports
			await reports.generate(reportFolder);			
			
			expect(reports.Gain.entries.length).to.equal(1);
			expect(await reports.Gain.entries[0].toString()).to.equal(sellTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";0.5;BTC;2400;" + buyTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";600;900");
		});

		it('should calculate gain for each individual tranche consumed by the sell transaction', async function() {
			
			globalThis.Config.TaxRules.Trading.NoTaxIfHeldLongerThan = { years: 3 };
			
			// create three independent buy transactions in a side depot 
			const buyTimestamps = [
				now.minus(Duration.fromObject({years: 2})),
				now.minus(Duration.fromObject({years: 1.5})),
				now.minus(Duration.fromObject({years: 0.9}))
			];
			const buys = [
				new Buy(sideDepot, buyTimestamps[0], "BTC", 0.1, 1000),
				new Buy(sideDepot, buyTimestamps[1], "BTC", 0.2, 3000),
				new Buy(sideDepot, buyTimestamps[2], "BTC", 0.3, 12000)
			];
				
			for (let buy of buys) transactionProcessor.addTransaction(buy);
			
			// withdraw them from side depot and deposit them to main depot
			const withdrawalTimestamp = now.minus(Duration.fromObject({years: 0.5}));
			const withdrawal = new Withdrawal(sideDepot, withdrawalTimestamp, "BTC", 0.6);
			const depositTimestamp = withdrawalTimestamp.plus(Duration.fromObject({minutes:2}));
			const deposit = new Deposit(mainDepot, depositTimestamp, "BTC", 0.6);
			transactionProcessor.addTransaction(deposit);
			transactionProcessor.addTransaction(withdrawal);
			
			// create the sell transaction
			const sellTimestamp = now;
			const sell = new Sell(mainDepot, sellTimestamp, "BTC", 0.6, 3*6000);
			transactionProcessor.addTransaction(sell);
			
			// process the transaction
			let reports = transactionProcessor.process();
			
			// generate the reports
			await reports.generate(reportFolder);			
			
			expect(reports.Gain.entries.length).to.equal(3);
			expect(await reports.Gain.entries[0].toString()).to.equal(sellTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";0.1;BTC;30000;" + buyTimestamps[0].toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";10000;2000");
			expect(await reports.Gain.entries[1].toString()).to.equal(sellTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";0.2;BTC;30000;" + buyTimestamps[1].toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";15000;3000");
			expect(await reports.Gain.entries[2].toString()).to.equal(sellTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";0.3;BTC;30000;" + buyTimestamps[2].toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";40000;-3000");
		});

		it('should ignore all sells on tranches that have been hold long enough to be irrelevant for taxation', async function() {
			// create three independent buy transactions in a side depot 
			const buyTimestamps = [
				now.minus(Duration.fromObject({years: 2})),
				now.minus(Duration.fromObject({years: 1.5})),
				now.minus(Duration.fromObject({years: 0.9}))
			];
			const buys = [
				new Buy(sideDepot, buyTimestamps[0], "BTC", 0.1, 1000),
				new Buy(sideDepot, buyTimestamps[1], "BTC", 0.2, 3000),
				new Buy(sideDepot, buyTimestamps[2], "BTC", 0.3, 12000)
			];
				
			for (let buy of buys) transactionProcessor.addTransaction(buy);
			
			// withdraw them from side depot and deposit them to main depot
			const withdrawalTimestamp = now.minus(Duration.fromObject({years: 0.5}));
			const withdrawal = new Withdrawal(sideDepot, withdrawalTimestamp, "BTC", 0.6);
			const depositTimestamp = withdrawalTimestamp.plus(Duration.fromObject({minutes:2}));
			const deposit = new Deposit(mainDepot, depositTimestamp, "BTC", 0.6);
			transactionProcessor.addTransaction(deposit);
			transactionProcessor.addTransaction(withdrawal);
			
			// create the sell transaction
			const sellTimestamp = now;
			const sell = new Sell(mainDepot, sellTimestamp, "BTC", 0.6, 3*6000);
			transactionProcessor.addTransaction(sell);
			
			// process the transaction
			let reports = transactionProcessor.process();
			
			// generate the reports
			await reports.generate(reportFolder);			
			
			expect(reports.Gain.entries.length).to.equal(1);
			expect(await reports.Gain.entries[0].toString()).to.equal(sellTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";0.3;BTC;30000;" + buyTimestamps[2].toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) + ";40000;-3000");
		});
		
		it('should ignore all sells on tranches that have been generated by non-tax relevant sources', async function() {
			this.timeout(5000);
			
			// create two independent transactions
			const depositTimestamp = DateTime.fromObject({year: 2021, month: 10, day: 15, hour: 12});
			const interestTimestamp =  DateTime.fromObject({year: 2022, month: 1, day: 1, hour: 7});

			const deposit = new Deposit(mainDepot, depositTimestamp, "ETH", 1);
			const interest = new Interest(mainDepot, interestTimestamp, "ETH", 0.1, Interest.Source.Staking);
			transactionProcessor.addTransaction(deposit);
			transactionProcessor.addTransaction(interest);
			
			// create the sell transactions
			const sellTimestamps = [
				DateTime.fromObject({year: 2022, month: 3, day: 14}),
				DateTime.fromObject({year: 2022, month: 3, day: 16}),
				DateTime.fromObject({year: 2022, month: 3, day: 18})
			];
			const sells = [
				new Sell(mainDepot, sellTimestamps[0], "ETH", 0.5, 0.5*4000),
				new Sell(mainDepot, sellTimestamps[1], "ETH", 0.55, 0.55*4100),
				new Sell(mainDepot, sellTimestamps[2], "ETH", 0.05, 0.05*4050)
			];
			for (let sell of sells) transactionProcessor.addTransaction(sell);
			
			// process the transactions
			let reports = transactionProcessor.process();
			
			// generate the reports
			await reports.generate(reportFolder);			
			
			expect(reports.Gain.entries.length).to.equal(2);
			
			expect(+reports.Gain.entries[0].timestamp).to.equal(+sellTimestamps[0]);
			expect(reports.Gain.entries[0].amount).to.equal(0.5);
			expect(reports.Gain.entries[0].sellRate).to.equal(4000);
			expect(+reports.Gain.entries[0].soldTranche.creationTimestamp).to.equal(+depositTimestamp);
			expect(reports.Gain.entries[0].buyRate).to.be.closeTo(3273.53, 0.01);
			expect(reports.Gain.entries[0].gain).to.be.closeTo(0.5*4000 - 0.5*3273.53, 1);

			expect(+reports.Gain.entries[1].timestamp).to.equal(+sellTimestamps[1]);
			expect(reports.Gain.entries[1].amount).to.equal(0.5);
			expect(reports.Gain.entries[1].sellRate).to.equal(4100);
			expect(+reports.Gain.entries[1].soldTranche.creationTimestamp).to.equal(+depositTimestamp);
			expect(reports.Gain.entries[1].buyRate).to.be.closeTo(3273.53, 0.01);
			expect(reports.Gain.entries[1].gain).to.be.closeTo(0.5*4100 - 0.5*3273.53, 0.1);
		});
	});
});
