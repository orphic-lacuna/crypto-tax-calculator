import { Transaction } from "./Transaction.js";

export class Spending extends Transaction {
	
	/**
	 * Processes the transaction.
	 */
	process() {
		// spending only consumes coins of a depot
		for (let {amount, tranche} of this.depot.consume(this.timestamp, this.asset, this.amount)) {
			// TODO: Generate a spending report entry for each consumed tranche
			/*globalThis.Reports.Card.add({
				timestamp: this.timestamp,
				asset: this.asset,
				amount: this.amount,
				feeAsset: this.feeAsset,
				feeAmount: this.feeAmount,
				trancheConsumptionIDs: "\"" + trancheConsumptionIDs.join(", ") + "\""
			});*/
		}
	}
	
	toString() {
		return "Spending " + super.toString();
	}
}