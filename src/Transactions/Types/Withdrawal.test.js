import { expect } from "chai";
import { Withdrawal } from "./Withdrawal.js";
import { Depot } from "../../Depot.js";
import { TransactionProcessor } from "../Processor.js";

describe('Transactions', function() {
	describe('Withdrawal transaction', function() {
	
		let depot;
		let now;
		let processor; 
		let tranches;
		
		beforeEach(function() {
			depot = new Depot("Main Depot");
			now = new Date().getTime() / 1000;
			processor = new TransactionProcessor();

			tranches = [
				depot.addTranche(now - 600, "BTC", 0.5),
				depot.addTranche(now - 900, "BTC", 1),
				depot.addTranche(now - 300, "BTC", 0.25)
			];
			processor.addTransaction(new Withdrawal(depot, now, "BTC", 1.6));
			processor.process();
		});
		
		it('should consume tranches of its depot', function() {
			expect(tranches[0].amountLeft).to.equal(0);
			expect(tranches[1].amountLeft).to.equal(0);
			expect(tranches[2].amountLeft).to.equal(1.75 - 1.6);
			expect(depot.getBalance(now, "BTC")).to.equal(1.75 - 1.6);
		});
	});
});
