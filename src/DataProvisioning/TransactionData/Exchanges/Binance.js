import { DateTime } from "luxon";
import { Deposit } from "../../../Transactions/Types/Deposit.js";
import { Withdrawal } from "../../../Transactions/Types/Withdrawal.js";
import { Fee } from "../../../Transactions/Types/Fee.js";
import { Buy } from "../../../Transactions/Types/Buy.js";
import { Sell } from "../../../Transactions/Types/Sell.js";
import { Interest } from "../../../Transactions/Types/Interest.js";
import { Spending } from "../../../Transactions/Types/Spending.js";

export class BinanceParser {
	constructor(transactionProcessor, targetDepot) {
		this.depot = targetDepot;
		this.transactionProcessor = transactionProcessor;
	}

	/**
	 * Parses binance transaction data in CSV format.
	 */
	parse(data) {
		// split the input string into lines and split every line into cells / columns at every unquoted comma
		data = data.split("\n").map(line => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
		
		// expect the first line to be the header with following columns:
		// User_ID,UTC_Time,Account,Operation,Coin,Change,Remark
		const header = data.shift();
		const hasUserID = header[0] == "User_ID";
		// if we have a user ID column, remove the first column and check the remaining ones
		if (hasUserID) header.shift();
		if ((header[0] == "UTC_Time") && (header[1] == "Account") && (header[2] == "Operation") && (header[3] == "Coin") && (header[4] == "Change") && (header[5] == "Remark")) {
			const columnCount = hasUserID ? 7 : 6;
			
			// pre-process all lines: filter lines which do not have the expected count of cells and create an object for each line
			data = data.filter(values => values.length == columnCount).map(values => {
				const result = {};
				if (hasUserID) {
					result.userID = values.shift();
				}
				
				result.timestamp = DateTime.fromFormat(values[0], "yyyy-MM-dd hh:mm:ss", {zone: "UTC"});
				result.wallet = values[1];
				result.type = values[2];
				result.asset = values[3];
				result.amount = parseFloat(values[4]);
				result.comment = values[5];
				return result;
			});
			
			this._process(data);
		} else {
			throw new Error("This is no valid binance transaction data input");
		}
	}
	
	/**
	 * Takes the pre-parsed data and generates transaction objects from it.
	 */
	_process(data) {
		
		const isFiatCurrency = asset => ["AED","ARS","AUD","AZN","BHD","BOB","BRL","CAD","CLP","CNY","COP","CZK","DZD","EGP","EUR","GBP","GEL","GHS","HKD","IDR","INR","JPY","KES","KZT","LBP","LKR","MAD","MXN","NGN","OMR","PAB","PEN","PHP","PKR","PLN","PYG","RUB","SAR","SDG","SEK","THB","TND","TRY","TWD","UAH","UGX","USD","UYU","UZS","VES","VND","ZAR","CHF","DKK","BGN","HRK","HUF","ISK","NZD","RON"].includes(asset);
		
		for (let line of data) {

			// everything that is not a fee and is denoted in fiat currency, skip it			
			if ((line.type != "Fee") && isFiatCurrency(line.asset)) continue;
		
			// binance has renamed BCHABC to BCH, so if we find an old BCHABC asset just replace it by BCH
			if (line.asset == "BCHABC") line.asset = "BCH";
		
			let transaction = false;
			switch (line.type) {
				case "Buy":					// there can be "negative buys", if e.g. operation is buying AXS with ETH, then we have two lines with "BUY": one with positive AXS and one line with negative ETH
				case "Sell":				// same for selling
				case "Transaction Related":	// this can be credit card purchase for example
				case "Small assets exchange BNB": // this is converting dust to BNB
				case "The Easiest Way to Trade": // this is swapping one asset for another
					if (line.amount < 0) {
						transaction = new Sell(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, Math.abs(line.amount));
					} else if (line.amount > 0) {
						transaction = new Buy(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, line.amount);
					}
					break;
				case "Fee":
					if (line.amount >= 0) throw new Error("Unexpected fee amount: positive or zero");
					transaction = new Fee(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, Math.abs(line.amount));
					break;
				case "Deposit":		// deposit of crypto currency
				case "transfer_in":	// moving funds between different depots on binance
					if (line.amount <= 0) throw new Error("Unexpected deposit amount: negative or zero");
					transaction = new Deposit(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, line.amount);
					break;
				case "Withdraw":		// withdrawal of crypto currency
				case "transfer_out":	// moving funds between different depots on binance
					if (line.amount >= 0) throw new Error("Unexpected withdrawal amount: positive or zero");
					transaction = new Withdrawal(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, Math.abs(line.amount));
					break;
				case "POS savings interest":
					if (line.amount <= 0) throw new Error("Unexpected interest amount: negative or zero");
					transaction = new Interest(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, line.amount, Interest.Source.Staking);
					break;
				case "Savings Interest":
					if (line.amount <= 0) throw new Error("Unexpected interest amount: negative or zero");
					transaction = new Interest(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, line.amount, Interest.Source.Lending);
					break;
				case "ETH 2.0 Staking Rewards":
					if (line.amount <= 0) throw new Error("Unexpected interest amount: negative or zero");
					if (line.asset != "BETH") throw new Error("Unexpected interest asset: ETH 2.0 rewards must be BETH");
					transaction = new Interest(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, line.amount, Interest.Source.Staking);
					break;
				case "Savings purchase":
					// TODO: Flag the coins as used for staking or lending
					break;
				case "POS savings purchase":
					break;
				case "Savings Principal redemption":
					break;
				case "POS savings redemption":
					break;
				case "Distribution":
					if (line.amount <= 0) throw new Error("Unexpected interest amount: negative or zero");
					transaction = new Interest(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, line.amount, Interest.Source.AirdropOrHardfork);
					break;
				case "Commission History":
					// interest from referral program
					if (line.amount <= 0) throw new Error("Unexpected interest amount: negative or zero");
					transaction = new Interest(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, line.amount, Interest.Source.Referral);
					break;
				case "Super BNB Mining":
					// interest from BNB Vault
					if (line.amount <= 0) throw new Error("Unexpected interest amount: negative or zero");
					transaction = new Interest(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, line.amount, Interest.Source.Lending);
					break;
				case "Binance Card Spending":
					if (line.amount >= 0) throw new Error("Unexpected spending amount: positive or zero");
					transaction = new Spending(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, Math.abs(line.amount));
					break;
				case "Card Cashback":
					// Cashback from Binance Card
					if (line.amount <= 0) throw new Error("Unexpected interest amount: negative or zero");
					transaction = new Interest(this.depot.getSubDepot(line.wallet), line.timestamp, line.asset, line.amount, Interest.Source.Cashback);
					break;
				default:
					console.log(line);
					throw new Error("Unexpected transaction type in binance transaction data");
			}
			
			if (transaction) this.transactionProcessor.addTransaction(transaction);
			
		}
	}
}		