import { DateTime } from "luxon";
import { Deposit } from "../../../Transactions/Types/Deposit.js";
import { Withdrawal } from "../../../Transactions/Types/Withdrawal.js";
import { Fee } from "../../../Transactions/Types/Fee.js";
import { Buy } from "../../../Transactions/Types/Buy.js";
import { Sell } from "../../../Transactions/Types/Sell.js";

export class BitstampParser {
	constructor(transactionProcessor, targetDepot) {
		this.depot = targetDepot;
		this.transactionProcessor = transactionProcessor;
	}

	/**
	 * Parses bitstamp transaction data in CSV format.
	 */
	parse(data) {
		// split the input string into lines and split every line into cells / columns at every unquoted comma
		data = data.split("\n").map(line => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
		
		// expect the first line to be the header with following columns:
		// Type,Datetime,Account,Amount,Value,Rate,Fee,Sub Type
		const header = data.shift();
		if ((header[0] == "Type") && (header[1] == "Datetime") && (header[2] == "Account") && (header[3] == "Amount") && (header[4] == "Value") && (header[5] == "Rate") && (header[6] == "Fee") && (header[7] == "Sub Type")) {
			// pre-process all lines: filter lines which do not have eight cells and create an object for each line
			data = data.filter(values => values.length == 8).map(values => {
				
				function parseAmountAndAsset(value) {
					const splittedValue = value.split(" ");
					if (splittedValue.length == 2) {
						const amount = parseFloat(splittedValue[0]);
						const asset = splittedValue[1];
						if ((typeof amount == "number") && !isNaN(amount)) {
							return {
								asset: asset,
								amount: amount
							};
						}
					}
				}
				
				const result = {
					type: values[0],
					// parse the date time, removing quotation marks
					timestamp: DateTime.fromFormat(values[1].slice(1, -1), "LLL. dd, yyyy, hh:mm a", {zone: "UTC"}),
					wallet: values[2],
					cryptoValue: parseAmountAndAsset(values[3]), // the primary value is the amount + currency which has been bought / sold
					fiatValue: parseAmountAndAsset(values[4]),
					rate: parseAmountAndAsset(values[5]),
					fee: parseAmountAndAsset(values[6]),
					subType: values[7]
				};
				
				return result;
			});
			
			this._process(data);
		} else {
			throw new Error("This is no valid bitstamp transaction data input");
		}
	}

	/**
	 * Takes the pre-parsed data and generates transaction objects from it.
	 */
	_process(data) {
		
		const isFiatCurrency = asset => ["EUR", "USD", "GBP"].includes(asset);
		
		for (let line of data) {
			// get the main transaction
			let transaction;
			switch(line.type) {
				case "Deposit":
					if (!isFiatCurrency(line.cryptoValue.asset)) transaction = new Deposit(this.depot.getSubDepot(line.wallet), line.timestamp, line.cryptoValue.asset, line.cryptoValue.amount);
					break;
				case "Withdrawal":
					if (!isFiatCurrency(line.cryptoValue.asset)) transaction = new Withdrawal(this.depot.getSubDepot(line.wallet), line.timestamp, line.cryptoValue.asset, line.cryptoValue.amount);
					break;
				case "Market":
					if (line.subType == "Buy") {
						transaction = new Buy(this.depot.getSubDepot(line.wallet), line.timestamp, line.cryptoValue.asset, line.cryptoValue.amount, line.fiatValue ? line.fiatValue.amount : undefined);
					} else if (line.subType == "Sell") {
						transaction = new Sell(this.depot.getSubDepot(line.wallet), line.timestamp, line.cryptoValue.asset, line.cryptoValue.amount, line.fiatValue ? line.fiatValue.amount : undefined);
					}
					break;
				case "Crypto currency purchase":
					// this type is simply an EURO deposit, this does not interest us (except for the fees)
					break;
				default:
					transaction = false; 
					break;
			}
			
			// if there is a main transaction from this line, add it to the transaction processor
			if (transaction) {
				this.transactionProcessor.addTransaction(transaction);
			}
			
			// check if the processed line has caused some fees
			if (line.fee) {
				let feeTransaction;
				
				// check if the fee is in FIAT currency
				if (isFiatCurrency(line.fee.asset)) {
					feeTransaction = new Fee(this.depot.getSubDepot(line.wallet), line.timestamp, undefined, undefined, line.fee.amount);
				} else {
					// fee is in crypto currency
					feeTransaction = new Fee(this.depot.getSubDepot(line.wallet), line.timestamp, line.fee.asset, line.fee.amount);
				}
				
				this.transactionProcessor.addTransaction(feeTransaction);
			}
		}
	}
}