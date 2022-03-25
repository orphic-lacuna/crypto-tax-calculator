import { Transaction } from "./Transaction.js";

export class Sell extends Transaction {
	
	static get type() {
		return "Sell";
	}
	
	/**
	 * Creates a new sell transaction.
	 * @param	depot		Depot of which to take the coins that have been sold.
	 * @param	timestamp	Luxon DateTime object determining when the coins were sold.
	 * @param	asset		Determines which coins were sold.
	 * @param	amount		The number of coins that have been sold.
	 * @param	value		The value of the sold coins expressed in base currency (e.g. EURO) at the moment of selling.
	 */
	constructor(depot, timestamp, asset, amount, value) {
		super(depot, timestamp, asset, amount);
		// if ((typeof value != "number") || (value < 0)) throw new Error("Invalid value for sell transaction");
		this.value = value;
	}
	
	_process(reports) {
		// selling only consumes coins of a depot
		for (let {amount, tranche} of this.depot.consume(this.timestamp, this.asset, this.amount)) {
			// the asset of the tranche must match the asset of the transaction
			if (tranche.asset != this.asset) throw new Error("Error processing sell transaction: tranch asset differs from transaction asset");
	
			let value;
			// if we have a value for this sell
			if (typeof this.value == "number") {
				// calculate the partial value that belongs to this tranche
				value = this.value * amount / this.amount;
			}
	
			// create the report entry
			reports.Gain.add(this.timestamp, tranche, amount, value);
		}
	}
}