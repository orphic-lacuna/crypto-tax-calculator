import { expect } from "chai";
import { Depot } from "../../../Depot.js";
import { TransactionProcessor } from "../../../Transactions/Processor.js";
import { DateTime } from "luxon";
import { ConfigLoader } from "../../../ConfigLoader.js";
import { BitstampParser } from "./Bitstamp.js";
import { Buy } from "../../../Transactions/Types/Buy.js";
import { Sell } from "../../../Transactions/Types/Sell.js";
import { Deposit } from "../../../Transactions/Types/Deposit.js";
import { Withdrawal } from "../../../Transactions/Types/Withdrawal.js";
import { Fee } from "../../../Transactions/Types/Fee.js";

describe('Parsing transaction data from Exchanges', function() {
	describe('Bitstamp', function() {
		let depot;
		let now;
		let processor; 
		let csv;
		let parser;
		
		beforeEach(function() {
			// load the config
			globalThis.Config = new ConfigLoader();
			// create main depot and transaction processor
			depot = new Depot("Main Depot");
			processor = new TransactionProcessor();
			// prepare bitstamp transaction data
			csv = [
				"Type,Datetime,Account,Amount,Value,Rate,Fee,Sub Type"
			];
			// prepare the bitstamp parser
			parser = new BitstampParser(processor, depot);
		});
		
		it('generates buy transactions', function() {
			csv.push('Market,"Mar. 15, 2022, 10:00 AM",Main Account,0.2 BTC,4000 EUR,20000 EUR,,Buy');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(1);
			expect(processor.transactions[0]).to.be.instanceof(Buy);
			expect(processor.transactions[0].depot).to.equal(depot.getSubDepot("Main Account"));
			expect(+processor.transactions[0].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 3, day: 15, hour: 10}, { zone: "utc" }));
			expect(processor.transactions[0].amount).to.be.closeTo(0.2, 0.000001);
			expect(processor.transactions[0].asset).to.equal("BTC");
			expect(processor.transactions[0].value).to.equal(4000);
		});

		it('generates sell transactions', function() {
			csv.push('Market,"Dec. 15, 2022, 23:59 PM",Main Account,0.1 BTC,3000 EUR,30000 EUR,,Sell');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(1);
			expect(processor.transactions[0]).to.be.instanceof(Sell);
			expect(processor.transactions[0].depot).to.equal(depot.getSubDepot("Main Account"));
			expect(+processor.transactions[0].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 12, day: 15, hour: 23, minute: 59}, { zone: "utc" }));
			expect(processor.transactions[0].amount).to.be.closeTo(0.1, 0.000001);
			expect(processor.transactions[0].asset).to.equal("BTC");
			expect(processor.transactions[0].value).to.equal(3000);
		});

		it('generates deposit transactions', function() {
			csv.push('Deposit,"Sep. 01, 2017, 10:30 AM",Main Account,0.00040000 BTC,,,,');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(1);
			expect(processor.transactions[0]).to.be.instanceof(Deposit);
			expect(processor.transactions[0].depot).to.equal(depot.getSubDepot("Main Account"));
			expect(+processor.transactions[0].timestamp).to.equal(+DateTime.fromObject({year: 2017, month: 9, day: 1, hour: 10, minute: 30}, { zone: "utc" }));
			expect(processor.transactions[0].amount).to.be.closeTo(0.00040000, 0.000000001);
			expect(processor.transactions[0].asset).to.equal("BTC");
		});

		it('generates no deposit transactions for fiat deposits', function() {
			csv.push('Deposit,"Feb. 01, 2022, 09:00 AM",Main Account,500.00 EUR,,,,');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(0);
		});

		it('generates withdrawal transactions', function() {
			csv.push('Withdrawal,"Nov. 18, 2022, 06:01 PM",Main Account,4.00000000 ETH,,,,');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(1);
			expect(processor.transactions[0]).to.be.instanceof(Withdrawal);
			expect(processor.transactions[0].depot).to.equal(depot.getSubDepot("Main Account"));
			expect(+processor.transactions[0].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 11, day: 18, hour: 18, minute: 1}, { zone: "utc" }));
			expect(processor.transactions[0].amount).to.equal(4);
			expect(processor.transactions[0].asset).to.equal("ETH");
		});

		it('generates no withdrawal transactions for fiat deposits', function() {
			csv.push('Withdrawal,"Feb. 01, 2022, 09:00 AM",Main Account,500.00 USD,,,,');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(0);
		});

		it('generates fiat fee transactions', function() {
			csv.push('Market,"Mar. 15, 2022, 10:00 AM",Main Account,0.2 BTC,4000 EUR,20000 EUR,10 EUR,Buy');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(2);
			const feeTransaction = processor.transactions.find(t => t instanceof Fee);
			expect(feeTransaction.value).to.equal(10);
			expect(feeTransaction.asset).to.be.undefined;
			expect(feeTransaction.amount).to.be.undefined;
			expect(feeTransaction.depot).to.equal(depot.getSubDepot("Main Account"));
			expect(+feeTransaction.timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 3, day: 15, hour: 10}, { zone: "utc" }));
		});
		
		it('generates crypto fee transactions', function() {
			csv.push('Market,"Mar. 15, 2022, 10:00 AM",Main Account,0.2 BTC,4000 EUR,20000 EUR,10 LTC,Buy');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(2);
			const feeTransaction = processor.transactions.find(t => t instanceof Fee);
			expect(feeTransaction.value).to.be.undefined;
			expect(feeTransaction.asset).to.equal("LTC");
			expect(feeTransaction.amount).to.equal(10);
			expect(feeTransaction.depot).to.equal(depot.getSubDepot("Main Account"));
			expect(+feeTransaction.timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 3, day: 15, hour: 10}, { zone: "utc" }));
		});
	});
});
