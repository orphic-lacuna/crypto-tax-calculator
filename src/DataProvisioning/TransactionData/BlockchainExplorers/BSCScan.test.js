import { expect } from "chai";
import { Depot } from "../../../Depot.js";
import { TransactionProcessor } from "../../../Transactions/Processor.js";
import { DateTime } from "luxon";
import { ConfigLoader } from "../../../ConfigLoader.js";
import { BSCScan } from "./BSCScan.js";
import { Deposit } from "../../../Transactions/Types/Deposit.js";
import { Withdrawal } from "../../../Transactions/Types/Withdrawal.js";
import { Fee } from "../../../Transactions/Types/Fee.js";

describe('Blockchain Explorers', function() {
	describe('BSCScan', function() {
		let depot;
		let processor; 
		let transactions = {};
		let explorer;
		const address = "0xf426a8d0a94bf039a35cee66dbf0227a7a12d11e";
		
		beforeEach(function() {
			// load the config
			globalThis.Config = new ConfigLoader();
			// create main depot and transaction processor
			depot = new Depot("Main Depot");
			processor = new TransactionProcessor();
			
			explorer = new BSCScan(processor, depot);
		});
		
		it('fetches normal transactions of an address correctly', async function() {
			this.timeout(60000);
			
			transactions.normal = await explorer._getTransactionsForAddress(address);
			expect(transactions.normal.length).to.be.greaterThanOrEqual(38);
			expect(transactions.normal[0].blockNumber).to.be.equal("10475175");
			expect(transactions.normal[0].timeStamp).to.be.equal("1630314219");
			expect(transactions.normal[0].from).to.be.equal("0x161ba15a5f335c9f06bb5bbb0a9ce14076fbb645");
			expect(transactions.normal[0].to).to.be.equal(address);
			expect(transactions.normal[0].value).to.be.equal("90541060000000000");
		});
		
		it('fetches internal transactions of an address correctly', async function() {
			this.timeout(60000);
			
			transactions.internal = await explorer._getInternalTransactionsForAddress(address);
			expect(transactions.internal.length).to.be.greaterThanOrEqual(5);
			expect(transactions.internal[0].blockNumber).to.be.equal("10485356");
			expect(transactions.internal[0].timeStamp).to.be.equal("1630345979");
			expect(transactions.internal[0].from).to.be.equal("0x10ed43c718714eb63d5aa57b78b54704e256024e");
			expect(transactions.internal[0].to).to.be.equal("0xf426a8d0a94bf039a35cee66dbf0227a7a12d11e");
			expect(transactions.internal[0].value).to.be.equal("290906023587455475");
		});

		it('fetches ERC-20 token transfer transactions of an address correctly', async function() {
			this.timeout(60000);
			
			transactions.tokens = await explorer._getERC20TransfersForAddress(address);
			expect(transactions.tokens.length).to.be.greaterThanOrEqual(59);
			expect(transactions.tokens[0].blockNumber).to.be.equal("10474764");
			expect(transactions.tokens[0].timeStamp).to.be.equal("1630312986");
			expect(transactions.tokens[0].from).to.be.equal("0x8894e0a0c962cb723c1976a4421c95949be2d4e3");
			expect(transactions.tokens[0].to).to.be.equal(address);
			expect(transactions.tokens[0].value).to.be.equal("498200000000000000000");
			expect(transactions.tokens[0].tokenName).to.be.equal("Binance-Peg BSC-USD");
			expect(transactions.tokens[0].tokenSymbol).to.be.equal("BSC-USD");
			expect(transactions.tokens[0].tokenDecimal).to.be.equal("18");
			expect(transactions.tokens[0].contractAddress).to.be.equal("0x55d398326f99059ff775485246999027b3197955");
		});
		
		it('processes the fetched transactions correctly', async function() {
			// process the normal transactions
			explorer._processTransactions(transactions.normal.slice(0,2), address);
			expect(processor.transactions.length).to.be.equal(2);

			// first deposit			
			expect(processor.transactions[0]).to.be.instanceof(Deposit);
			expect(processor.transactions[0].asset).to.be.equal("BNB");
			expect(processor.transactions[0].amount).to.be.equal(0.09054106);
			expect(+processor.transactions[0].timestamp).to.be.equal(+DateTime.fromMillis(1630314219000));
			// there is no fee for deposits / especially the genesis block has not consumed any gas
			
			// fee for first withdrawal
			expect(processor.transactions[1]).to.be.instanceof(Fee);
			expect(processor.transactions[1].asset).to.be.equal("BNB");
			expect(processor.transactions[1].amount).to.be.equal(0.00022203);
			expect(+processor.transactions[1].timestamp).to.be.equal(+DateTime.fromMillis(1630314573000));
			
			// clear the transactions and process a normal transaction withdrawal with a value > 0
			processor.transactions.length = 0;
			explorer._processTransactions(transactions.normal.slice(18,19), address);
			expect(processor.transactions.length).to.be.equal(2); // fee + withdrawal
			expect(processor.transactions[0]).to.be.instanceof(Withdrawal);
			expect(processor.transactions[0].asset).to.be.equal("BNB");
			expect(processor.transactions[0].amount).to.be.equal(0.2);
			expect(+processor.transactions[0].timestamp).to.be.equal(+DateTime.fromMillis(1630380126000));

			// clear the transactions and now process the internal transactions
			processor.transactions.length = 0;
			explorer._processTransactions(transactions.internal.slice(0,1), address);

			expect(processor.transactions.length).to.be.equal(1);

			expect(processor.transactions[0]).to.be.instanceof(Deposit);
			expect(processor.transactions[0].asset).to.be.equal("BNB");
			expect(processor.transactions[0].amount).to.be.equal(0.290906023587455475);
			expect(+processor.transactions[0].timestamp).to.be.equal(+DateTime.fromMillis(1630345979000));

			// clear the transactions and now process the ERC-20 transactions
			processor.transactions.length = 0;
			explorer._processTransactions(transactions.tokens.slice(0,1), address);

			expect(processor.transactions.length).to.be.equal(1);

			expect(processor.transactions[0]).to.be.instanceof(Deposit);
			expect(processor.transactions[0].asset).to.be.equal("BSC-USD");
			expect(processor.transactions[0].amount).to.be.equal(498.200000000000000000);
			expect(+processor.transactions[0].timestamp).to.be.equal(+DateTime.fromMillis(1630312986000));
		});

	});
});