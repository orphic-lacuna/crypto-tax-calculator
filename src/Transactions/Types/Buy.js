import { Transaction } from "./Transaction.js";

export class Buy extends Transaction {

	constructor(depot, timestamp, asset, amount, value) {
		super(depot, timestamp, asset, amount);
		if ((typeof value != "number") || (value < 0)) throw new Error("Invalid value for buy transaction");
		this.value = value;
	}

	_process() {
		// a buy transaction only produces coins, it doesn't consume any coins
		this.depot.addTranche(this.timestamp, this.asset, this.amount, this);
	}
	
	toString() {
		return "Buy " + super.toString();
	}	
}
