import { Transaction, Tranche } from "./Transaction.js";

export class Buy extends Transaction {
	
	/**
	 * Processes the transaction.
	 */
	process() {
		// a buy transaction only produces coins, it doesn't consume any coins
		this.depot.addTranche(this.timestamp, this.asset, this.amount, Tranche.Source.Buy);
	}
	
	toString() {
		return "Buy " + super.toString();
	}	
}
