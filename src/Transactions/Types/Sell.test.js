import { expect } from "chai";
import { Sell } from "./Sell.js";
import { Depot } from "../../Depot.js";
import { TransactionProcessor } from "../Processor.js";
import { DateTime, Duration } from "luxon";

describe('Transactions', function() {
	describe('Sell transaction', function() {
	
		let depot;
		let now;
		let processor; 
		let tranches;
		let reports;
		let transactionValue;
		
		beforeEach(function() {
			depot = new Depot("Main Depot");
			now = DateTime.now();
			processor = new TransactionProcessor();

			tranches = [
				depot.addTranche(now.minus(Duration.fromObject({seconds: 600})), "BTC", 0.5),
				depot.addTranche(now.minus(Duration.fromObject({seconds: 900})), "BTC", 1),
				depot.addTranche(now.minus(Duration.fromObject({seconds: 300})), "BTC", 0.25)
			];
			transactionValue = 40000;
			processor.addTransaction(new Sell(depot, now, "BTC", 1.6, transactionValue));
			reports = processor.process();
		});
		
		it('should consume tranches of its depot', function() {
			expect(tranches[0].amountLeft).to.equal(0);
			expect(tranches[1].amountLeft).to.equal(0);
			expect(tranches[2].amountLeft).to.equal(1.75 - 1.6);
			expect(depot.getBalance(now, "BTC")).to.equal(1.75 - 1.6);
		});

		it('should create a new gain report entry for each tranche it consumes', function() {
			expect(reports.Gain.size).to.equal(3);
			const reportEntries = [...reports.Gain.entries];
			// check the order of the tranches that have been sold
			expect(reportEntries[0].soldTranche).to.equal(tranches[1]);
			expect(reportEntries[1].soldTranche).to.equal(tranches[0]);
			expect(reportEntries[2].soldTranche).to.equal(tranches[2]);
			// check the amount of the tranches that have been sold
			expect(reportEntries[0].amount).to.equal(1);
			expect(reportEntries[1].amount).to.equal(0.5);
			expect(reportEntries[2].amount).to.equal(1.6 - 1 - 0.5);
			// expect the sold value of each to be proportional to the value of the whole transaction
			expect(reportEntries[0].soldValue).to.equal(1 * transactionValue / 1.6);
			expect(reportEntries[1].soldValue).to.equal(0.5 * transactionValue / 1.6);
			expect(reportEntries[2].soldValue).to.equal((1.6 - 1 - 0.5) * transactionValue / 1.6);
		});
	});
});
