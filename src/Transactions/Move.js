import { Transaction } from "./Transaction.js";
import { Tranche } from "../Tranche.js";

export class Move extends Transaction {
	
	constructor(timestamp, asset, amount, feeAsset, feeAmount) {
		super(timestamp);
		this.asset = asset;
		this.amount = amount;
		this.feeAsset = feeAsset;
		this.feeAmount = feeAmount;
	}
	
	async createAndConsumeTranches() {

		if (globalThis.config["traceAsset"] == this.asset) {
			Reports.Trace.add({
				timestamp: this.timestamp,
				text: this.toString()
			});
		}		
		
		if (this.amount > 0) {
			// this move is a deposit to this depot

			if (this.linkedTransaction) {
				
				/*
				if (this.linkedTransaction.asset != this.asset) throw "Linked transaction has different asset";
				console.log("\nMOVE:");
				console.log(this.toString());
				console.log(this.linkedTransaction.toString());
				console.log("\n");
				if (Math.abs(Math.abs(this.linkedTransaction.amount) - Math.abs(this.amount)) > 0.05 * this.amount) throw "Linked transaction differs more than 5% in amount";
				return [new Tranche(this.depot, this.linkedTransaction.timestamp, this.asset, this.amount, "Deposit to " + this.depot.getFullname() + " from " + this.linkedTransaction.depot.getFullname())];
				*/
				
			} else {
				// if we do not have a linked transaction, we must assume that the coins are not older than the timestamp of this deposit
				// for reducing taxes it would be better to know the exact buy timestamp
				if (this.asset != globalThis.config["baseCurrency"]) {
					console.warn("Deposit without linked transaction, assuming age of the coin tranche equals timestamp of deposit for following transaction:");
					console.warn("\t" + this.toString());
				}
				return [new Tranche(this.depot, this.timestamp, this.asset, this.amount, "Deposit to " + this.depot.getFullname() + " from unknown source")];
			}
			
		} else {
			// this move is a withdrawal
	
			let result = [];

			let transactionInfo = "Withdrawal from " + this.depot.getFullname();
			if (this.linkedTransaction) {
				transactionInfo += " (to " + this.linkedTransaction.depot.getFullname() + ")";
			}
				
			// this move is a withdrawal and needs to consume a tranch
			await this._consumeTranches(this.asset, Math.abs(this.amount), this.timestamp, transactionInfo, (tranche, amount) => {
				if (tranche.asset != this.asset) throw new Error("Tranche and withdrawal asset do not match");
				
				// check if we have a linked deposit transaction
				if (this.linkedTransaction) {
					// if so, generate a new tranche in the target depot with same creation timestamp as the consumed tranche because coins have not been touched (sold)
					// for each tranche of this withdrawal
					result.push(new Tranche(this.linkedTransaction.depot, tranche.creationTimestamp, tranche.asset, amount, "Deposit to " + this.linkedTransaction.depot.getFullname() + " (from " + this.depot.getFullname() + ")"));
				} else {
					// do not warn on EURO withdrawals
					if (this.asset != globalThis.config["baseCurrency"]) {
						console.warn("Cannot track coins: Withdrawal of", this.amount, this.asset, "without linked transaction from ", this.depot.getFullname(), "at", new Date(this.timestamp));
					}
				}
			});
			
			return result;
		}
	}
	
	toString() {
		if (this.amount > 0) {
			return "Deposit " + this.amount.toString() + this.asset + " to " + this.depot.getFullname() + " " + new Date(this.timestamp).toLocaleString();
		} else {
			return "Withdraw" + this.amount.toString() + this.asset + " from " + this.depot.getFullname() + " " + new Date(this.timestamp).toLocaleString();
		}
	}
}