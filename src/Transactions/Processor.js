import { Reports } from "../Reports/Reports.js";
import { Withdrawal } from "./Types/Withdrawal.js";
import { Deposit } from "./Types/Deposit.js";
import { Duration } from "luxon";

/**
 * The transaction processor is the core class that manages processing of all transactions. It keeps track
 * of all transactions.
 */
export class TransactionProcessor {
	constructor() {
		this.transactions = [];
	}
	
	addTransaction(transaction) {
		if (this.transactions.includes(transaction)) throw new Error("transaction already known by transaction processor");
		this.transactions.push(transaction);
		return transaction;
	}
	
	_sortTransactions() {
		this.transactions.sort((a, b) => {
			// check if the timestamps are equal
			if (a.timestamp == b.timestamp) {
				// if so use the id for comparison
				return a.id - b.id;
			}
			// otherwise we must use the timestamp
			return a.timestamp - b.timestamp;
		});
	}
	
	_linkTransactions() {
		const withdrawals = this.transactions.filter(t => t instanceof Withdrawal);
		const deposits = this.transactions.filter(t => t instanceof Deposit);

		for (let deposit of deposits ) {
			
			// find a matching withdrawal
			const matchingWithdrawal = withdrawals.find(withdrawal => {
				// distinct depot?
				if (withdrawal.depot != deposit.depot) {
					// same asset?
					if (withdrawal.asset == deposit.asset) {
						// compare the amounts and timestamps
						const amountDifference = withdrawal.amount - deposit.amount;
						const timeDifference = Math.abs(withdrawal.timestamp - deposit.timestamp);
						// usually the withdrawal should have the same or greater amount than the deposit (due to fee)
						// and should not differ more than the specified threshold
						if ((amountDifference >= 0) && (amountDifference / withdrawal.amount < globalThis.Config.DepositWithdrawalLinking.MaxAmountDeviationRatio)) {
							// timestamp may not deviate more than specified time
							if (timeDifference < globalThis.Config.DepositWithdrawalLinking.MaxTimeDeviation) {
								// this is a match
								return true;
							}
						}
					}
				}
				return false;
			});

			if (matchingWithdrawal) {
				deposit.withdrawalTransaction = matchingWithdrawal;
				matchingWithdrawal.depositTransaction = deposit;
			}
		}
	}
		
	/**
	 * Processes all transactions.
	 */
	process() {
		// first step: order the transactions by timestamp and id
		this._sortTransactions();

		// second step: link transactions belonging together (deposits and withdrawals)
		this._linkTransactions();

		const reports = new Reports();
		
		// second step: call the process function on each transaction
		this.transactions.forEach(t => t.process(reports));
		
		return reports;
	}
}