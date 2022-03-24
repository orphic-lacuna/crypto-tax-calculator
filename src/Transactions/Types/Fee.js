import { Transaction } from "./Transaction.js";

export class Fee extends Transaction {
	
	static get type() {
		return "Fee";
	}
	
	constructor(depot, timestamp, asset, amount, value, parentTransaction) {
		super(depot, timestamp, asset, amount);
		this.value = value;
		this.parentTransaction = parentTransaction;
	}
	
	_process(reports) {
		// if a fee transaction has no amount, the fee is paid only in base currency and doesn't consume any coin tranches
		if (!this.asset || (typeof this.amount != "number") || (this.amount == 0)) {
			reports.Fee.add(this.timestamp, undefined, undefined, this.value);
		} else {
			// otherwise the fee is paid using asset, so we must consume coins for that purpose
			this.depot.consume(this.timestamp, this.asset, this.amount);
			// for the fee it is not important which tranches are consumed, just report the fee as a whole
			reports.Fee.add(this.timestamp, this.asset, this.amount, this.value);
		}
	}
	
	toString() {
		let result = super.toString();
		if (this.parentTransaction) {
			result += " belonging to transaction " + this.parentTransaction.id;
		}
		return result;
	}	

}