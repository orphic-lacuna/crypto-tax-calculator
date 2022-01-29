import { expect } from "chai";
import { Interest } from "./Interest.js";
import { Depot } from "../../Depot.js";
import { TransactionProcessor } from "../Processor.js";

describe('Transactions', function() {
	describe('Interest transaction', function() {
	
		let depot;
		let now;
		let processor = 
		
		beforeEach(function() {
			depot = new Depot("Main Depot");
			now = new Date().getTime() / 1000;
			processor = new TransactionProcessor();
		});
		
		it('should create a new tranche on its depot', function() {
			processor.addTransaction(new Interest(depot, now, "BTC", 5, Interest.Type.Mining));
			processor.process();
			expect(depot.getBalance(now, "BTC")).to.equal(5);
			const tranches = [...depot.tranches.values()];
			expect(tranches.length).to.equal(1);
			expect(tranches[0].asset).to.equal("BTC");
			expect(tranches[0].amount).to.equal(5);
			expect(tranches[0].creationTimestamp).to.equal(now);
		});
	});
});
