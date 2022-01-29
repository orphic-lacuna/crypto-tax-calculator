import { Transaction } from "./Transaction.js";

export class Fee extends Transaction {
	
	constructor(depot, timestamp, asset, amount, parentTransaction) {
		super(depot, timestamp, asset, amount);
		this.parentTransaction = parentTransaction;
	}
	
	/**
	 * Processes the transaction.
	 */
	process() {
		// a fee transaction only consumes coins
		for (let {amount, tranche} of this.depot.consume(this.timestamp, this.asset, this.amount)) {
			// TODO: Generate a fee report entry
			// TODO: actually for the fee transaction the individual tranches are irrelevant
		}
	}
	
	toString() {
		let result = "Fee " + super.toString();
		if (this.parentTransaction) {
			result += " belonging to transaction " + this.parentTransaction.id;
		}
		return result;
	}	

}