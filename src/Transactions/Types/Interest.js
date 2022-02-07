import { Transaction } from "./Transaction.js";

export class Interest extends Transaction {
	
	static Type = Object.freeze({
		Cashback: Symbol("Cashback"),
		Staking: Symbol("Staking"),
		Lending: Symbol("Lending"),
		Mining: Symbol("Mining"),
		AirdropOrHardfork: Symbol("AirdropOrHardfork"),
		Referral: Symbol("Referral")
	});
	
	constructor(depot, timestamp, asset, amount, type) {
		super(depot, timestamp, asset, amount);
		if (!Object.values(Interest.Type).includes(type)) throw new Error("invalid interest transaction type");
		this.type = type;
	}
	
	_process(reports) {
		// an Interest transaction only produces coins, it doesn't consume any coins
		// tax relevant are only the following types of interest:
		if ([Interest.Type.Staking, Interest.Type.Lending, Interest.Type.Mining, Interest.Type.Referral].includes(this.type)) {
			reports.Interest.add(this.timestamp, this.asset, this.amount, this.type);
		}
		this.depot.addTranche(this.timestamp, this.asset, this.amount, this);
	}
	
	toString() {
		return "Interest " + super.toString();
	}	
}
