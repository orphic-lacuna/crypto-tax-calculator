import { expect } from "chai";
import { Spending } from "./Spending.js";
import { Fee } from "./Fee.js";
import { Depot } from "../../Depot.js";
import { TransactionProcessor } from "../Processor.js";
import { DateTime } from "luxon";

describe('Transactions', function() {
	describe('Fee transaction', function() {
	
		let depot;
		let now;
		let processor; 
		let tranches;
		let reports;
		const allowedDelta = 0.00000000001;
		
		beforeEach(function() {
			depot = new Depot("Main Depot");
			now = DateTime.now();
			processor = new TransactionProcessor();
		});
		
		it('should consume tranches of its depot if an asset and amount is given', function() {
			tranches = [
				depot.addTranche(now - 900, "BTC", 0.1),
				depot.addTranche(now - 600, "BTC", 0.2)
			];
			const spendingTransaction = new Spending(depot, now, "BTC", 0.25);
			// intentionally swap the order of fee and spending transaction, shouldn't do any harm
			processor.addTransaction(new Fee(depot, now, "BTC", 0.01, 0.01*38000, spendingTransaction));
			processor.addTransaction(spendingTransaction);
			reports = processor.process();

			// check that tranches have been consumed
			expect(tranches[0].amount).to.equal(0.1);
			expect(tranches[0].amountLeft).to.equal(0);
			expect(tranches[1].amount).to.equal(0.2);
			expect(tranches[1].amountLeft).to.be.closeTo(0.1 + 0.2 - 0.25 - 0.01, allowedDelta);
			expect(depot.getBalance(now, "BTC")).to.be.closeTo(0.3 - 0.25 - 0.01, allowedDelta);

			// check that report entry for fee has been generated
			expect(reports.Fee.size).to.equal(1);
			const entry = reports.Fee.entries[0]; 
			expect(entry.asset).to.equal("BTC");
			expect(entry.amount).to.equal(0.01);
			expect(entry.value).to.equal(0.01 * 38000);
		});


		it('should not consume any tranches if asset and amount are omitted', function() {
			tranches = [
				depot.addTranche(now - 900, "BTC", 0.1),
				depot.addTranche(now - 600, "BTC", 0.2)
			];
			const spendingTransaction = processor.addTransaction(new Spending(depot, now, "BTC", 0.05));
			const feeTransaction = processor.addTransaction(new Fee(depot, now, undefined, undefined, 0.01*38000, spendingTransaction));
			reports = processor.process();

			// check that tranches have been consumed
			expect(tranches[0].amount).to.equal(0.1);
			expect(tranches[0].amountLeft).to.equal(0.1 - 0.05);
			expect(tranches[1].amount).to.equal(0.2);
			expect(tranches[1].amountLeft).to.equal(0.2);
			expect(depot.getBalance(now, "BTC")).to.be.closeTo(0.1 + 0.2 - 0.05, allowedDelta);

			// check that report entry has no asset and amount
			expect(reports.Fee.size).to.equal(1);
			const entry = reports.Fee.entries[0]; 
			expect(entry.asset).to.be.undefined;
			expect(entry.amount).to.be.undefined;
			expect(entry.value).to.equal(0.01 * 38000);
		});
	});
});
