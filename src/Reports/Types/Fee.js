import { ReportEntry } from "../ReportEntry.js";

export class Fee extends ReportEntry {
	static getHeadline() {
		return "Time;Amount;Asset;Value in " + Config.BaseCurrency + ";";
	}
	
	/**
	 * The fee report entry constructor can be called in two ways:
	 * 		1. timestamp, value - use this signature if the fee was paid in base currency and didn't consume any coins
	 *		2. timestamp, asset, amount, value - use this signature if the fee was paid using asset
	 */
	constructor(timestamp, asset, amount, value) {
		super(timestamp);
		// this constructor can be 
		if (typeof asset == "string") {
			this.asset = asset;
			this.amount = amount;
			if (!(this.amount > 0)) throw new Error("Fee report entry using an asset must have an amount greater than zero");
			this.value = value;
		} else if (typeof asset == "number") {
			this.value = asset;
		} else {
			throw new Error("Invalid parameters for fee report entry constructor");
		}
		if (!(this.value > 0)) throw new Error("Fee report entry has invalid value");
	}
	
	/**
	 * Processes the report entry. If the value of the received interest in not yet known, resolve the value looking up the asset exchange rate at timestamp. 
	 */
	async process() {
		if (typeof this.value != "number") {
			tihs.value = await CoinPrices.getBaseCurrencyValue(this.timestamp, this.asset, this.amount);
		}
	}
	
	async toString() {
		return [
			new Date(this.timestamp).toLocaleString(),
			((this.amount > 0) ? this.amount : ""),
			(this.asset ? this.asset : ""),
			this.value
		].join(";");
	}
}