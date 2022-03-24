import { Transaction } from "./Transaction.js";

export class Buy extends Transaction {
	
	static get type() {
		return "Buy";
	}

	/**
	 * @param	depot		Depot into which the bought coins are placed.
	 * @param	timestamp	Luxon DateTime object determining when the coins were bought.
	 * @param	asset		Determines which coins were bought.
	 * @param	amount		The number of coins that have been bought.
	 * @param	value		The value of the bought coins expressed in base currency (e.g. EURO) at the moment of buying
	 */
	constructor(depot, timestamp, asset, amount, value) {
		super(depot, timestamp, asset, amount);
		if ((typeof value != "number") || (value < 0)) throw new Error("Invalid value for buy transaction");
		this.value = value;
	}

	_process() {
		// a buy transaction only produces coins, it doesn't consume any coins
		this.depot.addTranche(this.timestamp, this.asset, this.amount, this);
	}
}
