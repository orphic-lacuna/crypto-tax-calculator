import { Transaction } from "./Transaction.js";
import { Tranche } from "../Tranche.js";

export class Interest extends Transaction {
	
	constructor(timestamp, asset, amount, type) {
		super(timestamp);
		this.asset = asset;
		this.amount = amount;
		if (!Object.values(InterestType).includes(type)) throw new Error("Invalid Interest Transaction Type: " + type);
		this.type = type;
	}
	
	createAndConsumeTranches() {

		// an Interest transaction only produces coins, it doesn't consume any coins
		if (this.amount > 0) {
			// tax relevant are only the following types of interest:
			if ([InterestType.Staking, InterestType.Lending, InterestType.Mining, InterestType.Referral].includes(this.type)) {
				globalThis.Reports.Interest.add({
					timestamp: this.timestamp,
					asset: this.asset,
					amount: this.amount,
					type: this.type
				});
			}
			return [new Tranche(this.depot, this.timestamp, this.asset, this.amount, "Interest")];
		}
	}
	
	toString() {
		return "Interest of type " + this.type + ": " + this.amount.toString() + this.asset;
	}	
}

export let InterestType = {
	Cashback: "Cashback",
	Staking: "Staking",
	Lending: "Lending",
	Mining: "Mining",
	AirdropOrHardfork: "AirdropOrHardfork",
	Referral: "Referral"
};