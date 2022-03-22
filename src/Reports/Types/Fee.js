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
		this.value = value;
		// this constructor can be 
		if (typeof asset == "string") {
			this.asset = asset;
			this.amount = amount;
			if (!(this.amount > 0)) throw new Error("Fee report entry using an asset must have an amount greater than zero");
		}
		if (!(this.value > 0)) throw new Error("Fee report entry has invalid value");
	}
	
	/**
	 * Processes the report entry. If the value of the paid fee is not yet known and the fee was paid not in fiat currency,
	 * then the value is calculated using the exchange rate of the asset at this time. 
	 */
	async process() {
		if (typeof this.value != "number") {
			if (!this.asset || !this.amount) throw new Error("If fee report entry has no value it must have asset and amount");
			this.value = await ExchangeRates.getValue(this.timestamp, this.asset, this.amount);
		}
	}
	
	async toString() {
		return [
			this.timestamp.toLocaleString(),
			((this.amount > 0) ? this.amount : ""),
			(this.asset ? this.asset : ""),
			this.value
		].join(";");
	}
}