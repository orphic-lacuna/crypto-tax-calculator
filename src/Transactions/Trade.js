import { Transaction } from "./Transaction.js";
import { Tranche } from "../Tranche.js";

export class Trade extends Transaction {
	
	constructor(timestamp, sellAsset, sellAmount, buyAsset, buyAmount, feeAsset, feeAmount) {
		super(timestamp);
		this.sellAsset = sellAsset;
		this.sellAmount = sellAmount;
		this.buyAsset = buyAsset;
		this.buyAmount = buyAmount;
		this.feeAsset = feeAsset;
		this.feeAmount = feeAmount;
		
		this.gainAsset = globalThis.config["baseCurrency"];
		this.gainAmount = 0;
		this.totalBaseCurrencyValueOfConsumedTranchesATMofCreation = 0;
	}
	
	async createAndConsumeTranches() {

		if ((globalThis.config["traceAsset"] == this.sellAsset) || (globalThis.config["traceAsset"] == this.buyAsset)) {
			Reports.Trace.add({
				timestamp: this.timestamp,
				text: this.toString()
			});
		}

		// all trades that only sold EUR, do not need to consume any tranches
		if (this.sellAsset != globalThis.config["baseCurrency"]) {

			await this._consumeTranches(this.sellAsset, Math.abs(this.sellAmount), this.timestamp, "Sell", async (tranche, amount, trancheConsumptionReportEntry) => {
	
				// just for error checking: the asset of the tranche must match the sell asset
				if (tranche.asset != this.sellAsset) throw new Exception("Tranche asset must match the trade's sell asset");
	
				// ignore all tranches that sold assets that were held longer than one year
				// TODO: at this point we must eventually check if the asset was staked and thus hold time has increased
				if (this.timestamp - tranche.creationTimestamp > 365*24*60*60*1000) return;
	
				// calculate gain for single tranche
				await this.calculateGain(tranche, amount, trancheConsumptionReportEntry);
	
				// this.totalBaseCurrencyValueOfConsumedTranchesATMofCreation += await CoinPrices.getBaseCurrencyValue(tranche.creationTimestamp, tranche.asset, amount);
			});

		}
		
		return [new Tranche(this.depot, this.timestamp, this.buyAsset, this.buyAmount, "Buy")];
	}
	
	toString() {
		return "Sell " + this.sellAmount.toString() + this.sellAsset + ", buy " + this.buyAmount.toString() + this.buyAsset + " on depot " + this.depot.getFullname();
	}
	
	async calculateGain(tranche, amount, trancheConsumptionReportEntry) {
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
	}
}