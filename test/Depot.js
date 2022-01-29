import { expect } from "chai";
import { Depot } from "../src/Depot.js";
import { Tranche } from "../src/Tranche.js";

describe('Depot', function() {
	let depot;
	let now;
	
	beforeEach(function() {
		depot = new Depot("Main Depot");
		now = new Date().getTime() / 1000;
	});

	function createTranche(amount, timestamp=0, asset="BTC") {
		if (timestamp == 0) timestamp = now;
		return new Tranche(depot, timestamp, asset, amount);
	}

	it('must calculate the balance as the sum of unconsumed coins of all tranches', function() {
		let amounts = [1, 2, 3];
		let sum = 0;
		for (let amount of amounts) {
			depot.addTranche(createTranche(amount));
			sum += amount;
		}
		// extra check: a tranche lying in the future may not be included in the sum
		depot.addTranche(createTranche(1, now + 300));
		expect(depot.getBalance("BTC")).to.equal(sum);
	});
	
	it('may not mix coins of different assets', function() {
		let amounts_btc = [1, 2, 3];
		let sum_btc = 0;
		for (let amount of amounts_btc) {
			depot.addTranche(createTranche(amount, 0, "BTC"));
			sum_btc += amount;
		}
		
		let amounts_eth = [34, 5, 2];
		let sum_eth = 0;
		for (let amount of amounts_eth) {
			depot.addTranche(createTranche(amount, 0, "ETH"));
			sum_eth += amount;
		}
		expect(depot.getBalance("BTC")).to.equal(sum_btc);
		expect(depot.getBalance("ETH")).to.equal(sum_eth);
	});
	
	describe('must find the tranche that must be consumed next', function() {
		it('if no tranches are consumed yet', function() {
			// add "new" tranche
			const youngTranche = createTranche(2);
			depot.addTranche(youngTranche);
			// add a tranche that is 1h old
			const oldTranche = createTranche(1, now - 3600, "BTC");
			depot.addTranche(oldTranche);
			// add a tranche that is 30min old
			const middleTranche = createTranche(0.5, now - 1800, "BTC");
			depot.addTranche(middleTranche);
			
			expect(depot._getNextTranche("BTC", now)).to.equal(oldTranche);
		});
		
		it('if tranches are partially consumed', function() {
			// add a tranche that is 30min old
			const middleTranche = createTranche(0.5, now - 1800, "BTC");
			depot.addTranche(middleTranche);
			middleTranche.consume(0.25);
			// add "new" tranche
			const youngTranche = createTranche(2);
			depot.addTranche(youngTranche);
			// add a tranche that is 1h old
			const oldTranche = createTranche(1, now - 3600, "BTC");
			depot.addTranche(oldTranche);
			oldTranche.consume(1);
			
			expect(depot._getNextTranche("BTC", now)).to.equal(middleTranche);
		});
		
		it('if there are only unconsumed tranches with a creation timestamp lying in the future', function() {
			// add a tranche that is 10min old
			const middleTranch = createTranche(1, now - 600, "BTC");
			depot.addTranche(middleTranch);
			middleTranch.consume(1);
			// add a tranche that will be created in 30min
			const futureTranche = createTranche(0.5, now + 1800, "BTC");
			depot.addTranche(futureTranche);
			// add 1h old tranche
			const oldTranche = createTranche(1, now - 3600, "BTC");
			depot.addTranche(oldTranche);
			oldTranche.consume(1);
			
			expect(depot._getNextTranche("BTC", now)).to.be.undefined;
		});
	});
	
	describe('can consume their tranches', function() {
		it('but only those not lying in the future', function() {
			// add a tranche that is 10min old
			const middleTranch = createTranche(2, now - 600, "BTC");
			depot.addTranche(middleTranch);
			// add a tranche that will be created in 30min
			const futureTranche = createTranche(3, now + 1800, "BTC");
			depot.addTranche(futureTranche);
			// add 1h old tranche
			const oldTranche = createTranche(1, now - 3600, "BTC");
			depot.addTranche(oldTranche);

			// now are 3 BTC available, and in 30 min 6 BTC will be available
			// consume function will not fail, because it creates missing tranches
			expect(depot.consume("BTC", 10, now)).to.equal(10);
			// but the future tranche may not be consumed in any way
			expect(middleTranch.amountLeft).to.equal(0);
			expect(oldTranche.amountLeft).to.equal(0);
			expect(futureTranche.amountLeft).to.equal(futureTranche.amount);
		});
	});
});
