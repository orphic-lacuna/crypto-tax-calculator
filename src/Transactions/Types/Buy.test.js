import { expect } from "chai";
import { Buy } from "./Buy.js";
import { Depot } from "../../Depot.js";
import { TransactionProcessor } from "../Processor.js";
import { Tranche } from "../../Tranche.js";

describe('Transactions', function() {
	describe('Buy transaction', function() {
	
		let depot;
		let now;
		let processor; 
		
		beforeEach(function() {
			depot = new Depot("Main Depot");
			now = new Date().getTime() / 1000;
			processor = new TransactionProcessor();
		});
		
		it('should create a new tranche on its depot', function() {
			const buyTransaction = processor.addTransaction(new Buy(depot, now, "BTC", 5, 5*37000));
			processor.process();
			expect(depot.getBalance(now, "BTC")).to.equal(5);
			const tranches = [...depot.tranches.values()];
			expect(tranches.length).to.equal(1);
			expect(tranches[0].asset).to.equal("BTC");
			expect(tranches[0].amount).to.equal(5);
			expect(tranches[0].creationTimestamp).to.equal(now);
			expect(tranches[0].sourceTransaction).to.equal(buyTransaction);
		});
	});
});
