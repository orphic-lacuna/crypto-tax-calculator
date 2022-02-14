import { expect } from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import chai from "chai";
import { Deposit } from "./Deposit.js";
import { Withdrawal } from "./Withdrawal.js";
import { Depot } from "../../Depot.js";
import { TransactionProcessor } from "../Processor.js";

chai.use(sinonChai);

describe('Transactions', function() {
	describe('Deposit transaction', function() {
	
		let depot;
		let otherDepot;
		let now;
		let processor; 
		let tranches;
		
		beforeEach(function() {
			globalThis.Config = {
				"DepositWithdrawalLinking": {
					"MaxAmountDeviationRatio": 0.05,
					"MaxTimeDeviationSec": 10800
				}
			};
		
			depot = new Depot("Main Depot");
			otherDepot = new Depot("Other Depot");
			now = new Date().getTime() / 1000;
			processor = new TransactionProcessor();
		});
		
		describe('without linked withdrawal transaction', function() {
			it('should create a new tranche on its depot', function() {
				const depositTransaction = processor.addTransaction(new Deposit(depot, now, "BTC", 5));
				processor.process();
				expect(depot.getBalance(now, "BTC")).to.equal(5);
				const tranches = [...depot.tranches.values()];
				expect(tranches.length).to.equal(1);
				expect(tranches[0].asset).to.equal("BTC");
				expect(tranches[0].amount).to.equal(5);
				expect(tranches[0].creationTimestamp).to.equal(now);
				expect(tranches[0].sourceTransaction).to.equal(depositTransaction);
			});
		});

		describe('with linked withdrawal', function() {
			
			it('must ensure that transactions are linked and withdrawal is processed first', function() {
				// create some tranches on ontherDepot
				const tranches = [
					otherDepot.addTranche(now - 900, "BTC", 1),
					otherDepot.addTranche(now - 300, "BTC", 2),
					otherDepot.addTranche(now - 600, "BTC", 3),
					otherDepot.addTranche(now + 120, "BTC", 4)
				];
				
				const depositTransaction = processor.addTransaction(new Deposit(depot, now, "BTC", 4.999));
				const withdrawalTransaction = processor.addTransaction(new Withdrawal(otherDepot, now, "BTC", 5));
				
				depositTransaction._mirrorWithdrawalTranches = sinon.spy(depositTransaction._mirrorWithdrawalTranches);
				withdrawalTransaction._process = sinon.spy(withdrawalTransaction._process);
				
				processor.process();
				
				// check the linking of deposit and withdrawal
				expect(depositTransaction.withdrawalTransaction).to.equal(withdrawalTransaction);
				expect(withdrawalTransaction.depositTransaction).to.equal(depositTransaction);
				
				// make sure that withdrawal transaction is processed before deposit transaction mirrors the tranches
				expect(withdrawalTransaction._process).to.be.calledBefore(depositTransaction._mirrorWithdrawalTranches);
			});
			
			it('must mirror the consumed tranches of withdrawal', function() {
				// create some tranches on ontherDepot
				const srcTranches = [
					otherDepot.addTranche(now - 900, "BTC", 1, "dummySOURCE"),
					otherDepot.addTranche(now - 300, "BTC", 2, "dummySOURCE"),
					otherDepot.addTranche(now - 600, "BTC", 3, "dummySOURCE"),
					otherDepot.addTranche(now + 120, "BTC", 4, "dummySOURCE")
				];
				
				let remainingValue = 4.999;
				
				const depositTransaction = processor.addTransaction(new Deposit(depot, now, "BTC", remainingValue));
				const withdrawalTransaction = processor.addTransaction(new Withdrawal(otherDepot, now, "BTC", 5));
				processor.process();

				expect(otherDepot.getBalance(now, "BTC")).to.equal(1);
				expect(depot.getBalance(now, "BTC")).to.equal(remainingValue);
				const destTranches = [...depot.tranches.values()];

				for (let destTranche of destTranches) {
					let srcTranche = srcTranches.find(t => t.creationTimestamp == destTranche.creationTimestamp);
					expect(srcTranche).to.be.ok;
					expect(srcTranche.asset).to.equal(destTranche.asset);
					expect(destTranche.sourceTransaction).to.equal("dummySOURCE");
				}
				expect(destTranches.reduce((sum, t) => sum + t.amount, 0)).to.equal(remainingValue);
			});
		});

	});
});
