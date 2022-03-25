import { expect } from "chai";
import { Depot } from "../../../Depot.js";
import { TransactionProcessor } from "../../../Transactions/Processor.js";
import { DateTime } from "luxon";
import { ConfigLoader } from "../../../ConfigLoader.js";
import { BinanceParser } from "./Binance.js";
import { Buy } from "../../../Transactions/Types/Buy.js";
import { Sell } from "../../../Transactions/Types/Sell.js";
import { Deposit } from "../../../Transactions/Types/Deposit.js";
import { Withdrawal } from "../../../Transactions/Types/Withdrawal.js";
import { Fee } from "../../../Transactions/Types/Fee.js";
import { Interest } from "../../../Transactions/Types/Interest.js";
import { Spending } from "../../../Transactions/Types/Spending.js";

describe('Parsing transaction data from Exchanges', function() {
	describe('Binance', function() {
		let depot;
		let processor; 
		let csv;
		let parser;
		
		beforeEach(function() {
			// load the config
			globalThis.Config = new ConfigLoader();
			// create main depot and transaction processor
			depot = new Depot("Main Depot");
			processor = new TransactionProcessor();
			// prepare binance transaction data
			csv = [
				"User_ID,UTC_Time,Account,Operation,Coin,Change,Remark"
			];
			// prepare the bitstamp parser
			parser = new BinanceParser(processor, depot);
		});
		
		it('generates buy transactions for positive amounts', function() {
			csv.push('123456,2022-02-01 09:24:46,Spot,Buy,BNB,0.1,""');
			csv.push('123456,2022-02-02 09:24:46,Spot,Sell,BNB,0.2,""');
			csv.push('123456,2022-02-03 09:24:46,Spot,Transaction Related,BNB,0.3,""');
			csv.push('123456,2022-02-04 09:24:46,Spot,Small assets exchange BNB,BNB,0.4,""');
			csv.push('123456,2022-02-05 09:24:46,Spot,The Easiest Way to Trade,BNB,0.5,""');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(5);
			
			for (let i = 0; i < processor.transactions.length; i++) {
				expect(processor.transactions[i]).to.be.instanceof(Buy);
				expect(processor.transactions[i].depot).to.equal(depot.getSubDepot("Spot"));
				expect(+processor.transactions[i].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 2, day: i+1, hour: 9, minute: 24, second: 46}, { zone: "utc" }));
				expect(processor.transactions[i].amount).to.be.closeTo((i+1)*0.1, 0.0000000001);
				expect(processor.transactions[i].asset).to.equal("BNB");
			}
		});

		it('generates sell transactions for negative amounts', function() {
			csv.push('123456,2022-02-01 09:24:46,Spot,Buy,BNB,-0.1,""');
			csv.push('123456,2022-02-02 09:24:46,Spot,Sell,BNB,-0.2,""');
			csv.push('123456,2022-02-03 09:24:46,Spot,Transaction Related,BNB,-0.3,""');
			csv.push('123456,2022-02-04 09:24:46,Spot,Small assets exchange BNB,BNB,-0.4,""');
			csv.push('123456,2022-02-05 09:24:46,Spot,The Easiest Way to Trade,BNB,-0.5,""');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(5);
			
			for (let i = 0; i < processor.transactions.length; i++) {
				expect(processor.transactions[i]).to.be.instanceof(Sell);
				expect(processor.transactions[i].depot).to.equal(depot.getSubDepot("Spot"));
				expect(+processor.transactions[i].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 2, day: i+1, hour: 9, minute: 24, second: 46}, { zone: "utc" }));
				expect(processor.transactions[i].amount).to.be.closeTo((i+1)*0.1, 0.0000000001);
				expect(processor.transactions[i].asset).to.equal("BNB");
			}
		});

		it('generates fee transactions', function() {
			csv.push('123456,2022-02-01 09:24:46,Spot,Fee,BNB,-0.1,""');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(1);
			expect(processor.transactions[0]).to.be.instanceof(Fee);
			expect(processor.transactions[0].depot).to.equal(depot.getSubDepot("Spot"));
			expect(+processor.transactions[0].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 2, day: 1, hour: 9, minute: 24, second: 46}, { zone: "utc" }));
			expect(processor.transactions[0].amount).to.be.closeTo(0.1, 0.0000000001);
			expect(processor.transactions[0].asset).to.equal("BNB");
		});
		
		it('generates deposit transactions', function() {
			csv.push('123456,2022-02-01 09:24:46,Spot,Deposit,AXS,10,""');
			csv.push('123456,2022-02-02 09:24:46,Card,transfer_in,BNB,5,""');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(2);
			expect(processor.transactions[0]).to.be.instanceof(Deposit);
			expect(processor.transactions[1]).to.be.instanceof(Deposit);
			expect(processor.transactions[0].depot).to.equal(depot.getSubDepot("Spot"));
			expect(processor.transactions[1].depot).to.equal(depot.getSubDepot("Card"));
			expect(+processor.transactions[0].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 2, day: 1, hour: 9, minute: 24, second: 46}, { zone: "utc" }));
			expect(+processor.transactions[1].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 2, day: 2, hour: 9, minute: 24, second: 46}, { zone: "utc" }));
			expect(processor.transactions[0].amount).to.be.closeTo(10, 0.0000000001);
			expect(processor.transactions[1].amount).to.be.closeTo(5, 0.0000000001);
			expect(processor.transactions[0].asset).to.equal("AXS");
			expect(processor.transactions[1].asset).to.equal("BNB");
		});
		
		it('generates withdrawal transactions', function() {
			csv.push('123456,2022-02-01 09:24:46,Spot,Withdraw,AXS,-10,""');
			csv.push('123456,2022-02-02 09:24:46,Card,transfer_out,BNB,-5,""');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(2);
			expect(processor.transactions[0]).to.be.instanceof(Withdrawal);
			expect(processor.transactions[1]).to.be.instanceof(Withdrawal);
			expect(processor.transactions[0].depot).to.equal(depot.getSubDepot("Spot"));
			expect(processor.transactions[1].depot).to.equal(depot.getSubDepot("Card"));
			expect(+processor.transactions[0].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 2, day: 1, hour: 9, minute: 24, second: 46}, { zone: "utc" }));
			expect(+processor.transactions[1].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 2, day: 2, hour: 9, minute: 24, second: 46}, { zone: "utc" }));
			expect(processor.transactions[0].amount).to.be.closeTo(10, 0.0000000001);
			expect(processor.transactions[1].amount).to.be.closeTo(5, 0.0000000001);
			expect(processor.transactions[0].asset).to.equal("AXS");
			expect(processor.transactions[1].asset).to.equal("BNB");
		});

		it('generates interest transactions', function() {
			csv.push('123456,2022-02-01 09:24:46,Spot,POS savings interest,BNB,0.1,""');
			csv.push('123456,2022-02-02 09:24:46,Spot,Savings Interest,BNB,0.2,""');
			csv.push('123456,2022-02-03 09:24:46,Spot,ETH 2.0 Staking Rewards,BETH,0.3,""');
			csv.push('123456,2022-02-04 09:24:46,Spot,Distribution,BNB,0.4,""');
			csv.push('123456,2022-02-05 09:24:46,Spot,Commission History,BNB,0.5,""');
			csv.push('123456,2022-02-06 09:24:46,Spot,Super BNB Mining,BNB,0.6,""');
			csv.push('123456,2022-02-07 09:24:46,Spot,Card Cashback,BNB,0.7,""');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(7);
			for (let i = 0; i < processor.transactions.length; i++) {
				expect(processor.transactions[i]).to.be.instanceof(Interest);
				expect(processor.transactions[i].depot).to.equal(depot.getSubDepot("Spot"));
				expect(+processor.transactions[i].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 2, day: i+1, hour: 9, minute: 24, second: 46}, { zone: "utc" }));
				expect(processor.transactions[i].amount).to.be.closeTo((i+1)*0.1, 0.0000000001);
				expect(processor.transactions[i].asset).to.equal(i == 2 ? "BETH": "BNB");
			}
			expect(processor.transactions[0].source).to.equal(Interest.Source.Staking);
			expect(processor.transactions[1].source).to.equal(Interest.Source.Lending);
			expect(processor.transactions[2].source).to.equal(Interest.Source.Staking);
			expect(processor.transactions[3].source).to.equal(Interest.Source.AirdropOrHardfork);
			expect(processor.transactions[4].source).to.equal(Interest.Source.Referral);
			expect(processor.transactions[5].source).to.equal(Interest.Source.Lending);
			expect(processor.transactions[6].source).to.equal(Interest.Source.Cashback);
		});

		it('generates spending transactions', function() {
			csv.push('123456,2022-02-01 09:24:46,Card,Binance Card Spending,BNB,-10,""');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(1);
			expect(processor.transactions[0]).to.be.instanceof(Spending);
			expect(processor.transactions[0].depot).to.equal(depot.getSubDepot("Card"));
			expect(+processor.transactions[0].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 2, day: 1, hour: 9, minute: 24, second: 46}, { zone: "utc" }));
			expect(processor.transactions[0].amount).to.be.closeTo(10, 0.0000000001);
			expect(processor.transactions[0].asset).to.equal("BNB");
		});
		
		it('converts BCHABC token symbol BCH', function() {
			csv.push('123456,2022-02-01 09:24:46,Spot,Buy,BCHABC,3,""');
			parser.parse(csv.join("\n"));
			
			expect(processor.transactions.length).to.equal(1);
			expect(processor.transactions[0]).to.be.instanceof(Buy);
			expect(processor.transactions[0].depot).to.equal(depot.getSubDepot("Spot"));
			expect(+processor.transactions[0].timestamp).to.equal(+DateTime.fromObject({year: 2022, month: 2, day: 1, hour: 9, minute: 24, second: 46}, { zone: "utc" }));
			expect(processor.transactions[0].amount).to.be.closeTo(3, 0.0000000001);
			expect(processor.transactions[0].asset).to.equal("BCH");
		});
	});
});
