import { Transaction } from "./Transaction.js";

export class Interest extends Transaction {
	
	static get type() {
		return "Interest";
	}
	
	static Source = Object.freeze({
		Cashback: Symbol("Cashback"),
		Staking: Symbol("Staking"),
		Lending: Symbol("Lending"),
		Mining: Symbol("Mining"),
		AirdropOrHardfork: Symbol("AirdropOrHardfork"),
		Referral: Symbol("Referral")
	});
	
	constructor(depot, timestamp, asset, amount, source) {
		super(depot, timestamp, asset, amount);
		if (!Object.values(Interest.Source).includes(source)) throw new Error("invalid interest transaction type");
		this.source = source;
	}
	
	_process(reports) {
		reports.Interest.add(this.timestamp, this.asset, this.amount, this.source);

		// an Interest transaction only produces coins, it doesn't consume any coins
		this.depot.addTranche(this.timestamp, this.asset, this.amount, this);
	}
}
