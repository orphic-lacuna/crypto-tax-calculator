import { Transaction } from "./Transaction.js";
import { Tranche } from "../../Tranche.js";

export class Sell extends Transaction {
	
	_process() {
		// selling only consumes coins of a depot
		for (let {amount, tranche} of this.depot.consume(this.timestamp, this.asset, this.amount)) {
			// the asset of the tranche must match the asset of the transaction
			if (tranche.asset != this.asset) throw new Error("Error processing sell transaction: tranch asset differs from transaction asset");
	
			// ignore all tranches that sold assets that were held longer than one year
			// TODO: at this point we must eventually check if the asset was staked and thus hold time has increased
			if (this.timestamp - tranche.creationTimestamp > 365*24*60*60*1000) return;

			// calculate gain for single tranche
			this.calculateGain(amount, tranche);

			// TODO: Generate a spending report entry for each consumed tranche
			/*globalThis.Reports.Card.add({
				timestamp: this.timestamp,
				asset: this.asset,
				amount: this.amount,
				feeAsset: this.feeAsset,
				feeAmount: this.feeAmount,
				trancheConsumptionIDs: "\"" + trancheConsumptionIDs.join(", ") + "\""
			});*/
		}
	}
	
	toString() {
		return "Sell " + super.toString();
	}

	async calculateGain(amount, tranche) {
		/*
		// within one year, tax relevant
		let soldValueBefore = await CoinPrices.getBaseCurrencyValue(tranche.creationTimestamp, tranche.asset, amount);
		let soldValueNow = await CoinPrices.getBaseCurrencyValue(this.timestamp, tranche.asset, amount);
		
		//let daysBetween = (this.timestamp - tranche.creationTimestamp) / 1000 / 3600 / 24;
		//console.log("Days between:", daysBetween, soldValueBefore, soldValueNow);
		
		let feeValue = 0;
		if (Math.abs(this.feeAmount) > 0) {
			feeValue = await CoinPrices.getBaseCurrencyValue(this.timestamp, this.feeAsset, Math.abs(this.feeAmount));
		}
		//console.log("\tFee:", this.feeAmount, this.feeAsset, "is", feeValue, globalThis.config["baseCurrency"]);
		//console.log("\tboughtValue:", this.totalBaseCurrencyValueOfConsumedTranchesATMofCreation, globalThis.config["baseCurrency"]);
		 
		let gainAmount = soldValueNow - soldValueBefore - feeValue;
		Reports.Gain.add({
			buyTimestamp: tranche.creationTimestamp,
			sellTimestamp: this.timestamp,
			asset: tranche.asset,
			amount: amount,
			gain: gainAmount,
			trancheConsumptionID: "\"" + trancheConsumptionReportEntry.id.toString() + "\""
		});

		// console.log("\tGain:", gainAmount, "EUR");
		*/
	}
}