import { ReportEntry } from "../ReportEntry.js";

export class Spending extends ReportEntry {
	static getHeadline() {
		return "Time;Amount;Asset;Value in " + Config.BaseCurrency;
	}

	constructor(timestamp, asset, amount, value) {
		super(timestamp);
		this.asset = asset;
		this.amount = amount;
		this.value = value;
	}

	/**
	 * Processes the report entry. If the value of the spent coins is not yet known the
	 * value is calculated using the exchange rate of the asset at this time. 
	 */
	async process() {
		if (typeof this.value != "number") {
			tihs.value = await CoinPrices.getBaseCurrencyValue(this.timestamp, this.asset, this.amount);
		}
	}
	
	toString() {
		return [
			this.timestamp.toLocaleString(),
			this.amount,
			this.asset,
			this.value
		].join(";");
	}
}