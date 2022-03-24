import { expect } from "chai";
import { Spending } from "./Spending.js";
import { Depot } from "../../Depot.js";
import { TransactionProcessor } from "../Processor.js";
import { DateTime, Duration } from "luxon";
import { ConfigLoader } from "../../ConfigLoader.js";

describe('Transactions', function() {
	describe('Spending transaction', function() {
	
		let depot;
		let now;
		let processor; 
		let tranches;
		let reports;
		
		beforeEach(function() {
			// load the config
			globalThis.Config = new ConfigLoader();

			depot = new Depot("Main Depot");
			now = DateTime.now();
			processor = new TransactionProcessor();

			tranches = [
				depot.addTranche(now.minus(Duration.fromObject({seconds: 600})), "BTC", 0.5),
				depot.addTranche(now.minus(Duration.fromObject({seconds: 900})), "BTC", 1),
				depot.addTranche(now.minus(Duration.fromObject({seconds: 300})), "BTC", 0.25)
			];
			processor.addTransaction(new Spending(depot, now, "BTC", 1.6));
			reports = processor.process();
		});
		
		it('should consume tranches of its depot', function() {
			expect(tranches[0].amountLeft).to.equal(0);
			expect(tranches[1].amountLeft).to.equal(0);
			expect(tranches[2].amountLeft).to.equal(1.75 - 1.6);
			expect(depot.getBalance(now, "BTC")).to.equal(1.75 - 1.6);
		});

		it('should create a new spending report entry for each tranche it consumes', function() {
			expect(reports.Spending.size).to.equal(3);
			const reportEntries = [...reports.Spending.entries]; 
			for (let entry of reportEntries) {
				expect(entry.asset).to.equal("BTC");
			}
			expect(reportEntries[0].amount).to.equal(1);
			expect(reportEntries[1].amount).to.equal(0.5);
			expect(reportEntries[2].amount).to.equal(1.6 - 1 - 0.5);
		});
	});
});
