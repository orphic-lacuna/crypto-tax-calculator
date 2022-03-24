import { expect } from "chai";
import { Depot } from "./Depot.js";
import { DateTime, Duration } from "luxon";
import { ConfigLoader } from "./ConfigLoader.js";

describe('Depot', function() {
	let depot;
	let now;
	
	beforeEach(function() {
		depot = new Depot("Main Depot");
		now = DateTime.now();
		// load the config
		globalThis.Config = new ConfigLoader();
	});

	it('must calculate the balance as the sum of unconsumed coins of all tranches', function() {
		let amounts = [1, 2, 3];
		let sum = 0;
		for (let amount of amounts) {
			depot.addTranche(now, "BTC", amount);
			sum += amount;
		}
		// extra check: a tranche lying in the future may not be included in the sum
		depot.addTranche(now.plus(Duration.fromObject({seconds: 300})), "BTC", 1);
		expect(depot.getBalance(now, "BTC")).to.equal(sum);
	});
	
	it('may not mix coins of different assets', function() {
		let amounts_btc = [1, 2, 3];
		let sum_btc = 0;
		for (let amount of amounts_btc) {
			depot.addTranche(now, "BTC", amount);
			sum_btc += amount;
		}
		
		let amounts_eth = [34, 5, 2];
		let sum_eth = 0;
		for (let amount of amounts_eth) {
			depot.addTranche(now, "ETH", amount);
			sum_eth += amount;
		}
		expect(depot.getBalance(now, "BTC")).to.equal(sum_btc);
		expect(depot.getBalance(now, "ETH")).to.equal(sum_eth);
	});
	
	describe('must find the tranche that must be consumed next', function() {
		it('if no tranches are consumed yet', function() {
			// add "new" tranche
			const youngTranche = depot.addTranche(now, "BTC", 2);
			// add a tranche that is 1h old
			const oldTranche = depot.addTranche(now.minus(Duration.fromObject({seconds: 3600})), "BTC", 1);
			// add a tranche that is 30min old
			const middleTranche = depot.addTranche(now.minus(Duration.fromObject({seconds: 1800})), "BTC", 0.5);
			
			expect(depot._getNextTranche("BTC", now)).to.equal(oldTranche);
		});
		
		it('if tranches are partially consumed', function() {
			// add a tranche that is 30min old
			const middleTranche = depot.addTranche(now.minus(Duration.fromObject({seconds: 1800})), "BTC", 0.5);
			middleTranche.consume(0.25);
			// add "new" tranche
			const youngTranche = depot.addTranche(now, "BTC", 2);
			// add a tranche that is 1h old
			const oldTranche = depot.addTranche(now.minus(Duration.fromObject({seconds: 3600})), "BTC", 1);
			oldTranche.consume(1);
			
			expect(depot._getNextTranche("BTC", now)).to.equal(middleTranche);
		});
		
		it('if there are only unconsumed tranches with a creation timestamp lying in the future', function() {
			// add a tranche that is 10min old
			const middleTranch = depot.addTranche(now.minus(Duration.fromObject({seconds: 600})), "BTC", 1);
			middleTranch.consume(1);
			// add a tranche that will be created in 30min
			const futureTranche = depot.addTranche(now.plus(Duration.fromObject({seconds: 600})), "BTC", 0.5);
			// add 1h old tranche
			const oldTranche = depot.addTranche(now.minus(Duration.fromObject({seconds: 3600})), "BTC", 1);
			oldTranche.consume(1);
			
			expect(depot._getNextTranche("BTC", now)).to.be.undefined;
		});
	});
	
	describe('can consume their tranches', function() {
		it('but only those not lying in the future', function() {
			// add a tranche that is 10min old
			const middleTranch = depot.addTranche(now.minus(Duration.fromObject({seconds: 600})), "BTC", 2);
			// add a tranche that will be created in 30min
			const futureTranche = depot.addTranche(now.plus(Duration.fromObject({seconds: 600})), "BTC", 3);
			// add 1h old tranche
			const oldTranche = depot.addTranche(now.minus(Duration.fromObject({seconds: 3600})), "BTC", 1);

			// now are 3 BTC available, and in 30 min 6 BTC will be available
			// consume function will not fail, because it creates missing tranches
			depot.consume(now, "BTC", 10).forEach(({amount, tranche}, index) => {
				switch (index) {
					case 0:
						expect(amount).to.equal(1);
						expect(tranche).to.equal(oldTranche);
						break;
					case 1:
						expect(amount).to.equal(2);
						expect(tranche).to.equal(middleTranch);
						break;
					case 2:
						expect(amount).to.equal(7);
						break;
					default:
						should.fail("not more than 3 tranches should be consumed");
						break;
				}
			});
			// but the future tranche may not be consumed in any way
			expect(middleTranch.amountLeft).to.equal(0);
			expect(oldTranche.amountLeft).to.equal(0);
			expect(futureTranche.amountLeft).to.equal(futureTranche.amount);
		});
	});
});
