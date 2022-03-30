import axios from "axios";
import { sleep } from "../../../lib.js";
import { Deposit } from "../../../Transactions/Types/Deposit.js";
import { Withdrawal } from "../../../Transactions/Types/Withdrawal.js";
import { Fee } from "../../../Transactions/Types/Fee.js";
import { DateTime } from "luxon";

function TokenSatoshisToFullAsset(sats, decimals) {
	if (typeof sats == "string") sats = parseInt(sats, 10);
	if (typeof decimals == "string") decimals = parseInt(decimals, 10);
	return sats / Math.pow(10, decimals);
}

function ETHSatoshisToFullAsset(sats) {
	return TokenSatoshisToFullAsset(sats, 18);
}

export class EtherscanCompatibleAPI {
	constructor(transactionProcessor, depot, apikey) {
		this.transactionProcessor = transactionProcessor;
		this.depot = depot;
		this.apikey = apikey;
		this.baseAsset = "ETH";
		this.baseURL = "https://api.etherscan.io/api"
	}

	/**
	 * Takes a value in satoshis / smallest unit of that token and converts to the base format using the given number of decimals.
	 */
	_adjustDecimals(sats, decimals=18) {
		if (typeof sats == "string") sats = parseInt(sats, 10);
		if (typeof decimals == "string") decimals = parseInt(decimals, 10);
		return sats / Math.pow(10, decimals);
	}

	/**
	 * Sends a raw request
	 */
	async _sendRawRequest(request) {
		let url = this.baseURL + "?" + request;
		if (this.apikey) {
			url += "&apikey=" + this.apikey;
			await sleep(600); // reduce speed to prevent activation of rate limit causing requests to fail
		} else {
			// without API key most of the etherscan compatible API have a rate limit of 1 call per 5 seconds
			await sleep(5000);
		}

		// send the request
		const response = await axios({ method: "get", url: url });
		// check the HTTP response code
		if (response.status == 200) {
			if ((typeof response.data == "object") && (typeof response.data["message"] == "string")) {
				if (response.data["message"].startsWith("OK") || (response.data["message"] == "No transactions found")) {
					return response.data["result"];
				} else {
					throw new Error("Request failed: " + response.data["message"]);
				}
			} else {
				throw new Error("Request failed with unknown error");
			}
		} else {
			throw new Error("Request failed with HTTP error " + response.status.toString());
		}
	}

	async _getTransactionsForAddress(address) {
		const transactions = await this._sendRawRequest("module=account&action=txlist&sort=asc&address=" + address);
		if (transactions instanceof Array) return transactions;
	}
	
	async _getInternalTransactionsForAddress(address) {
		const transactions = await this._sendRawRequest("module=account&action=txlistinternal&sort=asc&address=" + address);
		if (transactions instanceof Array) return transactions;
	}

	async _getERC20TransfersForAddress(address) {
		const transactions = await this._sendRawRequest("module=account&action=tokentx&sort=asc&address=" + address);
		if (transactions instanceof Array) return transactions;
	}
	
	async _getERC721TransfersForAddress(address) {
		const transactions = await this._sendRawRequest("module=account&action=tokennfttx&sort=asc&address=" + address);
		if (transactions instanceof Array) return transactions;
	}

	_processTransactions(transactions, address) {
		const depot = this.depot.getSubDepot(address);
		
		for (let transactionData of transactions) {
			
			let transaction = false;
			
			// check if this transaction was successfully executed
			// note that the isError property is only present in normal and internal transactions, not in token transfers
			if ("isError" in transactionData) {
				if (transactionData["isError"] != "0") continue;
			}
			
			// determine the amount / value of the transaction
			const value = this._adjustDecimals(transactionData["value"], transactionData["tokenDecimal"]);
			let asset = this.baseAsset;
			if ("tokenSymbol" in transactionData) asset = transactionData["tokenSymbol"];
			
			// a transaction can also be a withdrawal and a deposit at the same time (if the funds were sent to the same address)
			let withdrawalTransaction;
			let depositTransaction;
			
			if (transactionData["from"] == address) {
				withdrawalTransaction = new Withdrawal(depot, DateTime.fromMillis(transactionData["timeStamp"] * 1000), asset, value);
				if (value > 0) this.transactionProcessor.addTransaction(withdrawalTransaction);
			}
			if (transactionData["to"] == address) {
				depositTransaction = new Deposit(depot, DateTime.fromMillis(transactionData["timeStamp"] * 1000), asset, value);
				if (value > 0) this.transactionProcessor.addTransaction(depositTransaction);
			}
			
			// fee is usually only interesting for withdrawals because the deposit fee is usually paid by the sender
			if (withdrawalTransaction) {
				// now check if we have gas consumed by this transaction which should be taken into account as a fee transaction
				const feeAmount = this._adjustDecimals(parseInt(transactionData["gasUsed"], 10) * parseInt(transactionData["gasPrice"], 10));
				if (feeAmount > 0) this.transactionProcessor.addTransaction(new Fee(depot, DateTime.fromMillis(transactionData["timeStamp"] * 1000), this.baseAsset, feeAmount, transaction));
			}
		}
	}

	async loadTransactionsForAddress(address) {
		address = address.toLowerCase();
		
		const transactions = {
			normal: await this._getTransactionsForAddress(address),
			internal: await this._getInternalTransactionsForAddress(address),
			tokens: await this._getERC20TransfersForAddress(address)
		};
		
		this._processTransactions(transactions.normal.concat(transactions.internal).concat(transactions.tokens), address);
	}
}