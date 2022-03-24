import { Transaction } from "./Transaction.js";

export class Withdrawal extends Transaction {
	
	static get type() {
		return "Withdrawal";
	}
	
	constructor(depot, timestamp, asset, amount) {
		super(depot, timestamp, asset, amount);
	}

	/**
	 * Internal function that processes the withdrawal transaction.
	 * A withdrawal transaction only consumes tranches of coins, it doesn't produce any.
	 * The processing result is the list of consumed tranches which is used if there is a linked deposit transaction to this withdrawal.
	 */
	_process() {
		const consumedTranches =  this.depot.consume(this.timestamp, this.asset, this.amount);
		return consumedTranches;
	}

	set depositTransaction(value) {
		this._depositTransaction = value; 
	}
	
	get depositTransaction() {
		return this._depositTransaction;
	}

	toString() {
		let result = super.toString();
		if (this.depositTransaction) {
			result += " belonging to transaction " + this.depositTransaction.id;
		}
		return result;
	}
}