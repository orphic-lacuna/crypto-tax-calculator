/**
 * Base class for all transactions. Each transaction has a timestamp and depot to which it belongs.
 */
export class Transaction {
	
	static _idCounter = 0;
	
	constructor(depot, timestamp, asset, amount) {
		if (!depot) throw new Error("cannot create transaction without depot");
		if (typeof timestamp != "number") throw new Error("cannot create transaction without timestamp");
		if (typeof asset != "string") throw new Error("cannot create transaction without specifying asset");
		this.depot = depot;
		this.timestamp = timestamp;
		this.asset = asset;
		if ((typeof amount != "number") || (amount <= 0)) throw new Error("cannot create interest transaction without or with negative amount");
		this.amount = amount;
		
		// unique id for the transction
		this.id = Transaction._idCounter;
		Transaction._idCounter += 1;
	}
	
	toString() {
		return "transaction on depot " + depot.getFullname() + ": " + this.amount.toString() + " " + this.asset + " at " + new Date(this.timestamp*1000).toLocaleString();
	}
}

export { Tranche } from "../../Tranche.js";