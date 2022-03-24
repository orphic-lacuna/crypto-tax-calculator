import { Transaction } from "./Transaction.js";

export class Spending extends Transaction {

	static get type() {
		return "Spending";
	}
	
	_process(reports) {
		// spending only consumes coins of a depot
		for (let {amount, tranche} of this.depot.consume(this.timestamp, this.asset, this.amount)) {
			// generate a spending report entry for each consumed tranche
			reports.Spending.add(this.timestamp, this.asset, amount);
		}
	}
}