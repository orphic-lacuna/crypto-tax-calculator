import { expect } from "chai";
import { Interest } from "./Interest.js";
import { Depot } from "../../Depot.js";
import { TransactionProcessor } from "../Processor.js";
import { DateTime } from "luxon";

describe('Transactions', function() {
	describe('Interest transaction', function() {
	
		let depot;
		let now;
		let processor; 
		
		beforeEach(function() {
			depot = new Depot("Main Depot");
			now = DateTime.now();
			processor = new TransactionProcessor();
		});
		
		it('should create a new tranche on its depot', function() {
			const interestTransaction = processor.addTransaction(new Interest(depot, now, "BTC", 5, Interest.Type.Mining));
			processor.process();
			expect(depot.getBalance(now, "BTC")).to.equal(5);
			const tranches = [...depot.tranches.values()];
			expect(tranches.length).to.equal(1);
			expect(tranches[0].asset).to.equal("BTC");
			expect(tranches[0].amount).to.equal(5);
			expect(tranches[0].creationTimestamp).to.equal(now);
			expect(tranches[0].sourceTransaction).to.equal(interestTransaction);
		});

		it('should create a new interest report entry', function() {
			const interestTransaction = processor.addTransaction(new Interest(depot, now, "BTC", 5, Interest.Type.Mining));
			const reports = processor.process();
			expect(reports.Interest.size).to.equal(1);
			const reportEntry = reports.Interest.entries[0]; 
			expect(reportEntry.asset).to.equal("BTC");
			expect(reportEntry.amount).to.equal(5);
			expect(reportEntry.type).to.equal(Interest.Type.Mining);
		});
	});
});
