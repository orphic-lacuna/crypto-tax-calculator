import { expect } from "chai";
import { Depot } from "../../../Depot.js";
import { TransactionProcessor } from "../../../Transactions/Processor.js";
import { DateTime } from "luxon";
import { ConfigLoader } from "../../../ConfigLoader.js";
import { EtherscanCompatibleAPI } from "./EtherscanCompatibleAPI.js";
import { Deposit } from "../../../Transactions/Types/Deposit.js";
import { Withdrawal } from "../../../Transactions/Types/Withdrawal.js";
import { Fee } from "../../../Transactions/Types/Fee.js";

describe('Blockchain Explorers', function() {
	describe('Etherscan', function() {
		let depot;
		let processor; 
		let transactions = {};
		let explorer;
		const address = "0xddbd2b932c763ba5b1b7ae3b362eac3e8d40121a";
		
		beforeEach(function() {
			// load the config
			globalThis.Config = new ConfigLoader();
			// create main depot and transaction processor
			depot = new Depot("Main Depot");
			processor = new TransactionProcessor();
			
			explorer = new EtherscanCompatibleAPI(processor, depot);
		});
		
		it('fetches normal transactions of an address correctly', async function() {
			this.timeout(60000);
			
			transactions.normal = await explorer._getTransactionsForAddress(address);
			expect(transactions.normal.length).to.be.greaterThanOrEqual(42);
			expect(transactions.normal[0].blockNumber).to.be.equal("0");
			expect(transactions.normal[0].timeStamp).to.be.equal("1438269973");
			expect(transactions.normal[0].from).to.be.equal("GENESIS");
			expect(transactions.normal[0].to).to.be.equal("0xddbd2b932c763ba5b1b7ae3b362eac3e8d40121a");
			expect(transactions.normal[0].value).to.be.equal("10000000000000000000000");
		});
		
		it('fetches internal transactions of an address correctly', async function() {
			this.timeout(60000);
			
			transactions.internal = await explorer._getInternalTransactionsForAddress(address);
			expect(transactions.internal.length).to.be.greaterThanOrEqual(6);
			expect(transactions.internal[0].blockNumber).to.be.equal("1959340");
			expect(transactions.internal[0].timeStamp).to.be.equal("1469590563");
			expect(transactions.internal[0].from).to.be.equal("0x1bb0ac60363e320bc45fdb15aed226fb59c88e44");
			expect(transactions.internal[0].to).to.be.equal("0xddbd2b932c763ba5b1b7ae3b362eac3e8d40121a");
			expect(transactions.internal[0].value).to.be.equal("7000000000000000000");
		});

		it('fetches ERC-20 token transfer transactions of an address correctly', async function() {
			this.timeout(60000);
			
			transactions.tokens = await explorer._getERC20TransfersForAddress(address);
			expect(transactions.tokens.length).to.be.greaterThanOrEqual(94);
			expect(transactions.tokens[0].blockNumber).to.be.equal("4247920");
			expect(transactions.tokens[0].timeStamp).to.be.equal("1504784559");
			expect(transactions.tokens[0].from).to.be.equal("0x281a867c7c3a7d8ddc2498b6584b12828ccd44cb");
			expect(transactions.tokens[0].to).to.be.equal("0xddbd2b932c763ba5b1b7ae3b362eac3e8d40121a");
			expect(transactions.tokens[0].value).to.be.equal("1000000000000000000");
			expect(transactions.tokens[0].tokenName).to.be.equal("Credo Token");
			expect(transactions.tokens[0].tokenSymbol).to.be.equal("CREDO");
			expect(transactions.tokens[0].tokenDecimal).to.be.equal("18");
			expect(transactions.tokens[0].contractAddress).to.be.equal("0x4e0603e2a27a30480e5e3a4fe548e29ef12f64be");
		});
		
		it('processes the fetched transactions correctly', async function() {
			// process the normal transactions
			explorer._processTransactions(transactions.normal.slice(0,2), address);

			expect(processor.transactions.length).to.be.equal(3);

			// Genesis deposit			
			expect(processor.transactions[0]).to.be.instanceof(Deposit);
			expect(processor.transactions[0].asset).to.be.equal("ETH");
			expect(processor.transactions[0].amount).to.be.equal(10000);
			expect(+processor.transactions[0].timestamp).to.be.equal(+DateTime.fromMillis(1438269973000));
			// there is no fee for deposits / especially the genesis block has not consumed any gas
			
			// first withdrawal
			expect(processor.transactions[1]).to.be.instanceof(Withdrawal);
			expect(processor.transactions[1].asset).to.be.equal("ETH");
			expect(processor.transactions[1].amount).to.be.equal(5);
			expect(+processor.transactions[1].timestamp).to.be.equal(+DateTime.fromMillis(1438947953000));
			
			// fee for first withdrawal
			expect(processor.transactions[2]).to.be.instanceof(Fee);
			expect(processor.transactions[2].asset).to.be.equal("ETH");
			expect(processor.transactions[2].amount).to.be.equal(0.0086448);
			expect(+processor.transactions[2].timestamp).to.be.equal(+DateTime.fromMillis(1438947953000));
			
			// clear the transactions and now process the internal transactions
			processor.transactions.length = 0;
			explorer._processTransactions(transactions.internal.slice(0,1), address);

			expect(processor.transactions.length).to.be.equal(1);

			expect(processor.transactions[0]).to.be.instanceof(Deposit);
			expect(processor.transactions[0].asset).to.be.equal("ETH");
			expect(processor.transactions[0].amount).to.be.equal(7);
			expect(+processor.transactions[0].timestamp).to.be.equal(+DateTime.fromMillis(1469590563000));


			// clear the transactions and now process the ERC-20 transactions
			processor.transactions.length = 0;
			explorer._processTransactions(transactions.tokens.slice(0,1), address);

			expect(processor.transactions.length).to.be.equal(1);

			expect(processor.transactions[0]).to.be.instanceof(Deposit);
			expect(processor.transactions[0].asset).to.be.equal("CREDO");
			expect(processor.transactions[0].amount).to.be.equal(1);
			expect(+processor.transactions[0].timestamp).to.be.equal(+DateTime.fromMillis(1504784559000));
		});

	});
});