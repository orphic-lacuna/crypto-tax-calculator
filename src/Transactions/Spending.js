import { Transaction } from "./Transaction.js";

export class Spending extends Transaction {
	
	constructor(timestamp, asset, amount, feeAsset="EUR", feeAmount=0) {
		super(timestamp);
		this.asset = asset;
		this.amount = Math.abs(amount);
		this.feeAsset = feeAsset;
		this.feeAmount = feeAmount;
	}
	
	async createAndConsumeTranches() {
		
		const trancheConsumptionIDs = [];
		
		await this._consumeTranches(this.asset, Math.abs(this.amount), this.timestamp, "Spending", (tranche, amount, trancheConsumptionReportEntry) => {
			trancheConsumptionIDs.push(trancheConsumptionReportEntry.id.toString());
		});

		globalThis.Reports.Card.add({
			timestamp: this.timestamp,
			asset: this.asset,
			amount: this.amount,
			feeAsset: this.feeAsset,
			feeAmount: this.feeAmount,
			trancheConsumptionIDs: "\"" + trancheConsumptionIDs.join(", ") + "\""
		});
	}
	
	toString() {
		return "Spending " + this.amount.toString() + this.asset;
	}

}